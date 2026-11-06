// Guild/channel/role discovery from the connected Discord bot.
// Authenticated with BOT_CONFIG_SYNC_SECRET; never with a browser session.
const UID=/^[1-9]\d{0,19}$/;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const names=new Set(['main','support','other']);
const channelKinds=new Set([0,2,4,5,13,15]); // text, voice, categories, announcements, stage, forum
const safeName=v=>typeof v==='string'&&v.length<=100&&!/[\u0000-\u001f]/.test(v);
export async function ensureGuildDirectory(db){
 await db.prepare("CREATE TABLE IF NOT EXISTS discord_guild_directory(guild_id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'other',channels_json TEXT NOT NULL,roles_json TEXT NOT NULL,member_count INTEGER NOT NULL DEFAULT 0,updated_at_ms INTEGER NOT NULL)").run();
}
export async function receiveGuildDirectory(request,env){
 if(!env.DB||typeof env.BOT_CONFIG_SYNC_SECRET!=='string'||env.BOT_CONFIG_SYNC_SECRET.length<32)return json({ok:false,error:'not_configured'},503);
 if(request.headers.get('authorization')!=='Bearer '+env.BOT_CONFIG_SYNC_SECRET)return json({ok:false,error:'unauthorized'},401);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({ok:false,error:'json_required'},415);
 const raw=await request.text();
 if(raw.length>150000)return json({ok:false,error:'too_large'},413);
 let data;try{data=JSON.parse(raw);}catch{return json({ok:false,error:'invalid_json'},400);}
 if(!Array.isArray(data?.guilds)||data.guilds.length>30)return json({ok:false,error:'invalid_payload'},400);
 const ids=new Set(),clean=[];
 for(const g of data.guilds){
  if(!UID.test(String(g?.id||''))||ids.has(String(g.id))||!safeName(g.name)||!names.has(g.kind)||!Array.isArray(g.channels)||g.channels.length>500||!Array.isArray(g.roles)||g.roles.length>250)return json({ok:false,error:'invalid_guild'},400);
  ids.add(String(g.id));
  const cids=new Set(),rids=new Set(),channels=[],roles=[];
  for(const c of g.channels){
   if(!UID.test(String(c?.id||''))||cids.has(String(c.id))||!safeName(c.name)||!channelKinds.has(c.type))return json({ok:false,error:'invalid_channel'},400);
   cids.add(String(c.id));
   channels.push({id:String(c.id),name:c.name,type:c.type,parentId:UID.test(String(c.parentId||''))?String(c.parentId):null});
  }
  for(const r of g.roles){
   if(!UID.test(String(r?.id||''))||rids.has(String(r.id))||!safeName(r.name))return json({ok:false,error:'invalid_role'},400);
   rids.add(String(r.id));
   roles.push({id:String(r.id),name:r.name,position:Number.isSafeInteger(r.position)?r.position:0});
  }
  clean.push({id:String(g.id),name:g.name,kind:g.kind,channels,roles,members:Number.isSafeInteger(g.memberCount)?Math.max(0,g.memberCount):0});
 }
 try{
  await ensureGuildDirectory(env.DB);
  const now=Date.now();
  if(clean.length)await env.DB.batch(clean.map(g=>env.DB.prepare("INSERT INTO discord_guild_directory(guild_id,name,kind,channels_json,roles_json,member_count,updated_at_ms) VALUES(?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET name=excluded.name,kind=CASE WHEN discord_guild_directory.kind='other' THEN excluded.kind ELSE discord_guild_directory.kind END,channels_json=excluded.channels_json,roles_json=excluded.roles_json,member_count=excluded.member_count,updated_at_ms=excluded.updated_at_ms").bind(g.id,g.name,g.kind,JSON.stringify(g.channels),JSON.stringify(g.roles),g.members,now)));
  return json({ok:true,received:clean.length});
 }catch(e){console.error('discord guild sync failed',String(e?.message||'').slice(0,100));return json({ok:false,error:'database_error'},500);}
}
export async function loadGuilds(db){
 await ensureGuildDirectory(db);
 const rows=(await db.prepare('SELECT guild_id,name,kind,channels_json,roles_json,member_count,updated_at_ms FROM discord_guild_directory ORDER BY CASE kind WHEN \'main\' THEN 0 WHEN \'support\' THEN 1 ELSE 2 END,name').all()).results||[];
 return rows.map(r=>({id:r.guild_id,name:r.name,kind:r.kind,channels:JSON.parse(r.channels_json),roles:JSON.parse(r.roles_json),memberCount:r.member_count,updatedAt:r.updated_at_ms}));
}
