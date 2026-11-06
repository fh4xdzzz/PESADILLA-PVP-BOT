import test from 'node:test';
import assert from 'node:assert/strict';
import {handleAnticheat,validateAnticheatEntry} from '../anticheat.js';
import {adminPlayerOverview} from '../admin-player.js';
import {anticheatPage} from '../anticheat-ui.js';
const SECRET='a'.repeat(40);
const URL_ROOT='https://pesadilla.example';
function fixture(){
  const logs=[];
  const env={
    ROBLOX_INGEST_SECRET:SECRET,
    DB:{
      prepare(sql){
        let args=[];
        const st={
          bind(...x){args=x;return st;},
          async run(){
            if(sql.startsWith('INSERT INTO anticheat_log')){
              logs.push({id:logs.length+1,server_job_id:args[0],roblox_user_id:args[1],
                username:args[2],kind:args[3],reason:args[4],detail:args[5],strikes:args[6],
                created_at:'2026-11-06 15:22:00'});
            }
            return {success:true};
          },
          async all(){
            if(sql.includes('FROM anticheat_log')){
              let rows=[...logs].reverse();
              if(sql.includes('WHERE roblox_user_id=?'))rows=rows.filter(r=>r.roblox_user_id===args[0]);
              const offset=args.at(-1);
              return {results:rows.slice(offset,offset+51)};
            }
            return {results:[]};
          },
          async first(){
            if(sql.includes('COUNT(*) total')&&sql.includes('FROM anticheat_log')){
              const rows=logs.filter(r=>r.roblox_user_id===args[0]);
              return {total:rows.length,max_strikes:rows.length?Math.max(...rows.map(r=>r.strikes)):null,servers:new Set(rows.map(r=>r.server_job_id)).size};
            }
            if(sql.includes('COUNT(*) matches'))return {matches:0,kills:0,deaths:0,wins:0};
            return null;
          }
        };
        return st;
      },
      async batch(stmts){for(const q of stmts)await q.run();}
    }
  };
  return {env,logs};
}
const entry=(userId='123',count=3)=>({userId,username:'PvPPlayer',kind:'SPEED',reason:'Speed out of bounds',detail:'speed=72',count});
const post=(entries=[entry()],token=SECRET)=>new Request(URL_ROOT+'/api/ingest/anticheat',{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({serverJobId:'server-A',entries})
});
const get=(path,token=SECRET)=>{
  const req=new Request(URL_ROOT+path,{headers:{authorization:'Bearer '+token}});
  return req;
};
const run=(req,env)=>handleAnticheat(req,env,new URL(req.url));
test('rejects unauthenticated clients and never leaks cache',async()=>{
 const {env}=fixture();
 const unauthorized=await run(post([entry()],'bad-secret'),env);
 assert.equal(unauthorized.status,401);
 assert.equal(unauthorized.headers.get('Cache-Control'),'no-store');
 assert.equal((await unauthorized.json()).error,'unauthorized');
 const read=get('/api/ingest/anticheat/all','bad-secret');
 assert.equal((await run(read,env)).status,401);
});
test('validates all entries before inserting anything',async()=>{
 const {env,logs}=fixture();
 assert.equal((await run(post([entry(),{...entry('888'),count:-1}]),env)).status,400);
 assert.equal(logs.length,0);
 assert.equal((await run(post(Array.from({length:51},()=>entry())),env)).status,400);
 assert.equal((await run(post([{...entry(),userId:'0'}]),env)).status,400);
 assert.equal((await run(post([{...entry(),username:'evil<script>'}]),env)).status,201);
 // HTML is stored as data and escaped when rendered.
 assert.equal(logs.length,1);
 assert.equal(validateAnticheatEntry({...entry(),detail:{speed:120}}).detail,'{"speed":120}');
 assert.equal(validateAnticheatEntry({...entry(),count:1.5}),null);
});
test('stores event batches from multiple servers with global per-player filtering',async()=>{
 const {env,logs}=fixture();
 let r=await run(post([entry('123',3),entry('456',1)]),env);
 assert.equal(r.status,201);
 assert.equal((await r.json()).inserted,2);
 const second=new Request(URL_ROOT+'/api/ingest/anticheat',{method:'POST',
   headers:{authorization:'Bearer '+SECRET,'content-type':'application/json'},
   body:JSON.stringify({serverJobId:'server-B',entries:[entry('123',8)]})});
 await run(second,env);
 assert.equal(logs.length,3);
 const results=await (await run(get('/api/ingest/anticheat?userId=123'),env)).json();
 assert.equal(results.entries.length,2);
 assert.equal(results.entries[0].serverJobId,'server-B');
 assert.equal(results.entries[1].serverJobId,'server-A');
 const all=await (await run(get('/api/ingest/anticheat/all'),env)).json();
 assert.equal(all.entries.length,3);
});
test('supports paging 50 at a time and validates bad query parameters',async()=>{
 const {env}=fixture();
 await run(post(Array.from({length:50},(_,i)=>entry(String(1000+i)))),env);
 await run(post([entry('222')]),env);
 const page1=await (await run(get('/api/ingest/anticheat/all?page=1'),env)).json();
 const page2=await (await run(get('/api/ingest/anticheat/all?page=2'),env)).json();
 assert.equal(page1.entries.length,50);
 assert.equal(page1.hasMore,true);
 assert.equal(page2.entries.length,1);
 assert.equal(page2.hasMore,false);
 assert.equal((await run(get('/api/ingest/anticheat/all?page=0'),env)).status,400);
 assert.equal((await run(get('/api/ingest/anticheat?userId=abc'),env)).status,400);
});
test('web feed escapes untrusted strings and does not require Roblox secret',async()=>{
 const {env}=fixture();
 await run(post([{...entry(),username:'<script>alert(1)</script>',reason:'<img src=x onerror=alert(1)>'}]),env);
 const html=await anticheatPage(env,new URLSearchParams());
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>alert/);
 assert.match(html,/Anticheat global/);
});
test('one-call player profile contains staff, matches, dashboard moderation and anticheat',async()=>{
 const {env}=fixture();
 await run(post([entry('123',8)]),env);
 const req=get('/api/ingest/admin/player?userId=123');
 const res=await adminPlayerOverview(req,env,new URL(req.url));
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.anticheat.totalDetections,1);
 assert.equal(body.anticheat.maxRecordedStrikes,8);
 assert.equal(body.anticheat.flagged,true);
 assert.equal(body.matches.totals.played,0);
 assert.equal(body.staffRole,null);
 assert.equal(body.moderation.banStatusSource,'dashboard_moderation_only');
 const owner=get('/api/ingest/admin/player?userId=8223424925');
 assert.equal((await (await adminPlayerOverview(owner,env,new URL(owner.url))).json()).staffRole,'owner');
 assert.equal((await adminPlayerOverview(get('/api/ingest/admin/player?userId=bad'),env,new URL(URL_ROOT+'/api/ingest/admin/player?userId=bad'))).status,400);
});
