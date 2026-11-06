import test from 'node:test';
import assert from 'node:assert/strict';
import {csrfForSession,controlWrite,controlService,controlPage} from '../control-center.js';

const SESSION='sample-cookie',APP='https://pesadilla.example',secret='x'.repeat(40),user={id:'796931424112476171',username:'Owner'};
function fixture(){
 const settings=new Map(),moderations=[],audit=[],guilds=new Map();
 const DB={
  prepare(sql){
   let params=[];
   const st={
    bind(...values){params=values;return st;},
    async run(){
     if(sql.startsWith('INSERT INTO discord_settings'))settings.set(params[0],{key:params[0],value:params[1],updated_at:'2026-11-06'});
     if(sql.startsWith("UPDATE discord_guild_directory SET kind='other'"))for(const g of guilds.values())if(g.kind===params[0]&&g.guild_id!==params[1])g.kind='other';
     if(sql.startsWith('UPDATE discord_guild_directory SET kind=?'))guilds.get(params[1]).kind=params[0];
     if(sql.startsWith('INSERT INTO dashboard_moderation'))moderations.push({id:moderations.length+1,roblox_user_id:params[0],action:params[1],reason:params[2],actor_discord_id:params[3],status:params[4],requested_at_ms:params[5],lease_until_ms:null,attempts:0});
     if(sql.startsWith('INSERT INTO audit_logs'))audit.push(params);
     return {success:true};
    },
    async first(){
     if(sql.startsWith('SELECT role FROM staff_roles'))return null;
     if(sql.startsWith('SELECT COUNT(*) AS n FROM dashboard_moderation WHERE actor_discord_id'))return {n:moderations.filter(m=>m.actor_discord_id===params[0]&&m.requested_at_ms>=params[1]).length};
     if(sql.startsWith('SELECT COUNT(*) AS n FROM dashboard_moderation'))return {n:moderations.length};
     if(sql.startsWith('SELECT COUNT(*) AS n FROM discord_settings'))return {n:settings.size};
     if(sql.startsWith("UPDATE dashboard_moderation SET status='processing'")){
      const match=moderations.find(m=>(m.action==='ban'||m.action==='unban')&&(m.status==='pending'||m.status==='processing'&&m.lease_until_ms<params[2])&&m.attempts<5);
      if(!match)return null;
      match.status='processing';match.attempts++;match.lease_until_ms=params[0];
      return {id:match.id,roblox_user_id:match.roblox_user_id,reason:match.reason,action:match.action};
     }
     if(sql.startsWith('UPDATE dashboard_moderation SET status=?')){
      const match=moderations.find(m=>m.id===params[4]&&['pending','processing'].includes(m.status));
      if(!match)return null;
      match.status=params[0];return {id:match.id};
     }
     return null;
    },
    async all(){
     if(sql.startsWith('SELECT key,value FROM discord_settings'))return {results:[...settings.values()]};
     if(sql.startsWith('SELECT key,value,updated_at FROM discord_settings'))return {results:[...settings.values()]};
     if(sql.startsWith('SELECT key,value FROM discord_settings WHERE key LIKE'))return {results:[...settings.values()].filter(x=>x.key.startsWith(params[0].slice(0,-1)))};
     if(sql.startsWith('SELECT guild_id,name,kind,channels_json,roles_json,member_count,updated_at_ms FROM discord_guild_directory'))return {results:[...guilds.values()]};
     if(sql.startsWith("SELECT id,roblox_user_id,reason,action FROM dashboard_moderation WHERE action='kick'"))return {results:moderations.filter(m=>m.action==='kick'&&m.status==='pending'&&m.requested_at_ms>=params[0])};
     if(sql.startsWith('SELECT id,roblox_user_id,action,reason,actor_discord_id,status'))return {results:moderations};
     return {results:[]};
    }
   };return st;
  },
  async batch(statements){for(const statement of statements)await statement.run();}
 };
 return {env:{DB,APP_BASE_URL:APP,SESSION_SECRET:secret,ROBLOX_INGEST_SECRET:secret,BOT_CONFIG_SYNC_SECRET:'b'.repeat(40)},settings,moderations,audit,guilds};
}
async function submit(env,path,form,options={}){
 const csrf=await csrfForSession(SESSION,secret);
 const body=new URLSearchParams({csrf,...form});
 const req=new Request(APP+path,{method:'POST',headers:{Origin:options.origin||APP,'Content-Type':'application/x-www-form-urlencoded'},body});
 return controlWrite(req,env,options.user||user,SESSION,path);
}
function serviceReq(path,method='GET',payload,token=secret){
 return new Request(APP+path,{method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
}
test('CSRF and origin required for management actions',async()=>{
 const {env,moderations}=fixture();
 const bad=await submit(env,'/moderacion',{robloxUserId:'111',action:'kick',reason:'Violation of rules'},{origin:'https://evil.example'});
 assert.equal(bad.status,403);
 const req=new Request(APP+'/moderacion',{method:'POST',headers:{Origin:APP,'Content-Type':'application/x-www-form-urlencoded'},body:'csrf=incorrect&robloxUserId=111&action=ban&reason=Violation'});
 assert.equal((await controlWrite(req,env,user,SESSION,'/moderacion')).status,403);
 assert.equal(moderations.length,0);
});
test('moderation only allows ban/unban/kick and never queues an action against owner',async()=>{
 const {env,moderations}=fixture();
 assert.equal((await submit(env,'/moderacion',{robloxUserId:'111',action:'delete',reason:'Violation of rules'})).status,400);
 assert.equal((await submit(env,'/moderacion',{robloxUserId:'8223424925',action:'ban',reason:'Violation of rules'})).status,403);
 const ok=await submit(env,'/moderacion',{robloxUserId:'111',action:'ban',reason:'Repeated exploiting'});
 assert.equal(ok.status,303);
 assert.equal(moderations.length,1);assert.equal(moderations[0].status,'pending');
});
test('Roblox confirms ban explicitly, polling alone must never mark it applied',async()=>{
 const {env,moderations}=fixture();
 await submit(env,'/moderacion',{robloxUserId:'111',action:'ban',reason:'Repeated exploiting'});
 let r=serviceReq('/api/ingest/moderation/poll?serverJobId=publicserver1');
 const polled=await (await controlService(r,env,new URL(r.url))).json();
 assert.equal(polled.commands.length,1);
 assert.equal(moderations[0].status,'processing');
 const ack=serviceReq('/api/ingest/moderation/ack','POST',{id:1,status:'applied',serverJobId:'publicserver1',message:'BanAsync completed'});
 assert.equal((await controlService(ack,env,new URL(ack.url))).status,200);
 assert.equal(moderations[0].status,'applied');
 const secondAck=serviceReq('/api/ingest/moderation/ack','POST',{id:1,status:'applied',serverJobId:'publicserver1',message:'BanAsync completed'});
 assert.equal((await controlService(secondAck,env,new URL(secondAck.url))).status,409);
});
test('bot sync is private and returns configured channels',async()=>{
 const {env,settings}=fixture();
 settings.set('channel.rules',{key:'channel.rules',value:'1234567890'});
 const bad=serviceReq('/api/sync/discord');
 assert.equal((await controlService(bad,env,new URL(bad.url))).status,401);
 const good=serviceReq('/api/sync/discord','GET',null,'b'.repeat(40));
 const result=await (await controlService(good,env,new URL(good.url))).json();
 assert.equal(result.settings['channel.rules'],'1234567890');
});
test('community selector renders real channels, saves only in selected guild and enforces owner',async()=>{
 const {env,settings,guilds}=fixture();
 guilds.set('111',{guild_id:'111',name:'PESADILLA Comunidad',kind:'main',channels_json:JSON.stringify([{id:'222',name:'anuncios',type:0,parentId:null}]),roles_json:JSON.stringify([{id:'333',name:'Moderador',position:1}]),member_count:100,updated_at_ms:Date.now()});
 guilds.set('444',{guild_id:'444',name:'PESADILLA Soporte',kind:'support',channels_json:JSON.stringify([{id:'555',name:'tickets',type:0,parentId:null}]),roles_json:JSON.stringify([]),member_count:20,updated_at_ms:Date.now()});
 const page=await controlPage('/discord',env,user,SESSION,new URLSearchParams('guild=111'));
 assert.match(page,/PESADILLA Comunidad/);assert.match(page,/PESADILLA Soporte/);
 assert.match(page,/anuncios/);assert.match(page,/Moderador/);
 const post={guildId:'111',guildKind:'main','channel.announcements':'222','role.moderator':'333'};
 const denied=await submit(env,'/discord',post,{user:{id:'4444',username:'Other'}});
 assert.equal(denied.status,403);
 assert.equal((await submit(env,'/discord',{...post,'channel.rules':'555'})).status,400);
 const saved=await submit(env,'/discord',post);
 assert.equal(saved.status,303);
 assert.equal(settings.get('guild.111.channel.announcements').value,'222');
 assert.equal(settings.get('guild.111.role.moderator').value,'333');
 assert.equal(settings.has('guild.444.channel.announcements'),false);
});
