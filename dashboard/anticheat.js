// Global PESADILLA PVP anticheat history shared by all Roblox servers.
// Only server-side requests authenticated with ROBLOX_INGEST_SECRET can call these APIs.
export const ROBLOX_UID = /^[1-9]\d{0,19}$/;
const SERVER_ID = /^[A-Za-z0-9:_-]{1,128}$/;
const DETECTION_KIND = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;
const PAGE_SIZE = 50;
const MAX_ENTRIES = 50;
const MAX_BODY_BYTES = 64 * 1024;
const HEADERS = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

function respond(payload,status=200){
  return Response.json(payload,{status,headers:HEADERS});
}
function positivePage(input){
  if(input===null)return 1;
  if(!/^[1-9]\d{0,4}$/.test(input))return null;
  const n=Number(input);
  return n<=10000?n:null;
}
function detailString(value){
  if(value===null||value===undefined)return '';
  if(typeof value==='string')return value;
  if(value && typeof value==='object' && !Array.isArray(value)){
    try{return JSON.stringify(value);}catch{return null;}
  }
  return null;
}
export function validateAnticheatEntry(entry){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))return null;
  const userId=String(entry.userId??'');
  const username=entry.username,kind=entry.kind,reason=entry.reason;
  const detail=detailString(entry.detail);
  const strikes=entry.count;
  if(!ROBLOX_UID.test(userId))return null;
  if(typeof username!=='string'||username.length<1||username.length>40||/[\u0000-\u001f\u007f]/.test(username))return null;
  if(typeof kind!=='string'||!DETECTION_KIND.test(kind))return null;
  if(typeof reason!=='string'||reason.length<1||reason.length>240||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(reason))return null;
  if(typeof detail!=='string'||detail.length>1200||/[\u0000-\u0008\u000b-\u001f\u007f]/.test(detail))return null;
  if(!Number.isSafeInteger(strikes)||strikes<0||strikes>1000000)return null;
  return {userId,username,kind,reason,detail,strikes};
}
export async function ensureAnticheatSchema(env){
  // Called lazily; idempotent for an existing D1 database.
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS anticheat_log(id INTEGER PRIMARY KEY AUTOINCREMENT,server_job_id TEXT NOT NULL,roblox_user_id TEXT NOT NULL,username TEXT NOT NULL,kind TEXT NOT NULL,reason TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '',strikes INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_anticheat_user_id ON anticheat_log(roblox_user_id,id DESC)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_anticheat_created ON anticheat_log(id DESC)')
  ]);
}
function authorized(request,env){
  if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)
    return respond({ok:false,error:'not_configured'},503);
  if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)
    return respond({ok:false,error:'unauthorized'},401);
  return null;
}
function asDetection(row){
  return {
    id:row.id,
    serverJobId:row.server_job_id,
    userId:row.roblox_user_id,
    username:row.username,
    kind:row.kind,
    reason:row.reason,
    detail:row.detail,
    strikes:Number(row.strikes),
    count:Number(row.strikes),
    createdAt:row.created_at
  };
}
export async function listAnticheat(env,{userId=null,page=1}={}){
  await ensureAnticheatSchema(env);
  const offset=(page-1)*PAGE_SIZE;
  const sql=userId
    ?'SELECT id,server_job_id,roblox_user_id,username,kind,reason,detail,strikes,created_at FROM anticheat_log WHERE roblox_user_id=? ORDER BY id DESC LIMIT 51 OFFSET ?'
    :'SELECT id,server_job_id,roblox_user_id,username,kind,reason,detail,strikes,created_at FROM anticheat_log ORDER BY id DESC LIMIT 51 OFFSET ?';
  const args=userId?[userId,offset]:[offset];
  const rows=(await env.DB.prepare(sql).bind(...args).all()).results||[];
  return {ok:true,page,pageSize:PAGE_SIZE,hasMore:rows.length>PAGE_SIZE,
    entries:rows.slice(0,PAGE_SIZE).map(asDetection)};
}
export async function handleAnticheat(request,env,url){
  const denied=authorized(request,env);
  if(denied)return denied;
  const path=url.pathname;
  if(!['/api/ingest/anticheat','/api/ingest/anticheat/all'].includes(path))
    return respond({ok:false,error:'not_found'},404);

  if(path==='/api/ingest/anticheat' && request.method==='POST'){
    if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
      return respond({ok:false,error:'json_required'},415);
    if(Number(request.headers.get('content-length')||0)>MAX_BODY_BYTES)
      return respond({ok:false,error:'too_large'},413);
    let raw;
    try{raw=await request.text();}catch{return respond({ok:false,error:'invalid_body'},400);}
    if(new TextEncoder().encode(raw).length>MAX_BODY_BYTES)
      return respond({ok:false,error:'too_large'},413);
    let body;
    try{body=JSON.parse(raw);}catch{return respond({ok:false,error:'invalid_json'},400);}
    const serverJobId=body?.serverJobId;
    if(typeof serverJobId!=='string'||!SERVER_ID.test(serverJobId))
      return respond({ok:false,error:'invalid_server_job_id'},400);
    if(!Array.isArray(body?.entries)||body.entries.length<1||body.entries.length>MAX_ENTRIES)
      return respond({ok:false,error:'invalid_entries',maxEntries:MAX_ENTRIES},400);
    const entries=body.entries.map(validateAnticheatEntry);
    if(entries.some(x=>!x))return respond({ok:false,error:'invalid_entry'},400);
    try{
      await ensureAnticheatSchema(env);
      await env.DB.batch(entries.map(e=>env.DB.prepare(
        'INSERT INTO anticheat_log(server_job_id,roblox_user_id,username,kind,reason,detail,strikes) VALUES(?,?,?,?,?,?,?)'
      ).bind(serverJobId,e.userId,e.username,e.kind,e.reason,e.detail,e.strikes)));
      return respond({ok:true,inserted:entries.length},201);
    }catch(e){
      console.error('anticheat D1 ingest error',String(e?.message||'').slice(0,100));
      return respond({ok:false,error:'database_error'},500);
    }
  }
  if(request.method==='GET'){
    const page=positivePage(url.searchParams.get('page'));
    if(!page)return respond({ok:false,error:'invalid_page'},400);
    let userId=null;
    if(path==='/api/ingest/anticheat'){
      userId=url.searchParams.get('userId');
      if(!ROBLOX_UID.test(userId||''))return respond({ok:false,error:'invalid_user_id'},400);
    }
    try{
      return respond(await listAnticheat(env,{userId,page}));
    }catch(e){
      console.error('anticheat D1 lookup error',String(e?.message||'').slice(0,100));
      return respond({ok:false,error:'database_error'},500);
    }
  }
  return respond({ok:false,error:'method_not_allowed'},405);
}
