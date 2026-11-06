// Global live match directory shared by every Roblox server of PESADILLA PVP.
// This stores presence metadata only; actual spectating runs inside the target Roblox server.
const ID=/^[a-zA-Z0-9:_-]{1,100}$/;
const UID=/^[1-9]\d{0,19}$/;
const respond=(obj,status=200)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const TTL=45_000;
function auth(request,env){
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)
  return respond({ok:false,error:'not_configured'},503);
 if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)
  return respond({ok:false,error:'unauthorized'},401);
 return null;
}
async function schema(env){
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS live_matches(match_id TEXT PRIMARY KEY,server_job_id TEXT NOT NULL,place_id TEXT NOT NULL,players_json TEXT NOT NULL,updated_at_ms INTEGER NOT NULL)').run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_live_matches_updated ON live_matches(updated_at_ms)').run();
}
export async function liveMatchAPI(request,env,url){
 const denied=auth(request,env);if(denied)return denied;
 try {
  await schema(env);
  const path=url.pathname,now=Date.now();
  if(path==='/api/ingest/live/heartbeat'&&request.method==='POST'){
   if(!(request.headers.get('content-type')||'').startsWith('application/json'))return respond({ok:false,error:'json_required'},415);
   const raw=await request.text();
   if(raw.length>12000)return respond({ok:false,error:'too_large'},413);
   let body;try{body=JSON.parse(raw);}catch{return respond({ok:false,error:'invalid_json'},400);}
   const server=body?.serverJobId,placeId=String(body?.placeId??''),sessions=body?.matches;
   if(!ID.test(server)||!UID.test(placeId)||!Array.isArray(sessions)||sessions.length>20)
    return respond({ok:false,error:'invalid_heartbeat'},400);
   const seen=new Set();
   for(const m of sessions){
    if(!ID.test(m?.matchId)||seen.has(m.matchId)||!Array.isArray(m.players)||m.players.length<2||m.players.length>30)
     return respond({ok:false,error:'invalid_match'},400);
    seen.add(m.matchId);
    const ids=new Set();
    for(const p of m.players){
     const id=String(p?.userId??'');
     if(!UID.test(id)||ids.has(id)||typeof p.username!=='string'||p.username.length<1||p.username.length>40)
      return respond({ok:false,error:'invalid_player'},400);
     ids.add(id);
    }
   }
   // Refresh this server's current live matches; completed games disappear immediately.
   const existing=(await env.DB.prepare('SELECT match_id FROM live_matches WHERE server_job_id=?').bind(server).all()).results||[];
   const statements=existing.filter(x=>!seen.has(x.match_id)).map(x=>env.DB.prepare('DELETE FROM live_matches WHERE match_id=? AND server_job_id=?').bind(x.match_id,server));
   for(const m of sessions){
    statements.push(env.DB.prepare('INSERT INTO live_matches(match_id,server_job_id,place_id,players_json,updated_at_ms) VALUES(?,?,?,?,?) ON CONFLICT(match_id) DO UPDATE SET server_job_id=excluded.server_job_id,place_id=excluded.place_id,players_json=excluded.players_json,updated_at_ms=excluded.updated_at_ms')
     .bind(m.matchId,server,placeId,JSON.stringify(m.players.map(p=>({userId:String(p.userId),username:p.username}))),now));
   }
   if(statements.length)await env.DB.batch(statements);
   return respond({ok:true,published:sessions.length});
  }
  if(path==='/api/ingest/live/matches'&&request.method==='GET'){
   const q=(url.searchParams.get('q')||'').trim().toLowerCase().slice(0,60);
   const rows=(await env.DB.prepare('SELECT match_id,server_job_id,place_id,players_json,updated_at_ms FROM live_matches WHERE updated_at_ms>=? ORDER BY updated_at_ms DESC LIMIT 250').bind(now-TTL).all()).results||[];
   const matches=[];
   for(const row of rows){
    let players;try{players=JSON.parse(row.players_json);}catch{continue;}
    if(q&&!row.match_id.toLowerCase().includes(q)&&!players.some(p=>p.username.toLowerCase().includes(q)||p.userId.includes(q)))continue;
    matches.push({matchId:row.match_id,serverJobId:row.server_job_id,placeId:Number(row.place_id),players,seenSecondsAgo:Math.round((now-row.updated_at_ms)/1000)});
    if(matches.length>=50)break;
   }
   return respond({ok:true,matches,staleAfterSeconds:45});
  }
  if(path==='/api/ingest/live/target'&&request.method==='GET'){
   const matchId=url.searchParams.get('matchId'),userId=url.searchParams.get('userId');
   if(!ID.test(matchId)||!UID.test(userId))return respond({ok:false,error:'invalid_request'},400);
   const row=await env.DB.prepare('SELECT server_job_id,place_id,players_json,updated_at_ms FROM live_matches WHERE match_id=? AND updated_at_ms>=?').bind(matchId,now-TTL).first();
   if(!row)return respond({ok:false,error:'match_not_live'},404);
   const players=JSON.parse(row.players_json);
   if(!players.some(x=>x.userId===userId))return respond({ok:false,error:'player_not_in_match'},404);
   return respond({ok:true,matchId,serverJobId:row.server_job_id,placeId:Number(row.place_id),userId});
  }
  return respond({ok:false,error:'not_found'},404);
 }catch(e){console.error('Live directory error',String(e?.message||'').slice(0,100));return respond({ok:false,error:'database_error'},500);}
}
