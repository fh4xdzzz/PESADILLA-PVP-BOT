const encoder = new TextEncoder();
function htmlEscape(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function cookies(request) { return Object.fromEntries((request.headers.get('Cookie') || '').split(';').map(x => x.trim().split(/=(.*)/s).slice(0, 2)).filter(x => x[0])); }
function secureCookie(key,value,maxAge) { return `${key}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`; }
function response(body, status=200, headers={}) { return new Response(body,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...headers}}); }
function redirect(url,cookie) {const h=new Headers({'Location':url,'Cache-Control':'no-store'}); if(cookie) h.append('Set-Cookie',cookie); return new Response(null,{status:302,headers:h});}
function base64url(bytes) {return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');}
function from64(s) {return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));}
async function hmac(data, secret) {const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return base64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(data))));}
async function verify(value,secret) {if(!value || !value.includes('.')) return null;const [payload,sig]=value.split('.');const check=await hmac(payload,secret);if(sig.length!==check.length)return null;let mismatch=0;for(let i=0;i<sig.length;i++)mismatch |= sig.charCodeAt(i)^check.charCodeAt(i);if(mismatch)return null;try{const x=JSON.parse(new TextDecoder().decode(from64(payload)));return x.exp>Date.now() && /^\d+$/.test(x.id) ? x : null;}catch{return null;}}
function layout(title,body,user=null) {
const nav=['Inicio','Jugadores','Partidas','Reportes','Baneos','Discord'].map((name,i)=>`<a class="${title===name?'selected':''}" href="${i===0?'/':('/'+['','jugadores','partidas','reportes','baneos','discord'][i])}">${name}</a>`).join('');
return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>${htmlEscape(title)} · PESADILLA PVP</title><style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,sans-serif;background:#090912;color:#f1ecff}*{box-sizing:border-box}body{margin:0}a{color:#c4a6ff;text-decoration:none}header{display:flex;justify-content:space-between;align-items:center;padding:18px 6%;border-bottom:1px solid #292239;background:#10101d}.brand{font-weight:900;letter-spacing:.09em;color:#f4eaff}.pill{padding:10px 15px;border:1px solid #544070;border-radius:30px}.wrap{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:calc(100vh - 65px)}aside{padding:22px 12px;background:#10101b;border-right:1px solid #292239;display:flex;flex-direction:column;gap:5px}aside a{border-radius:9px;padding:14px;color:#bdb3cf}aside a:hover,aside a.selected{background:#29213d;color:white}main{padding:35px;max-width:1320px;width:100%;margin:auto}h1{margin:0 0 8px;font-size:clamp(27px,4vw,38px)}h2{font-size:18px}p,.muted{color:#afa8c0;line-height:1.55}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px;margin:26px 0}.card{background:#161526;border:1px solid #362847;padding:24px;border-radius:16px;box-shadow:0 7px 30px #05050b40}.metric{font-size:32px;font-weight:800;color:#e2caff}.tag{font-size:12px;color:#ad8de5;text-transform:uppercase;letter-spacing:.1em}.notice{border-left:3px solid #a16dff;padding:14px 18px;background:#20182f;border-radius:5px}.button{display:inline-block;background:#7d43d5;color:white;padding:12px 20px;border-radius:10px;font-weight:700}footer{margin-top:45px;color:#827b94;font-size:12px}@media(max-width:760px){.wrap{display:block}aside{flex-direction:row;overflow:auto;padding:8px}aside a{white-space:nowrap;padding:10px}main{padding:22px 15px}header{padding:14px}}
</style></head><body><header><div class="brand">☠ PESADILLA PVP <span class="muted">/ CONTROL</span></div>${user?`<div><span class="muted">${htmlEscape(user.username)}</span> &nbsp; <a href="/logout">Salir</a></div>`:'<span class="muted">Acceso privado</span>'}</header><div class="wrap"><aside>${nav}</aside><main>${body}<footer>PESADILLA PVP · Dashboard en desarrollo · Sin datos inventados</footer></main></div></body></html>`;
}
const titles={'/':'Inicio','/jugadores':'Jugadores','/partidas':'Partidas','/reportes':'Reportes','/baneos':'Baneos','/discord':'Discord'};
async function stats(env) {if(!env.DB) return null;try {const names=['players','matches','reports','sanctions'];const results=await Promise.all(names.map(n=>env.DB.prepare(`SELECT COUNT(*) AS total FROM ${n}`).first()));return Object.fromEntries(names.map((n,i)=>[n,results[i]?.total??0]));}catch{return null;}}
async function page(path,env,user) {const title=titles[path];const labels={players:'Jugadores',matches:'Partidas',reports:'Reportes',sanctions:'Sanciones'};const data=await stats(env);const metrics=Object.entries(labels).map(([k,v])=>`<div class="card"><div class="tag">${v}</div><div class="metric">${data?.[k]??'—'}</div><div class="muted">${data?'Registros guardados':'Sin base de datos conectada'}</div></div>`).join('');
const desc={'/':'Resumen central de la experiencia y los servidores Discord.','/jugadores':'Perfiles de jugadores y estadísticas individuales.','/partidas':'Historial de cada enfrentamiento y sus participantes.','/reportes':'Denuncias, evidencias y seguimiento de casos.','/baneos':'Consulta de sanciones y futuras acciones administrativas.','/discord':'Futura configuración de roles, canales, tickets y anuncios.'};
const main=path==='/'?`<div class="grid">${metrics}</div>`:`<div class="card"><h2>Sin registros disponibles</h2><p>La conexión con los datos reales de ${title} se implementará en la siguiente fase. Ningún dato de demostración representa jugadores o partidas reales.</p></div>`;
return layout(title,`<h1>${title}</h1><p>${desc[path]}</p>${main}<div class="notice"><strong>Modo seguro de solo lectura</strong><p>Las acciones para banear jugadores o cambiar Discord se habilitarán al completar la autorización, auditoría y conexión con las APIs oficiales.</p></div>`,user);
}
export default {
async fetch(request,env) {
const u=new URL(request.url), path=u.pathname, method=request.method;
if(method!=='GET')return response('Método no permitido',405,{'Allow':'GET'});
if(path==='/health')return Response.json({ok:true,service:'pesadilla-pvp-dashboard'});
const origin=env.APP_BASE_URL;
const missing=[];
if(!origin) missing.push('APP_BASE_URL');
else if(!/^https:\/\//.test(origin)) missing.push('APP_BASE_URL (debe comenzar por https://)');
if(!env.DISCORD_CLIENT_ID) missing.push('DISCORD_CLIENT_ID');
if(!env.DISCORD_CLIENT_SECRET) missing.push('DISCORD_CLIENT_SECRET');
if(!env.DASHBOARD_ADMIN_IDS) missing.push('DASHBOARD_ADMIN_IDS');
if(!env.SESSION_SECRET || env.SESSION_SECRET.length<32) missing.push('SESSION_SECRET (mínimo 32 caracteres)');
if(missing.length) return response(layout('Configuración pendiente',
  '<h1>Configuración pendiente</h1><p>Corrige estos nombres de variables en Cloudflare → Settings → Variables and Secrets:</p><div class="card"><ul>'+missing.map(x=>'<li><code>'+htmlEscape(x)+'</code></li>').join('')+'</ul></div><p>Los valores secretos no se muestran. Después de guardar, recarga el dashboard.</p>'),503);
const redirectUri=`${origin.replace(/\/$/,'')}/auth/callback`;
if(path==='/login') {const state=base64url(crypto.getRandomValues(new Uint8Array(24)));const url=new URL('https://discord.com/oauth2/authorize');url.search=new URLSearchParams({client_id:env.DISCORD_CLIENT_ID,redirect_uri:redirectUri,response_type:'code',scope:'identify',state}).toString();return redirect(url.toString(),secureCookie('oauth_state',state,600));}
if(path==='/auth/callback') {
const c=cookies(request),state=u.searchParams.get('state'),code=u.searchParams.get('code');
if(!state||!code||!c.oauth_state||state!==c.oauth_state)return response('OAuth inválido. Inicia sesión de nuevo.',403,{'Set-Cookie':secureCookie('oauth_state','',0)});
let stage='token';
let diagnostic='unexpected';
try {
const tokenResponse=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.DISCORD_CLIENT_ID,client_secret:env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:redirectUri})});
if(!tokenResponse.ok) {
  let type='unknown';try {const data=await tokenResponse.json();if(typeof data.error==='string' && /^[a-z_]{1,50}$/.test(data.error))type=data.error;}catch{}
  diagnostic=`token_${tokenResponse.status}_${type}`;
  throw Error('OAuth token exchange failed');
}
const token=await tokenResponse.json();
if(!token || typeof token.access_token!=='string'){diagnostic='token_missing_access_token';throw Error('OAuth response missing token');}
stage='profile';
const profileResponse=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:`Bearer ${token.access_token}`}});
if(!profileResponse.ok){diagnostic=`profile_${profileResponse.status}`;throw Error('Discord profile request failed');}
const profile=await profileResponse.json();
if(!profile || !/^[0-9]+$/.test(String(profile.id))){diagnostic='profile_invalid_id';throw Error('Invalid Discord user');}
const admins=env.DASHBOARD_ADMIN_IDS.split(',').map(x=>x.trim());
if(!admins.includes(profile.id))return response('Tu cuenta Discord no está autorizada para este panel.',403,{'Set-Cookie':secureCookie('oauth_state','',0)});
stage='session';
const payload=base64url(encoder.encode(JSON.stringify({id:profile.id,username:profile.global_name||profile.username,exp:Date.now()+8*60*60*1000})));
const signed=`${payload}.${await hmac(payload,env.SESSION_SECRET)}`;const h=new Headers({Location:'/', 'Cache-Control':'no-store'});h.append('Set-Cookie',secureCookie('session',signed,28800));h.append('Set-Cookie',secureCookie('oauth_state','',0));return new Response(null,{status:302,headers:h});
}catch {
const safeCode=stage==='session'?'session_error':diagnostic==='unexpected'?`${stage}_unexpected`:diagnostic;
// Never log OAuth codes, tokens, private secrets or raw Discord responses.
console.error('Discord OAuth failure:',safeCode);
return response(`No se pudo completar el inicio de sesión (diagnóstico: ${safeCode}). Regresa al dashboard y vuelve a pulsar Entrar con Discord.`,502,{'Set-Cookie':secureCookie('oauth_state','',0)});
}
}
if(path==='/logout')return redirect('/login',secureCookie('session','',0));
const user=await verify(cookies(request).session,env.SESSION_SECRET);
if(!user || !env.DASHBOARD_ADMIN_IDS.split(',').map(x=>x.trim()).includes(user.id))return response(layout('Acceso',`<h1>Panel de administración</h1><p>Inicia sesión con una cuenta autorizada de Discord para gestionar PESADILLA PVP.</p><p><a class="button" href="/login">Entrar con Discord</a></p>`),401);
if(path==='/api/summary')return Response.json({data:await stats(env),readOnly:true},{headers:{'Cache-Control':'no-store'}});
if(!(path in titles))return response('No encontrado',404);
return response(await page(path,env,user));
}
};
