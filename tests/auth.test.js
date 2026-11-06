import test from 'node:test';
import assert from 'node:assert/strict';
import {sign,readSigned,cookies,origin,hashChallenge,randomToken} from '../src/auth.js';
import {landing,dashboard} from '../src/html.js';
import {findPublicRobloxProfile,parseRobloxUserInfo} from '../src/roblox.js';

const SECRET='s'.repeat(48);
test('las sesiones estan firmadas y caducan',async()=>{
 const token=await sign({id:'12345678',exp:Date.now()+60000},SECRET);
 assert.equal((await readSigned(token,SECRET)).id,'12345678');
 assert.equal(await readSigned(token+'x',SECRET),null);
 assert.equal(await readSigned(await sign({id:'12345678',exp:Date.now()-1},SECRET),SECRET),null);
});
test('cookies y origen no aceptan un dominio distinto',()=>{
 const r=new Request('https://example.com/dashboard',{headers:{Cookie:'session=a.b; oauth_discord=hello'}});
 assert.equal(cookies(r).get('oauth_discord'),'hello');
 assert.equal(origin({APP_BASE_URL:'https://other.example'},r),null);
 assert.equal(origin({APP_BASE_URL:'https://example.com'},r),'https://example.com');
});
test('los nonces son aleatorios y el hash PKCE es valido',async()=>{
 const x=randomToken(),y=randomToken();
 assert.notEqual(x,y);
 assert.match(await hashChallenge(x),/^[A-Za-z0-9_-]{43}$/);
});
test('las vistas no inyectan HTML en nombres de usuario',()=>{
 const html=dashboard({id:'12345',username:'<svg onload=alert(1)>',avatar:null},null);
 assert.match(html,/&lt;svg onload=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<svg onload/);
 assert.match(landing(),/href="\/login\/discord"/);
});
test('la busqueda Roblox acepta usuarios e IDs publicos y construye URLs seguras',async()=>{
 const calls=[];
 const stub=async (url,opt)=>{
  calls.push(url);
  if(url.includes('usernames/users'))return {ok:true,json:async()=>({data:[{id:777}]})};
  if(url.includes('/v1/users/777'))return {ok:true,json:async()=>({id:777,name:'roblox_777',displayName:'Jugador',description:'Hola'})};
  if(url.includes('thumbnails.roblox.com'))return {ok:true,json:async()=>({data:[{imageUrl:'https://tr.rbxcdn.com/image.png'}]})};
  throw Error('URL no esperada');
 };
 const result=await findPublicRobloxProfile('roblox_777',stub);
 assert.equal(result.id,'777');
 assert.equal(result.username,'roblox_777');
 assert.equal(calls.length,3);
 assert.equal((await findPublicRobloxProfile('not-a-user!',stub)).error.includes('válido'),true);
 assert.equal(parseRobloxUserInfo({sub:'777',preferred_username:'name'}).username,'name');
});
