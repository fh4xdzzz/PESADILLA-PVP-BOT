// Persistent lightweight 3D replay frames in Cloudflare D1.
// v1: server-authoritative positions and facing only, no video or combat effects.
const matchIdOk=id=>typeof id==='string' && /^[A-Za-z0-9:_-]{1,100}$/.test(id);
const validUid=id=>typeof id==='string' && /^[1-9]\d{0,19}$/.test(id);
const finite=n=>typeof n==='number' && Number.isFinite(n) && Math.abs(n)<=100000;
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
let initialized=false;
export async function replaySchema(env) {
 if(!env.DB)throw Error('DB binding missing');
 if(initialized)return;
 await env.DB.batch([
  env.DB.prepare("CREATE TABLE IF NOT EXISTS replay_meta(match_id TEXT PRIMARY KEY,total_chunks INTEGER NOT NULL DEFAULT 0,duration REAL NOT NULL DEFAULT 0,finished INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS replay_chunks(match_id TEXT NOT NULL,chunk_index INTEGER NOT NULL,frames_json TEXT NOT NULL,PRIMARY KEY(match_id,chunk_index))")
 ]);
 initialized=true;
}
export async function ingestReplay(request,env) {
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)return reply({error:'not_configured'},503);
 if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)return reply({error:'unauthorized'},401);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return reply({error:'json_required'},415);
 if(Number(request.headers.get('content-length')||0)>44000)return reply({error:'too_large'},413);
 const raw=await request.text();if(raw.length>44000)return reply({error:'too_large'},413);
 let x;try{x=JSON.parse(raw);}catch{return reply({error:'invalid_json'},400);}
 if(!x||!matchIdOk(x.matchId)||!Number.isInteger(x.index)||x.index<0||x.index>49||
  !Array.isArray(x.frames)||x.frames.length<1||x.frames.length>40||
  typeof x.final!=='boolean'||!Number.isInteger(x.totalChunks)||x.totalChunks<1||x.totalChunks>50||
  x.index>=x.totalChunks||!finite(x.duration)||x.duration<0||x.duration>900||
  (x.final && x.index!==x.totalChunks-1)||(x.index===x.totalChunks-1&&!x.final))
   return reply({error:'invalid_replay'},400);
 let previous=-1;
 for(const frame of x.frames){
  if(!Array.isArray(frame)||frame.length!==2||!finite(frame[0])||frame[0]<0||frame[0]>900||
     frame[0]<previous||!Array.isArray(frame[1])||frame[1].length>20)return reply({error:'invalid_frame'},400);
  previous=frame[0];
  const uids=new Set();
  for(const p of frame[1]){
   if(!Array.isArray(p)||p.length!==5||!validUid(p[0])||uids.has(p[0])||
      !p.slice(1).every(finite))return reply({error:'invalid_player'},400);
   uids.add(p[0]);
  }
 }
 try{
  await replaySchema(env);
  const meta=await env.DB.prepare('SELECT total_chunks,duration,finished FROM replay_meta WHERE match_id=?').bind(x.matchId).first();
  if(meta?.finished)return reply({ok:true,duplicate:true});
  if(meta && meta.total_chunks!==x.totalChunks)return reply({error:'chunk_count_conflict'},409);
  // Idempotent retries, and record the manifest when the first chunk arrives.
  await env.DB.batch([
   env.DB.prepare("INSERT INTO replay_meta(match_id,total_chunks,duration,finished) VALUES(?,?,?,0) ON CONFLICT(match_id) DO NOTHING").bind(x.matchId,x.totalChunks,x.duration),
   env.DB.prepare('INSERT INTO replay_chunks(match_id,chunk_index,frames_json) VALUES(?,?,?) ON CONFLICT(match_id,chunk_index) DO NOTHING').bind(x.matchId,x.index,JSON.stringify(x.frames))
  ]);
  if(x.final){
   const count=await env.DB.prepare('SELECT COUNT(*) n FROM replay_chunks WHERE match_id=?').bind(x.matchId).first();
   if(Number(count?.n||0)===x.totalChunks){
    await env.DB.prepare('UPDATE replay_meta SET finished=1 WHERE match_id=?').bind(x.matchId).run();
   }
  }
  return reply({ok:true,index:x.index},201);
 }catch(e){console.error('Replay ingest failed',String(e?.message||'').slice(0,120));return reply({error:'database_error'},500);}
}
export async function getReplay(env,id) {
 if(!matchIdOk(id))return {error:'invalid_id',status:400};
 try{
  await replaySchema(env);
  const meta=await env.DB.prepare('SELECT match_id,total_chunks,duration,finished FROM replay_meta WHERE match_id=?').bind(id).first();
  if(!meta)return {error:'not_recorded',status:404};
  const rows=(await env.DB.prepare('SELECT chunk_index,frames_json FROM replay_chunks WHERE match_id=? ORDER BY chunk_index LIMIT 50').bind(id).all()).results||[];
  const frames=[];
  for(const row of rows){for(const frame of JSON.parse(row.frames_json))frames.push(frame);}
  const complete=Boolean(meta.finished)&&rows.length===Number(meta.total_chunks);
  return {matchId:id,duration:Number(meta.duration),complete,frames,chunkCount:rows.length,expectedChunks:meta.total_chunks};
 }catch(e){console.error('Replay read failed',String(e?.message||'').slice(0,120));return {error:'database_error',status:500};}
}


// Roblox server-only read endpoints; the secret never crosses RemoteFunction to a client.
export async function readReplayForRoblox(request,env,url){
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)return reply({error:'not_configured'},503);
 if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)return reply({error:'unauthorized'},401);
 const id=url.searchParams.get('matchId');
 if(!matchIdOk(id))return reply({error:'invalid_match_id'},400);
 try{
  await replaySchema(env);
  const meta=await env.DB.prepare('SELECT match_id,total_chunks,duration,finished FROM replay_meta WHERE match_id=?').bind(id).first();
  if(!meta)return reply({error:'not_recorded'},404);
  if(url.pathname.endsWith('/meta')){
   return reply({matchId:id,duration:Number(meta.duration),totalChunks:Number(meta.total_chunks),complete:Boolean(meta.finished)});
  }
  const raw=url.searchParams.get('index');
  if(!/^(0|[1-9]\d*)$/.test(raw||''))return reply({error:'invalid_index'},400);
  const index=Number(raw);
  if(index>=Number(meta.total_chunks)||index>49)return reply({error:'index_out_of_range'},400);
  const row=await env.DB.prepare('SELECT frames_json FROM replay_chunks WHERE match_id=? AND chunk_index=?').bind(id,index).first();
  if(!row)return reply({error:'chunk_not_recorded'},404);
  return reply({matchId:id,index,frames:JSON.parse(row.frames_json)});
 }catch(e){console.error('Roblox replay read failed',String(e?.message||'').slice(0,120));return reply({error:'database_error'},500);}
}


// Phase 2: independently recorded server-authoritative combat and round events.
export async function ingestReplayEvents(request,env){
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)return reply({error:'not_configured'},503);
 if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)return reply({error:'unauthorized'},401);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return reply({error:'json_required'},415);
 const raw=await request.text();
 if(raw.length>44000)return reply({error:'too_large'},413);
 let x;try{x=JSON.parse(raw);}catch{return reply({error:'invalid_json'},400);}
 const types=new Set(['fire','hit','kill','jump','equip','round','ability','respawn','death']);
 if(!matchIdOk(x?.matchId)||!Number.isInteger(x.index)||x.index<0||x.index>49||!Array.isArray(x.events)||x.events.length>40)return reply({error:'invalid_batch'},400);
 for(const e of x.events){
  // [time, kind, actorId, targetId|null, x, y, z, shortDetail]
  if(!Array.isArray(e)||e.length!==8||!finite(e[0])||e[0]<0||e[0]>900||
   !types.has(e[1])||!validUid(e[2])||(e[3]!==null&&!validUid(e[3]))||
   !e.slice(4,7).every(finite)||typeof e[7]!=='string'||e[7].length>80)
   return reply({error:'invalid_event'},400);
 }
 try{
  await replaySchema(env);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS replay_event_chunks(match_id TEXT NOT NULL,chunk_index INTEGER NOT NULL,events_json TEXT NOT NULL,PRIMARY KEY(match_id,chunk_index))').run();
  await env.DB.prepare('INSERT INTO replay_event_chunks(match_id,chunk_index,events_json) VALUES(?,?,?) ON CONFLICT(match_id,chunk_index) DO NOTHING').bind(x.matchId,x.index,JSON.stringify(x.events)).run();
  return reply({ok:true,index:x.index},201);
 }catch(e){console.error('Replay event upload failed',String(e?.message||'').slice(0,120));return reply({error:'database_error'},500);}
}
export async function readReplayEventsForRoblox(request,env,url){
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)return reply({error:'not_configured'},503);
 if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)return reply({error:'unauthorized'},401);
 const id=url.searchParams.get('matchId'),raw=url.searchParams.get('index');
 if(!matchIdOk(id)||!/^(0|[1-9]\d*)$/.test(raw||'')||Number(raw)>49)return reply({error:'invalid_request'},400);
 try{
  await replaySchema(env);
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS replay_event_chunks(match_id TEXT NOT NULL,chunk_index INTEGER NOT NULL,events_json TEXT NOT NULL,PRIMARY KEY(match_id,chunk_index))').run();
  const row=await env.DB.prepare('SELECT events_json FROM replay_event_chunks WHERE match_id=? AND chunk_index=?').bind(id,Number(raw)).first();
  if(!row)return reply({matchId:id,index:Number(raw),events:[],missing:true});
  return reply({matchId:id,index:Number(raw),events:JSON.parse(row.events_json)});
 }catch(e){console.error('Replay event retrieval failed',String(e?.message||'').slice(0,120));return reply({error:'database_error'},500);}
}
