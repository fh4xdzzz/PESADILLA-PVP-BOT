import {cookies,cookie,origin,randomToken,hashChallenge,sign,readSigned,redirect,validDiscordId} from './auth.js';
import {landing,dashboard,infoPage} from './html.js';
import {findPublicRobloxProfile,parseRobloxUserInfo} from './roblox.js';

const noStore={
  'Content-Type':'text/html; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY',
  'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src https://cdn.discordapp.com https://*.rbxcdn.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
};
const page=(html,status=200)=>new Response(html,{status,headers:noStore});
const failure=(title,message,status=400)=>{const x=infoPage(title,message,status);return page(x.html,x.status);};
const configOK=env=>String(env.DISCORD_CLIENT_ID||'').length>0 && String(env.DISCORD_CLIENT_SECRET||'').length>0 && String(env.SESSION_SECRET||'').length>=32;
const hasRoblox=env=>Boolean(env.ROBLOX_OAUTH_CLIENT_ID && env.ROBLOX_OAUTH_CLIENT_SECRET);

async function exchange(endpoint,params) {
 const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params),redirect:'error',signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('oauth_exchange_failed');
 const token=await r.json();
 if(typeof token?.access_token !== 'string' || !token.access_token)throw Error('oauth_token_missing');
 return token.access_token;
}
async function getUser(endpoint,token) {
 const r=await fetch(endpoint,{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error('oauth_user_failed');
 return r.json();
}
async function getLink(env,id) {
 if(!env.DB)return null;
 return env.DB.prepare('SELECT roblox_user_id,roblox_username,roblox_display_name FROM user_links WHERE discord_user_id=?').bind(id).first();
}

export default {async fetch(request,env) {
 const url=new URL(request.url);
 const path=url.pathname;
 if(path==='/health')return Response.json({ok:true,project:'pesadilla-pvp-nuevo'});
 if(request.method!=='GET')return failure('Método no permitido','Esta ruta solo admite solicitudes GET.',405);
 const site=origin(env,request);
 if(!site)return failure('URL sin configurar','Configura APP_BASE_URL con el origen exacto de este nuevo Worker.',503);
 if(!configOK(env))return failure('Configuración pendiente','Configura el ID y secreto de la aplicación Discord, más SESSION_SECRET de mínimo 32 caracteres.',503);
 const jar=cookies(request);
 const user=await readSigned(jar.get('session'),env.SESSION_SECRET);
 const session=validDiscordId(user?.id)&&typeof user.username==='string'&&user.username.length<=100?user:null;

 if(path==='/')return session?redirect('/dashboard'):page(landing());
 if(path==='/login/discord') {
   const state=randomToken();
   const params=new URLSearchParams({client_id:env.DISCORD_CLIENT_ID,redirect_uri:site+'/auth/discord',response_type:'code',scope:'identify',state});
   return redirect('https://discord.com/oauth2/authorize?'+params.toString(),[cookie('oauth_discord',state,600)]);
 }
 if(path==='/auth/discord') {
   const state=url.searchParams.get('state'),code=url.searchParams.get('code');
   if(!state||!code||jar.get('oauth_discord')!==state || state.length>150)return failure('Acceso no autorizado','La verificación de Discord caducó. Vuelve a iniciar sesión.',403);
   if(url.searchParams.has('iss')&&url.searchParams.get('iss')!=='https://discord.com')return failure('Acceso no autorizado','El emisor del acceso de Discord no coincide.',403);
   try {
     const token=await exchange('https://discord.com/api/v10/oauth2/token',{
       client_id:env.DISCORD_CLIENT_ID,client_secret:env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:site+'/auth/discord'
     });
     const profile=await getUser('https://discord.com/api/v10/users/@me',token);
     if(!validDiscordId(profile?.id)||typeof profile.username!=='string')throw Error('profile_invalid');
     const username=String(profile.global_name||profile.username).slice(0,100);
     const avatar=typeof profile.avatar==='string'&&/^[a-f0-9_]+$/.test(profile.avatar)?profile.avatar:null;
     const signed=await sign({id:profile.id,username,avatar,exp:Date.now()+8*60*60*1000},env.SESSION_SECRET);
     return redirect('/dashboard',[cookie('session',signed,28800),cookie('oauth_discord','',0)]);
   } catch {
     return failure('No se pudo iniciar sesión','No se completó el acceso de Discord. Comprueba el redirect URI y vuelve a intentarlo.',502);
   }
 }
 if(path==='/logout')return redirect('/',[cookie('session','',0),cookie('oauth_discord','',0),cookie('oauth_roblox','',0)]);
 if(!session)return redirect('/');
 if(path==='/dashboard') {
   const q=String(url.searchParams.get('q')||'').trim().slice(0,30);
   let linked=null,lookup=null;
   try {linked=await getLink(env,session.id);}catch{return failure('Base de datos no disponible','Revisa la D1 nueva y la tabla user_links.',503);}
   if(q) {
     try {lookup=await findPublicRobloxProfile(q);}catch{lookup={error:'No se pudo conectar con Roblox. Prueba más tarde.'};}
   }
   return page(dashboard(session,linked,{lookup,query:q,notice:url.searchParams.get('linked')==='1'?'¡Tu cuenta de Roblox ha quedado vinculada!':null}));
 }
 if(path==='/login/roblox') {
   if(!hasRoblox(env) || !env.DB)return failure('Conexión Roblox pendiente','Configura un cliente OAuth2 de Roblox y una base de datos D1 nueva para guardar la vinculación.',503);
   const state=randomToken();
   const verifier=randomToken(48);
   const challenge=await hashChallenge(verifier);
   const signed=await sign({state,verifier,discordId:session.id,exp:Date.now()+600000},env.SESSION_SECRET);
   const params=new URLSearchParams({client_id:env.ROBLOX_OAUTH_CLIENT_ID,redirect_uri:site+'/auth/roblox',scope:'openid profile',response_type:'code',state,code_challenge:challenge,code_challenge_method:'S256'});
   return redirect('https://apis.roblox.com/oauth/v1/authorize?'+params.toString(),[cookie('oauth_roblox',signed,600)]);
 }
 if(path==='/auth/roblox') {
   const state=url.searchParams.get('state'),code=url.searchParams.get('code');
   const oauth=await readSigned(jar.get('oauth_roblox'),env.SESSION_SECRET);
   if(!env.DB||!hasRoblox(env))return failure('Conexión Roblox pendiente','Aún no está configurado el cliente OAuth2 de Roblox.',503);
   if(!oauth || !state || !code || oauth.state!==state || oauth.discordId!==session.id || typeof oauth.verifier!=='string')return failure('Vinculación no autorizada','La autorización de Roblox caducó. Intenta vincular tu cuenta otra vez.',403);
   try {
     const token=await exchange('https://apis.roblox.com/oauth/v1/token',{
       client_id:env.ROBLOX_OAUTH_CLIENT_ID,client_secret:env.ROBLOX_OAUTH_CLIENT_SECRET,grant_type:'authorization_code',code,code_verifier:oauth.verifier,redirect_uri:site+'/auth/roblox'
     });
     const linked=parseRobloxUserInfo(await getUser('https://apis.roblox.com/oauth/v1/userinfo',token));
     if(!linked)throw Error('invalid_roblox_identity');
     await env.DB.prepare('INSERT INTO user_links(discord_user_id,roblox_user_id,roblox_username,roblox_display_name) VALUES(?,?,?,?) ON CONFLICT(discord_user_id) DO UPDATE SET roblox_user_id=excluded.roblox_user_id,roblox_username=excluded.roblox_username,roblox_display_name=excluded.roblox_display_name,linked_at=CURRENT_TIMESTAMP').bind(session.id,linked.id,linked.username,linked.displayName).run();
     return redirect('/dashboard?linked=1',[cookie('oauth_roblox','',0)]);
   } catch {
     return failure('No se pudo vincular Roblox','No se pudo verificar esta cuenta. Si ya está vinculada a otro Discord, no se puede asociar dos veces.',409);
   }
 }
 return failure('Página no encontrada','Esta sección todavía no existe. Estamos creando el proyecto desde cero.',404);
}};
