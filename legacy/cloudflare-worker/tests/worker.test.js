import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import {sign} from '../src/auth.js';

const APP='https://example.com';
const env={APP_BASE_URL:APP,DISCORD_CLIENT_ID:'1234567890',DISCORD_CLIENT_SECRET:'discord-test-secret',SESSION_SECRET:'s'.repeat(48)};
const req=(path,headers={})=>new Request(APP+path,{headers});
test('la portada del proyecto nuevo presenta login con Discord',async()=>{
 const r=await worker.fetch(req('/'),env);
 assert.equal(r.status,200);
 const body=await r.text();
 assert.match(body,/Continuar con Discord/);
 assert.match(body,/Sin conexión con los sistemas antiguos/);
 assert.doesNotMatch(body,/discord-test-secret/);
});
test('login redirige al proveedor con estado y callback correctos',async()=>{
 const r=await worker.fetch(req('/login/discord'),env);
 assert.equal(r.status,303);
 const u=new URL(r.headers.get('Location'));
 assert.equal(u.origin,'https://discord.com');
 assert.equal(u.searchParams.get('redirect_uri'),APP+'/auth/discord');
 assert.equal(u.searchParams.get('scope'),'identify');
 assert.match(r.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);
});
test('OAuth callback rechaza estados falsificados',async()=>{
 const r=await worker.fetch(req('/auth/discord?state=bad&code=abc',{Cookie:'oauth_discord=other'}),env);
 assert.equal(r.status,403);
});
test('dashboard no deja pasar usuarios sin sesion',async()=>{
 assert.equal((await worker.fetch(req('/dashboard'),env)).status,303);
 const token=await sign({id:'123456789012',username:'Admin',avatar:null,exp:Date.now()+60000},env.SESSION_SECRET);
 const r=await worker.fetch(req('/dashboard',{Cookie:'session='+token}),env);
 assert.equal(r.status,200);
 assert.match(await r.text(),/Conectar mi Roblox/);
});
test('la vinculacion Roblox esta desactivada sin credenciales y DB nuevas',async()=>{
 const token=await sign({id:'123456789012',username:'Admin',exp:Date.now()+60000},env.SESSION_SECRET);
 const r=await worker.fetch(req('/login/roblox',{Cookie:'session='+token}),env);
 assert.equal(r.status,503);
 assert.match(await r.text(),/Conexión Roblox pendiente/);
});
test('health es independiente del dashboard antiguo',async()=>{
 const r=await worker.fetch(req('/health'),{});
 assert.deepEqual(await r.json(),{ok:true,project:'pesadilla-pvp-nuevo'});
});
