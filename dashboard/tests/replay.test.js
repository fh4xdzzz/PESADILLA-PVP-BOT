import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestReplay, getReplay, readReplayForRoblox, ingestReplayEvents, readReplayEventsForRoblox } from '../replay-api.js';

function db(){
 const meta=new Map(),chunks=new Map(),eventMeta=new Map(),eventChunks=new Map();
 const prepare=(sql)=>({
  bind(...args){
   return {
    async first(){
     if(sql.startsWith('SELECT total_chunks FROM replay_event_meta'))return eventMeta.get(args[0])||null;
     if(sql.startsWith('SELECT total_chunks'))return meta.get(args[0])||null;
     if(sql.startsWith('SELECT match_id'))return meta.get(args[0])||null;
     if(sql.startsWith('SELECT frames_json'))return chunks.get(args[0]+'|'+args[1])||null;
     if(sql.startsWith('SELECT events_json'))return eventChunks.get(args[0]+'|'+args[1])||null;
     if(sql.startsWith('SELECT COUNT'))return {n:[...chunks.keys()].filter(k=>k.startsWith(args[0]+'|')).length};
     return null;
    },
    async run(){
     if(sql.startsWith('INSERT INTO replay_meta')){if(!meta.has(args[0]))meta.set(args[0],{match_id:args[0],total_chunks:args[1],duration:args[2],finished:0});}
     if(sql.startsWith('INSERT INTO replay_chunks')){const key=args[0]+'|'+args[1];if(!chunks.has(key))chunks.set(key,{chunk_index:args[1],frames_json:args[2]});}
     if(sql.startsWith('UPDATE replay_meta'))meta.get(args[0]).finished=1;
     if(sql.startsWith('INSERT INTO replay_event_meta')&&!eventMeta.has(args[0]))eventMeta.set(args[0],{total_chunks:args[1]});
     if(sql.startsWith('INSERT INTO replay_event_chunks')){const k=args[0]+'|'+args[1];if(!eventChunks.has(k))eventChunks.set(k,{events_json:args[2]});}
     return {success:true};
    },
    async all(){
     if(sql.startsWith('SELECT chunk_index'))return {results:[...chunks.entries()].filter(([k])=>k.startsWith(args[0]+'|')).map(([,v])=>v).sort((a,b)=>a.chunk_index-b.chunk_index)};
     return {results:[]};
    }
   };
  },
  async run(){return {success:true};}
 });
 return {meta,chunks,eventMeta,eventChunks,prepare,async batch(statements){for(const statement of statements)await statement.run();}};
}
const secret='x'.repeat(64);
const env=()=>({DB:db(),ROBLOX_INGEST_SECRET:secret});
const packet=(index=0,totalChunks=1,final=true)=>({matchId:'a2bb-1',index,totalChunks,final,duration:1,
 frames:[[index*0.5,[['123',0,3,7,90],['456',12,3,9,180]]]]});
function request(payload,key=secret){return new Request('https://worker.test/api/ingest/replay',{method:'POST',
 headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
test('requires server secret',async()=>{
 const e=env();assert.equal((await ingestReplay(request(packet(),'incorrect'),e)).status,401);
 assert.equal(e.DB.meta.size,0);
});
test('rejects malformed or oversized frame data',async()=>{
 const e=env();
 for(const modification of [
  {index:-1},{frames:[[0,[['baduid',1,2,3,4]]]]},
  {frames:[[0,[['123',Infinity,2,3,4]]]]},
  {frames:[[0,[['123',1,2,3]]]]},
  {final:false},{duration:901}
 ]){
  const res=await ingestReplay(request({...packet(),...modification}),e);
  assert.equal(res.status,400);
 }
});
test('stores all chunks, retrieves frames and tolerates duplicate retries',async()=>{
 const e=env();
 const a=await ingestReplay(request(packet(0,2,false)),e);
 assert.equal(a.status,201);
 let replay=await getReplay(e,'a2bb-1');
 assert.equal(replay.complete,false);
 const b=await ingestReplay(request(packet(1,2,true)),e);
 assert.equal(b.status,201);
 replay=await getReplay(e,'a2bb-1');
 assert.equal(replay.complete,true);assert.equal(replay.frames.length,2);
 const again=await ingestReplay(request(packet(1,2,true)),e);
 assert.equal(again.status,200);
 assert.equal(e.DB.chunks.size,2);
});
test('never invents missing historical replay',async()=>{
 const e=env();const r=await getReplay(e,'no-recording');assert.equal(r.status,404);
});

function readRequest(path,matchId='a2bb-1',index=0,key=secret){
 const url='https://worker.test/api/ingest/replay/'+path+'?matchId='+matchId+'&index='+index;
 return new Request(url,{headers:{Authorization:'Bearer '+key}});
}
test('Roblox can securely read metadata and position chunks without accessing private dashboards',async()=>{
 const e=env();
 await ingestReplay(request(packet()),e);
 const mr=readRequest('meta');
 const meta=await readReplayForRoblox(mr,e,new URL(mr.url));
 assert.equal(meta.status,200);
 const m=await meta.json();
 assert.equal(m.totalChunks,1);assert.equal(m.complete,true);assert.equal(m.eventChunks,0);
 const cr=readRequest('chunk');
 const chunk=await readReplayForRoblox(cr,e,new URL(cr.url));
 assert.equal(chunk.status,200);assert.equal((await chunk.json()).frames.length,1);
 const denied=readRequest('meta','a2bb-1',0,'not-a-secret');
 assert.equal((await readReplayForRoblox(denied,e,new URL(denied.url))).status,401);
});
test('event stream rejects invalid action, accepts valid server events and returns them privately',async()=>{
 const e=env();
 const upload=p=>new Request('https://worker.test/api/ingest/replay/events',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify(p)});
 const payload={matchId:'a2bb-1',index:0,totalChunks:1,events:[[0.2,'fire','123','',1,2,3,'Rifle'],[0.5,'kill','123','456',3,2,1,'']]};
 assert.equal((await ingestReplayEvents(upload({...payload,events:[[0,'unknown','123','',1,2,3,'']]}),e)).status,400);
 assert.equal((await ingestReplayEvents(upload(payload),e)).status,201);
 const mr=readRequest('events');
 const got=await readReplayEventsForRoblox(mr,e,new URL(mr.url));
 assert.equal(got.status,200);
 assert.equal((await got.json()).events.length,2);
 const denied=readRequest('events','a2bb-1',0,'bad');
 assert.equal((await readReplayEventsForRoblox(denied,e,new URL(denied.url))).status,401);
});
