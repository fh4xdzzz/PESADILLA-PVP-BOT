import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredRobloxUser,requestTheater,claimTheater} from '../replay-theater.js';

const SECRET='s'.repeat(40);
function fixture(){
 const queue=new Map();
 const env={
  APP_BASE_URL:'https://pesadilla.example',
  REPLAY_ADMIN_BINDINGS:'123456789:8223424925,555555555:987654321',
  ROBLOX_INGEST_SECRET:SECRET,
  DB:{
   prepare(sql){
    let args=[];
    const result={
     bind(...params){args=params;return result;},
     async run(){
      if(sql.startsWith('INSERT INTO replay_launch_requests'))queue.set(args[0],{match_id:args[1],created_at_ms:args[2],claimed_at_ms:null});
      return {success:true};
     },
     async first(){
      if(sql.startsWith('SELECT finished FROM replay_meta'))return args[0]==='actual-match'?{finished:1}:null;
      if(sql.startsWith('UPDATE replay_launch_requests')){
       const q=queue.get(args[1]);
       if(!q||q.claimed_at_ms!==null||q.created_at_ms<args[2])return null;
       q.claimed_at_ms=args[0];return {match_id:q.match_id};
      }
      return null;
     }
    };
    return result;
   }
  }
 };
 return {env,queue};
}
function request(matchId,opts={}){
 return new Request('https://pesadilla.example/api/ingest/replay/request',{
  method:'POST',headers:{Origin:opts.origin||'https://pesadilla.example','Content-Type':'application/json'},
  body:JSON.stringify({matchId,...(opts.userId?{userId:opts.userId}:{})})
 });
}
function claim(uid='8223424925',secret=SECRET){
 return new Request('https://pesadilla.example/api/ingest/replay/claim?userId='+uid,{headers:{Authorization:'Bearer '+secret}});
}
const admin={id:'123456789'};
test('Discord admin maps to one approved Roblox ID',()=>{
 const {env}=fixture();
 assert.equal(configuredRobloxUser(env,admin.id),'8223424925');
 assert.equal(configuredRobloxUser(env,'wrong-id'),null);
});
test('dashboard queues and Roblox claims once, with no replay leak to untrusted users',async()=>{
 const {env}=fixture();
 const a=await requestTheater(request('actual-match'),env,admin,new URL('https://pesadilla.example/api/ingest/replay/request'));
 assert.equal(a.status,200);
 assert.equal((await a.json()).robloxUserId,'8223424925');
 const c=claim(),first=await claimTheater(c,env,new URL(c.url));
 assert.deepEqual(await first.json(),{ok:true,matchId:'actual-match'});
 const again=claim(),second=await claimTheater(again,env,new URL(again.url));
 assert.deepEqual(await second.json(),{ok:true});
});
test('fails closed on missing mapping, CSRF, incomplete replay or spoofing',async()=>{
 const {env}=fixture(),url=new URL('https://pesadilla.example/api/ingest/replay/request');
 assert.equal((await requestTheater(request('actual-match'),env,{id:'7777'},url)).status,403);
 assert.equal((await requestTheater(request('actual-match',{origin:'https://evil.example'}),env,admin,url)).status,403);
 assert.equal((await requestTheater(request('actual-match',{userId:'999999'}),env,admin,url)).status,400);
 assert.equal((await requestTheater(request('missing-match'),env,admin,url)).status,409);
 const c=claim('8223424925','wrong');
 assert.equal((await claimTheater(c,env,new URL(c.url))).status,401);
 const d=claim('123321');
 assert.equal((await claimTheater(d,env,new URL(d.url))).status,403);
});
test('expired launch requests cannot be claimed',async()=>{
 const {env,queue}=fixture(),url=new URL('https://pesadilla.example/api/ingest/replay/request');
 await requestTheater(request('actual-match'),env,admin,url);
 queue.get('8223424925').created_at_ms-=6*60*1000;
 const c=claim();
 assert.deepEqual(await (await claimTheater(c,env,new URL(c.url))).json(),{ok:true});
});
