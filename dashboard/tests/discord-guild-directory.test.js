import test from 'node:test';
import assert from 'node:assert/strict';
import {receiveGuildDirectory,loadGuilds} from '../discord-guild-directory.js';
const SECRET='a'.repeat(40);
function fixture(){
 const list=new Map();
 const DB={
  prepare(sql){
   let p=[];
   const query={
    bind(...v){p=v;return query;},
    async run(){
     if(sql.startsWith('INSERT INTO discord_guild_directory')){
      list.set(p[0],{guild_id:p[0],name:p[1],kind:p[2],channels_json:p[3],roles_json:p[4],member_count:p[5],updated_at_ms:p[6]});
     }
     return {success:true};
    },
    async all(){
     if(sql.startsWith('SELECT guild_id,name,kind'))return {results:[...list.values()]};
     return {results:[]};
    }
   };return query;
  },
  async batch(stmts){for(const s of stmts)await s.run();}
 };
 return {env:{DB,BOT_CONFIG_SYNC_SECRET:SECRET},list};
}
const payload={guilds:[
 {id:'101',name:'PESADILLA Comunidad',kind:'main',memberCount:900,channels:[{id:'201',name:'announcements',type:0,parentId:null},{id:'202',name:'rules',type:0,parentId:null}],roles:[{id:'301',name:'Moderador',position:3}]},
 {id:'102',name:'PESADILLA Soporte',kind:'support',memberCount:100,channels:[{id:'203',name:'tickets',type:0,parentId:null}],roles:[{id:'302',name:'Soporte',position:1}]}
]};
function req(body=payload,token=SECRET){
 return new Request('https://pesadilla.test/api/sync/discord/guilds',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
test('bot publishes connected community and support channels and roles automatically',async()=>{
 const {env}=fixture();
 const r=await receiveGuildDirectory(req(),env);
 assert.equal(r.status,200);
 assert.deepEqual((await r.json()).received,2);
 const guilds=await loadGuilds(env.DB);
 assert.equal(guilds[0].name,'PESADILLA Comunidad');
 assert.equal(guilds[1].channels[0].name,'tickets');
 assert.equal(guilds[0].roles[0].name,'Moderador');
});
test('never accepts untrusted requests or duplicate guild and channel IDs',async()=>{
 const {env,list}=fixture();
 assert.equal((await receiveGuildDirectory(req(payload,'wrong'),env)).status,401);
 const tamper={guilds:[{...payload.guilds[0],channels:[payload.guilds[0].channels[0],payload.guilds[0].channels[0]]}]};
 assert.equal((await receiveGuildDirectory(req(tamper),env)).status,400);
 assert.equal(list.size,0);
});
