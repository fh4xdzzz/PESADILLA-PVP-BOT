// PESADILLA PVP staff roles and replay list; Roblox server-to-server endpoint.
// Authorization: existing Bearer secret, plus the actor's server-side role in D1.
// Contract matches the Roblox scripts deployed by Devin.
const UID=/^[1-9]\d{0,19}$/, ROLES=new Set(['owner','administrador','moderador','soporte']);
const OWNER_ID='8223424925';
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function schema(env){
 // Retry on later calls if a D1 query fails; do not mark initialized before D1 succeeds.
 await env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS staff_roles(roblox_user_id TEXT PRIMARY KEY,discord_user_id TEXT,role TEXT NOT NULL CHECK(role IN ('owner','administrador','moderador','soporte')),granted_by TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS staff_role_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,roblox_user_id TEXT NOT NULL,old_role TEXT,new_role TEXT NOT NULL,granted_by TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
 ]);
}
function auth(req,env){
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)return reply({ok:false,error:'not_configured'},503);
 if(req.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)return reply({ok:false,error:'unauthorized'},401);
 return null;
}
async function roleOf(env,uid){
 if(uid===OWNER_ID)return 'owner';
 const row=await env.DB.prepare('SELECT role FROM staff_roles WHERE roblox_user_id=?').bind(uid).first();
 // Do not trust an extra owner row that bypasses immutable configured owner.
 return row && ROLES.has(row.role) ? row.role : null;
}
function canGrant(actorRole,targetRole,requestedRole){
 if(actorRole==='owner')return true;
 return actorRole==='administrador'&&
   (requestedRole==='moderador'||requestedRole==='soporte')&&
   (targetRole===null||targetRole==='moderador'||targetRole==='soporte');
}
export async function handleStaffAdmin(req,env,url){
 const denied=auth(req,env);if(denied)return denied;
 try{
  await schema(env);
  const path=url.pathname,method=req.method;
  if(path==='/api/ingest/admin/role'&&method==='GET'){
   const uid=url.searchParams.get('robloxUserId');
   if(!UID.test(uid||''))return reply({ok:false,error:'invalid_user'},400);
   return reply({ok:true,role:await roleOf(env,uid)});
  }
  if(path==='/api/ingest/admin/roles'&&method==='GET'){
   const rows=(await env.DB.prepare('SELECT roblox_user_id,discord_user_id,role,granted_by,updated_at FROM staff_roles ORDER BY updated_at DESC LIMIT 200').all()).results||[];
   const staff=rows.filter(r=>r.roblox_user_id!==OWNER_ID).map(r=>({userId:r.roblox_user_id,discordId:r.discord_user_id,role:r.role,grantedBy:r.granted_by,updatedAt:r.updated_at}));
   staff.unshift({userId:OWNER_ID,discordId:null,role:'owner',grantedBy:null,updatedAt:null});
   return reply({ok:true,staff});
  }
  if(path==='/api/ingest/admin/role'&&method==='POST'){
   if(!(req.headers.get('content-type')||'').startsWith('application/json'))return reply({ok:false,error:'json_required'},415);
   const raw=await req.text();
   if(raw.length>2000)return reply({ok:false,error:'too_large'},413);
   let b;try{b=JSON.parse(raw);}catch{return reply({ok:false,error:'invalid_json'},400);}
   const target=String(b?.robloxUserId??''),requested=String(b?.role??''),actor=String(b?.grantedBy??''),discordRaw=b?.discordUserId;
   if(!UID.test(target)||!UID.test(actor)||!ROLES.has(requested))return reply({ok:false,error:'invalid_request'},400);
   if(discordRaw!==undefined&&discordRaw!==null&&discordRaw!==''&&!UID.test(String(discordRaw)))return reply({ok:false,error:'invalid_discord_user'},400);
   if(target===OWNER_ID)return reply({ok:false,error:'immutable_owner'},403);
   const actorRole=await roleOf(env,actor),previous=await roleOf(env,target);
   if(!canGrant(actorRole,previous,requested))return reply({ok:false,error:'insufficient_role'},403);
   if(actor===target)return reply({ok:false,error:'self_role_change_denied'},403);
   const did=discordRaw?String(discordRaw):null;
   await env.DB.batch([
    env.DB.prepare("INSERT INTO staff_roles(roblox_user_id,discord_user_id,role,granted_by) VALUES(?,?,?,?) ON CONFLICT(roblox_user_id) DO UPDATE SET role=excluded.role,discord_user_id=COALESCE(excluded.discord_user_id,staff_roles.discord_user_id),granted_by=excluded.granted_by,updated_at=CURRENT_TIMESTAMP").bind(target,did,requested,actor),
    env.DB.prepare('INSERT INTO staff_role_audit(roblox_user_id,old_role,new_role,granted_by) VALUES(?,?,?,?)').bind(target,previous,requested,actor)
   ]);
   return reply({ok:true});
  }
  if(path==='/api/ingest/admin/replays'&&method==='GET'){
   const rows=(await env.DB.prepare('SELECT match_id,duration,finished,total_chunks,created_at FROM replay_meta ORDER BY created_at DESC LIMIT 100').all()).results||[];
   return reply({ok:true,replays:rows.map(r=>({matchId:r.match_id,duration:Number(r.duration),complete:Boolean(r.finished),chunks:Number(r.total_chunks),createdAt:r.created_at}))});
  }
  return reply({ok:false,error:'not_found'},404);
 }catch(e){
  console.error('staff admin backend error',String(e?.message||'').slice(0,120));
  return reply({ok:false,error:'database_error'},500);
 }
}
