// Replay Theater: single-use, short-lived launch requests.
// Dashboard's signed Discord session is checked by the caller (worker.js).
// Roblox polling authenticates with the existing server-only ingest secret.
const ID = /^[A-Za-z0-9:_-]{1,100}$/;
const UID = /^[1-9]\d{0,19}$/;
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const TTL_MS=5*60*1000;
function bindings(env){
 const raw=String(env.REPLAY_ADMIN_BINDINGS||'');
 const mapping=new Map();
 for(const entry of raw.split(',')){
  const [discord,roblox,...rest]=entry.trim().split(':').map(x=>x.trim());
  if(!rest.length&&UID.test(discord||'')&&UID.test(roblox||''))mapping.set(discord,roblox);
 }
 return mapping;
}
async function schema(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS replay_launch_requests(roblox_user_id TEXT PRIMARY KEY,match_id TEXT NOT NULL,created_at_ms INTEGER NOT NULL,claimed_at_ms INTEGER)').run();
}
export function configuredRobloxUser(env,discordId){
 return bindings(env).get(String(discordId))||null;
}
export async function requestTheater(request,env,user,url){
 if(!env.DB)return reply({ok:false,error:'database_unavailable'},503);
 const uid=configuredRobloxUser(env,user.id);
 if(!uid)return reply({ok:false,error:'admin_mapping_required'},403);
 // A cross-origin POST must not queue replays using existing Discord cookies.
 const configuredOrigin=String(env.APP_BASE_URL||'').replace(/\/$/,'');
 if(!configuredOrigin||request.headers.get('origin')!==new URL(configuredOrigin).origin||url.origin!==new URL(configuredOrigin).origin)return reply({ok:false,error:'invalid_origin'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return reply({ok:false,error:'json_required'},415);
 const raw=await request.text();
 if(raw.length>1000)return reply({ok:false,error:'too_large'},413);
 let body;try{body=JSON.parse(raw);}catch{return reply({ok:false,error:'invalid_json'},400);}
 // userId supplied by the browser is never trusted; it is derived from Discord mapping.
 if(!ID.test(body?.matchId)|| (body?.userId!==undefined&&String(body.userId)!==uid))return reply({ok:false,error:'invalid_request'},400);
 try{
  await schema(env);
  const recorded=await env.DB.prepare('SELECT finished FROM replay_meta WHERE match_id=?').bind(body.matchId).first();
  if(!recorded||!Number(recorded.finished))return reply({ok:false,error:'replay_not_ready'},409);
  const now=Date.now();
  await env.DB.prepare('INSERT INTO replay_launch_requests(roblox_user_id,match_id,created_at_ms,claimed_at_ms) VALUES(?,?,?,NULL) ON CONFLICT(roblox_user_id) DO UPDATE SET match_id=excluded.match_id,created_at_ms=excluded.created_at_ms,claimed_at_ms=NULL').bind(uid,body.matchId,now).run();
  return reply({ok:true,queued:true,expiresInSeconds:300,robloxUserId:uid});
 }catch(e){console.error('Replay theater queue error',String(e?.message||'').slice(0,90));return reply({ok:false,error:'database_error'},500);}
}
export async function claimTheater(request,env,url){
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)return reply({ok:false,error:'not_configured'},503);
 if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)return reply({ok:false,error:'unauthorized'},401);
 const uid=url.searchParams.get('userId');
 if(!UID.test(uid||'')||![...bindings(env).values()].includes(uid))return reply({ok:false,error:'unauthorized_user'},403);
 try{
  await schema(env);
  const now=Date.now();
  // One-shot atomic claim; no value is returned for expired/already claimed requests.
  const result=await env.DB.prepare('UPDATE replay_launch_requests SET claimed_at_ms=? WHERE roblox_user_id=? AND claimed_at_ms IS NULL AND created_at_ms>=? RETURNING match_id').bind(now,uid,now-TTL_MS).first();
  return result?.match_id?reply({ok:true,matchId:result.match_id}):reply({ok:true});
 }catch(e){console.error('Replay theater claim error',String(e?.message||'').slice(0,90));return reply({ok:false,error:'database_error'},500);}
}
