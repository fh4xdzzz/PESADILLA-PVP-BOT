import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStaffAdmin} from '../staff-roles.js';
const secret='z'.repeat(40),ROOT='8223424925';
function fixture(){
 const roles=new Map(),audit=[],replays=[{match_id:'match1',duration:23,finished:1,total_chunks:2,created_at:'2026-11-06'}];
 const DB={
  prepare(sql){
   let args=[];
   const statement={
    bind(...xs){args=xs;return statement;},
    async first(){
     if(sql.startsWith('SELECT role FROM staff_roles'))return roles.get(args[0])||null;
     return null;
    },
    async all(){
     if(sql.startsWith('SELECT roblox_user_id'))return {results:[...roles].map(([id,r])=>({roblox_user_id:id,discord_user_id:r.discordId||null,role:r.role,granted_by:r.grantedBy||null,updated_at:'2026-11-06'}))};
     if(sql.startsWith('SELECT match_id'))return {results:replays};
     return {results:[]};
    },
    async run(){
     if(sql.startsWith('INSERT INTO staff_roles'))roles.set(args[0],{role:args[2],discordId:args[1],grantedBy:args[3]});
     if(sql.startsWith('INSERT INTO staff_role_audit'))audit.push({id:args[0],oldRole:args[1],newRole:args[2],by:args[3]});
     return {success:true};
    }
   };
   return statement;
  },
  async batch(stmts){for(const st of stmts)await st.run();}
 };
 return {env:{DB,ROBLOX_INGEST_SECRET:secret},roles,audit};
}
const path='/api/ingest/admin/';
function req(method,resource,body,auth=secret){
 const headers={Authorization:'Bearer '+auth};
 if(body)headers['Content-Type']='application/json';
 return new Request('https://worker.test'+path+resource,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
}
async function invoke(e,method,resource,body,token=secret){
 const request=req(method,resource,body,token);
 return handleStaffAdmin(request,e,new URL(request.url));
}
test('server-only bearer protects all staff endpoints',async()=>{
 const {env}=fixture();
 for(const resource of ['role?robloxUserId=444','roles','replays']){
  assert.equal((await invoke(env,'GET',resource,null,'wrong')).status,401);
 }
});
test('owner can appoint administrators and writes an audit record',async()=>{
 const {env,roles,audit}=fixture();
 const res=await invoke(env,'POST','role',{robloxUserId:'111',role:'administrador',grantedBy:ROOT});
 assert.equal(res.status,200);assert.equal(roles.get('111').role,'administrador');
 assert.deepEqual(audit[0],{id:'111',oldRole:null,newRole:'administrador',by:ROOT});
 assert.equal((await (await invoke(env,'GET','role?robloxUserId='+ROOT)).json()).role,'owner');
});
test('admin can only appoint or update moderator/support, not another admin or owner',async()=>{
 const {env,roles}=fixture();
 roles.set('111',{role:'administrador'});roles.set('222',{role:'administrador'});
 const allowed=await invoke(env,'POST','role',{robloxUserId:'333',role:'moderador',grantedBy:'111'});
 assert.equal(allowed.status,200);
 for(const [target,role] of [['333','administrador'],['222','soporte'],['444','owner'],[ROOT,'soporte'],['111','moderador']]){
  const res=await invoke(env,'POST','role',{robloxUserId:target,role,grantedBy:'111'});
  assert.equal(res.status,403);
 }
 assert.equal(roles.get('222').role,'administrador');
});
test('moderator and support cannot grant roles, nor spoof actor without valid grant authority',async()=>{
 const {env,roles}=fixture();
 roles.set('123',{role:'moderador'});roles.set('456',{role:'soporte'});
 for(const actor of ['123','456','789']){
  assert.equal((await invoke(env,'POST','role',{robloxUserId:'999',role:'soporte',grantedBy:actor})).status,403);
 }
 assert.equal(roles.has('999'),false);
});
test('replay list returns only expected metadata and staff list includes immutable root',async()=>{
 const {env,roles}=fixture();
 roles.set('123',{role:'soporte'});
 const staff=await (await invoke(env,'GET','roles')).json();
 assert.equal(staff.staff[0].userId,ROOT);
 const res=await (await invoke(env,'GET','replays')).json();
 assert.equal(res.replays[0].matchId,'match1');assert.equal(res.replays[0].complete,true);
});
