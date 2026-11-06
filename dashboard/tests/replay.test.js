import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestReplay, getReplay } from '../replay-api.js';

function db(){
 const meta=new Map(),chunks=new Map();
 const prepare=(sql)=>({
  bind(...args){
   return {
    async first(){
     if(sql.startsWith('SELECT total_chunks'))return meta.get(args[0])||null;
     if(sql.startsWith('SELECT match_id'))return meta.get(args[0])||null;
     if(sql.startsWith('SELECT COUNT'))return {n:[...chunks.keys()].filter(k=>k.startsWith(args[0]+'|')).length};
     return null;
    },
    async run(){
     if(sql.startsWith('INSERT INTO replay_meta')){if(!meta.has(args[0]))meta.set(args[0],{match_id:args[0],total_chunks:args[1],duration:args[2],finished:0});}
     if(sql.startsWith('INSERT INTO replay_chunks')){const key=args[0]+'|'+args[1];if(!chunks.has(key))chunks.set(key,{chunk_index:args[1],frames_json:args[2]});}
     if(sql.startsWith('UPDATE replay_meta'))meta.get(args[0]).finished=1;
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
 return {meta,chunks,prepare,async batch(statements){for(const statement of statements)await statement.run();}};
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
