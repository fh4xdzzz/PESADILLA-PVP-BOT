// Private Roblox-server player overview across all PESADILLA PVP servers.
// The existing ROBLOX_INGEST_SECRET authenticates this endpoint.
import {ROBLOX_UID,ensureAnticheatSchema} from './anticheat.js';
const HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const respond=(data,status=200)=>Response.json(data,{status,headers:HEADERS});
const OWNER='8223424925';
async function setup(env){
  await ensureAnticheatSchema(env);
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS staff_roles(roblox_user_id TEXT PRIMARY KEY,discord_user_id TEXT,role TEXT NOT NULL CHECK(role IN ('owner','administrador','moderador','soporte')),granted_by TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS dashboard_moderation(id INTEGER PRIMARY KEY AUTOINCREMENT,roblox_user_id TEXT NOT NULL,action TEXT NOT NULL CHECK(action IN ('ban','unban','kick')),reason TEXT NOT NULL,actor_discord_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',requested_at_ms INTEGER NOT NULL,lease_until_ms INTEGER,attempts INTEGER NOT NULL DEFAULT 0,executed_server TEXT,result_message TEXT,updated_at_ms INTEGER NOT NULL)").run();
}
export async function adminPlayerOverview(request,env,url){
  if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)
    return respond({ok:false,error:'not_configured'},503);
  if(request.headers.get('authorization')!=='Bearer '+env.ROBLOX_INGEST_SECRET)
    return respond({ok:false,error:'unauthorized'},401);
  if(request.method!=='GET')return respond({ok:false,error:'method_not_allowed'},405);
  const userId=url.searchParams.get('userId');
  if(!ROBLOX_UID.test(userId||''))return respond({ok:false,error:'invalid_user_id'},400);
  try{
    await setup(env);
    const [roleRow,profile,stats,latestMatches,moderation,summary,latestAnticheat]=await Promise.all([
      userId===OWNER?Promise.resolve({role:'owner'}):
        env.DB.prepare('SELECT role FROM staff_roles WHERE roblox_user_id=?').bind(userId).first(),
      env.DB.prepare('SELECT roblox_user_id,username,created_at,updated_at FROM players WHERE roblox_user_id=?').bind(userId).first(),
      env.DB.prepare('SELECT COUNT(*) matches,COALESCE(SUM(kills),0) kills,COALESCE(SUM(deaths),0) deaths,COALESCE(SUM(wins),0) wins FROM match_participants WHERE roblox_user_id=?').bind(userId).first(),
      env.DB.prepare('SELECT m.match_id,m.server_job_id,m.started_at,m.ended_at,m.status,mp.kills,mp.deaths,mp.wins FROM match_participants mp JOIN matches m ON m.match_id=mp.match_id WHERE mp.roblox_user_id=? ORDER BY m.started_at DESC LIMIT 10').bind(userId).all(),
      env.DB.prepare('SELECT id,action,reason,status,requested_at_ms,executed_server,result_message FROM dashboard_moderation WHERE roblox_user_id=? ORDER BY id DESC LIMIT 20').bind(userId).all(),
      env.DB.prepare('SELECT COUNT(*) total,MAX(strikes) max_strikes,COUNT(DISTINCT server_job_id) servers FROM anticheat_log WHERE roblox_user_id=?').bind(userId).first(),
      env.DB.prepare('SELECT id,server_job_id,username,kind,reason,strikes,created_at FROM anticheat_log WHERE roblox_user_id=? ORDER BY id DESC LIMIT 20').bind(userId).all()
    ]);
    const recentModeration=(moderation.results||[]).map(r=>({id:r.id,action:r.action,reason:r.reason,status:r.status,requestedAtMs:r.requested_at_ms,serverJobId:r.executed_server,result:r.result_message}));
    // Dashboard moderation is a command history, not a verified official Roblox ban status.
    // A ban is "last confirmed action" only; in-game ban/unban may happen outside this queue.
    const lastConfirmedBanAction=recentModeration.find(r=>r.status==='applied'&&(r.action==='ban'||r.action==='unban'))||null;
    return respond({ok:true,userId,
      username:profile?.username??latestAnticheat.results?.[0]?.username??null,
      staffRole:userId===OWNER?'owner':roleRow?.role??null,
      matches:{
        totals:{played:Number(stats?.matches||0),kills:Number(stats?.kills||0),deaths:Number(stats?.deaths||0),wins:Number(stats?.wins||0)},
        recent:(latestMatches.results||[]).map(m=>({matchId:m.match_id,serverJobId:m.server_job_id,startedAt:m.started_at,endedAt:m.ended_at,status:m.status,kills:Number(m.kills),deaths:Number(m.deaths),wins:Number(m.wins)}))
      },
      moderation:{recent:recentModeration,lastConfirmedBanAction,
        banStatusSource:'dashboard_moderation_only'},
      anticheat:{
        totalDetections:Number(summary?.total||0),maxRecordedStrikes:Number(summary?.max_strikes||0),
        distinctServers:Number(summary?.servers||0),
        flagged:Number(summary?.total||0)>0,
        recent:(latestAnticheat.results||[]).map(r=>({id:r.id,serverJobId:r.server_job_id,kind:r.kind,reason:r.reason,strikes:Number(r.strikes),createdAt:r.created_at}))
      }
    });
  }catch(e){
    console.error('Admin player overview failed',String(e?.message||'').slice(0,100));
    return respond({ok:false,error:'database_error'},500);
  }
}
