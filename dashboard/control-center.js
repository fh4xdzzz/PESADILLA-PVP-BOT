import {anticheatPage} from './anticheat-ui.js';
import {dashboardStyle} from './discord-style.js';
import {renderGuildSettings,saveGuildSettings} from './discord-ui.js';
import {loadGuilds} from './discord-guild-directory.js';
import {icon} from './lucide-icons.js';
// Discord control center + Roblox moderation command queue for PESADILLA PVP.
// Browser actions require a verified OAuth admin session (enforced by worker.js);
// bot/Roblox server endpoints require distinct server-side Bearer secrets.
const UID=/^[1-9]\d{0,19}$/;
const SAFE_TEXT=/^[^\u0000-\u001f\u007f]{0,500}$/;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const CHANNELS=Object.freeze({
 'channel.registro-moderacion':'Registro de moderación','channel.registro-mensajes':'Registro de mensajes',
 'channel.registro-entradas':'Registro de entradas','channel.announcements':'Anuncios',
 'channel.rules':'Reglas','channel.game-link':'Enlace al juego','channel.status':'Estado',
 'channel.updates':'Actualizaciones','channel.sneak-peek':'Adelantos','channel.faq':'Preguntas frecuentes',
 'channel.codes':'Códigos','channel.boosts':'Boosts','channel.giveaways':'Sorteos',
 'channel.polls':'Encuestas','channel.videos':'Videos','channel.roles':'Roles',
 'channel.daily-shop':'Tienda diaria','channel.events':'Eventos','channel.chat':'Chat',
 'channel.cmds':'Comandos','channel.media':'Media','channel.trading':'Trading',
 'channel.ticket':'Panel de tickets','channel.tickets-category':'Categoría tickets',
 'channel.panel-staff':'Panel staff','channel.organizacion-torneos':'Torneos',
 'channel.incidencias-internas':'Incidencias','channel.comandos-bot':'Comandos de bot'
});
export const OPTIONS=Object.freeze({
 'guild.main':'ID servidor Discord principal','guild.support':'ID Discord soporte',
 'welcome.enabled':'Mensajes de bienvenida (true/false)',
 'welcome.message':'Mensaje de bienvenida (sin menciones automáticas)',
 'feature.tickets':'Sistema de tickets (true/false)',
 'feature.giveaways':'Sorteos (true/false)',
 'feature.polls':'Encuestas (true/false)',
 'feature.events':'Eventos (true/false)',
 'feature.automod':'Automoderación (true/false)',
 'feature.logs':'Registros de auditoría (true/false)'
});
const KEYS={...CHANNELS,...OPTIONS};
const booleanKeys=new Set(Object.keys(OPTIONS).filter(x=>x.includes('.enabled')||x.startsWith('feature.')));
const booleanValid=new Set(['true','false']);
function validSetting(key,value){
 if(!Object.hasOwn(KEYS,key)||typeof value!=='string'||!SAFE_TEXT.test(value))return false;
 if(booleanKeys.has(key))return booleanValid.has(value);
 if(key==='welcome.message')return value.length<=240;
 return value===''||UID.test(value);
}
const html=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
async function setup(env){
 await env.DB.batch([
  env.DB.prepare('CREATE TABLE IF NOT EXISTS discord_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_by TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)'),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS staff_roles(roblox_user_id TEXT PRIMARY KEY,discord_user_id TEXT,role TEXT NOT NULL CHECK(role IN ('owner','administrador','moderador','soporte')),granted_by TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
  env.DB.prepare("CREATE TABLE IF NOT EXISTS dashboard_moderation(id INTEGER PRIMARY KEY AUTOINCREMENT,roblox_user_id TEXT NOT NULL,action TEXT NOT NULL CHECK(action IN ('ban','unban','kick')),reason TEXT NOT NULL,actor_discord_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',requested_at_ms INTEGER NOT NULL,lease_until_ms INTEGER,attempts INTEGER NOT NULL DEFAULT 0,executed_server TEXT,result_message TEXT,updated_at_ms INTEGER NOT NULL)"),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_moderation_queue ON dashboard_moderation(status,requested_at_ms)')
 ]);
}
function checkBearer(req,secret){
 return typeof secret==='string'&&secret.length>=32&&req.headers.get('authorization')==='Bearer '+secret;
}
function ownerAllowed(env,user){
 const configured=String(env.DASHBOARD_OWNER_IDS||'796931424112476171').split(',').map(x=>x.trim());
 return configured.includes(String(user?.id||''));
}
function sameOrigin(request,env){
 try{
  const origin=new URL(String(env.APP_BASE_URL)).origin;
  return new URL(request.url).origin===origin&&request.headers.get('origin')===origin;
 }catch{return false;}
}
export async function csrfForSession(session,secret){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const data=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('discord-control:'+session));
 return Array.from(new Uint8Array(data),n=>n.toString(16).padStart(2,'0')).join('');
}
function timingSafe(a,b){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
 let bad=0;for(let i=0;i<a.length;i++)bad|=a.charCodeAt(i)^b.charCodeAt(i);return bad===0;
}
function renderPage(page,user,body,flash=''){
 const nav=[['/','layout-dashboard','Vista general'],['/discord','messages-square','Comunidades Discord'],['/moderacion','shield-ban','Moderación Roblox'],['/anticheat','shield-ban','Anticheat']];
 const menu=nav.map(([url,glyph,name])=>'<a class="'+(page===url?'selected':'')+'" href="'+url+'">'+icon(glyph)+' '+html(name)+'</a>').join('');
 const title=page==='/discord'?'Comunidades':page==='/moderacion'?'Moderación':page==='/anticheat'?'Anticheat':'Vista general';
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>'+html(title)+' · PESADILLA PVP</title><style>'+dashboardStyle+'</style></head><body><div class="shell"><aside class="side"><div class="brand"><div class="brand-icon">'+icon('skull')+'</div><div>PESADILLA PVP<small>BOT CONTROL CENTER</small></div></div><div class="nav-caption">ADMINISTRACIÓN</div><nav class="nav">'+menu+'</nav><div class="side-foot"><b>●</b> Panel protegido · Cloudflare</div></aside><div class="main-wrap"><header class="topbar"><div class="breadcrumb">PESADILLA PVP / <strong>'+html(title)+'</strong></div><div class="account"><span class="avatar">'+html((user.username||'?')[0].toUpperCase())+'</span><span>'+html(user.username)+'</span><a class="logout" href="/logout">Salir</a></div></header><main>'+(flash?'<div class="notice success">'+html(flash)+'</div>':'')+body+'<footer>PESADILLA PVP · Configuración sincronizada de forma segura · Solo administradores autorizados</footer></main></div></div></body></html>';
}
export async function controlPage(page,env,user,session,query=new URLSearchParams()){
 const csrf=await csrfForSession(session,env.SESSION_SECRET);
 try{
  await setup(env);
  if(page==='/'){
   const guilds=await loadGuilds(env.DB);
   const pending=(await env.DB.prepare("SELECT COUNT(*) AS n FROM dashboard_moderation WHERE status='pending' OR status='processing'").first())?.n||0;
   const configured=(await env.DB.prepare("SELECT COUNT(*) AS n FROM discord_settings").first())?.n||0;
   const online=guilds.filter(g=>Date.now()-Number(g.updatedAt)<5*60*1000).length;
   const guildCards=guilds.map(g=>'<a class="card" style="display:block" href="/discord?guild='+encodeURIComponent(g.id)+'"><div style="display:flex;align-items:center;gap:13px"><span class="guild-avatar">'+html(g.name[0])+'</span><div><strong style="font-size:15px">'+html(g.name)+'</strong><div class="subtle">'+(g.kind==='main'?'Comunidad principal':g.kind==='support'?'Soporte':'Servidor conectado')+' · '+g.channels.length+' canales</div></div></div><p>Administrar canales, roles y automatizaciones →</p></a>').join('');
   return renderPage(page,user,'<div class="page-header"><span class="eyebrow">PESADILLA PVP / BOT MANAGEMENT</span><h1>Centro de control</h1><p>Administra tus comunidades de Discord desde un mismo lugar, con canales y roles reales sincronizados por el bot.</p></div>'+
   '<div class="cards"><div class="card"><span class="eyebrow">SERVIDORES CONECTADOS</span><h2>'+guilds.length+'</h2><p>Comunidades detectadas automáticamente</p></div><div class="card"><span class="eyebrow">CONEXIONES ACTIVAS</span><h2>'+online+'</h2><p>Última actualización en los últimos 5 minutos</p></div><div class="card"><span class="eyebrow">OPCIONES CONFIGURADAS</span><h2>'+Number(configured)+'</h2><p>Preferencias guardadas por servidor</p></div><div class="card"><span class="eyebrow">MODERACIÓN PENDIENTE</span><h2>'+Number(pending)+'</h2><p>Acciones por confirmar desde Roblox</p></div></div>'+
   '<section class="panel-section"><div class="panel-title"><h3>Tus comunidades</h3><p>Elige el servidor que deseas configurar.</p></div><div class="cards">'+(guildCards||'<div class="notice">Todavía no se ha recibido el directorio del bot. Comprueba la sincronización para que aparezcan aquí tus Discord.</div>')+'</div></section>'+
   '<section class="panel-section"><div class="panel-title"><h3>Accesos rápidos</h3><p>Elige una opción para continuar.</p></div><div class="cards"><a class="card" href="/discord"><strong style="font-size:16px">Configuración de Discord</strong><p>Canales, roles, bienvenida, tickets y eventos.</p></a><a class="card" href="/moderacion"><strong style="font-size:16px">Moderación Roblox</strong><p>Banear, desbanear o expulsar con confirmación del juego.</p></a></div></section>');
  }
  if(page==='/discord'){
   const body=await renderGuildSettings(env,csrf,query,ownerAllowed(env,user));
   return renderPage(page,user,body);
  }
  if(page==='/anticheat')return renderPage(page,user,await anticheatPage(env,query));
  if(page==='/moderacion'){
   const rows=(await env.DB.prepare('SELECT id,roblox_user_id,action,reason,actor_discord_id,status,requested_at_ms,result_message FROM dashboard_moderation ORDER BY id DESC LIMIT 50').all()).results||[];
   const form='<form method="post" action="/moderacion" class="grid"><input type="hidden" name="csrf" value="'+csrf+'"><label class="field">Roblox UserId<input name="robloxUserId" pattern="[1-9][0-9]{0,19}" required placeholder="ID del jugador"></label><label class="field">Acción<select name="action"><option value="ban">Banear globalmente</option><option value="unban">Desbanear globalmente</option><option value="kick">Expulsar del servidor</option></select></label><label class="field">Motivo<input name="reason" required minlength="5" maxlength="200" placeholder="Motivo de moderación"></label><div><p>El servidor Roblox ejecutará y confirmará la acción. Nunca se marcará aplicada al enviarla.</p><button type="submit">Enviar acción</button></div></form>';
   const entries=rows.map(x=>'<tr><td>#'+x.id+'</td><td>'+html(x.roblox_user_id)+'</td><td>'+html(x.action)+'</td><td>'+html(x.reason)+'</td><td>'+html(x.status)+'</td><td>'+html(x.result_message||'—')+'</td></tr>').join('');
   return renderPage(page,user,'<h1>Moderación de Roblox</h1><p>Solo tres acciones: banear, desbanear y expulsar. El backend registra el usuario, la razón, el responsable y el resultado informado por Roblox.</p><div class="card">'+form+'</div><div class="card"><h2>Historial de solicitudes</h2><div style="overflow-x:auto"><table><thead><tr><th>Solicitud</th><th>Usuario</th><th>Acción</th><th>Motivo</th><th>Estado</th><th>Respuesta</th></tr></thead><tbody>'+entries+'</tbody></table></div></div>',query.get('queued')==='1'?'Acción registrada; pendiente de aplicación en Roblox.':null);
  }
  return renderPage(page,user,'<h1>No encontrado</h1>');
 }catch(e){console.error('Control center page error',String(e?.message||'').slice(0,110));return renderPage(page,user,'<h1>Base de datos no disponible</h1><p>Comprueba el binding DB e inténtalo de nuevo.</p>');}
}
async function parseForm(request,max=10000){
 const raw=await request.text();if(raw.length>max)return null;
 return new URLSearchParams(raw);
}
export async function controlWrite(request,env,user,session,page){
 if(!sameOrigin(request,env))return reply({ok:false,error:'invalid_origin'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/x-www-form-urlencoded'))return reply({ok:false,error:'form_required'},415);
 const form=await parseForm(request);
 if(!form)return reply({ok:false,error:'too_large'},413);
 const token=await csrfForSession(session,env.SESSION_SECRET);
 if(!timingSafe(form.get('csrf'),token))return reply({ok:false,error:'invalid_csrf'},403);
 try{
  await setup(env);
  if(page==='/discord'){
   if(!ownerAllowed(env,user))return reply({ok:false,error:'forbidden'},403);
   const saved=await saveGuildSettings(env,user,form);
   if(!saved.ok)return reply(saved,400);
   return Response.redirect(new URL('/discord?guild='+encodeURIComponent(saved.guildId)+'&saved=1',request.url),303);
  }
  if(page==='/moderacion'){
   const target=form.get('robloxUserId'),action=form.get('action'),reason=form.get('reason')?.trim();
   if(!UID.test(target||'')||!['ban','unban','kick'].includes(action)||!reason||reason.length<5||reason.length>200||!SAFE_TEXT.test(reason))return reply({ok:false,error:'invalid_request'},400);
   if(target==='8223424925')return reply({ok:false,error:'owner_protected'},403);
   const staff=await env.DB.prepare('SELECT role FROM staff_roles WHERE roblox_user_id=?').bind(target).first();
   if((staff?.role==='owner'||staff?.role==='administrador')&&!ownerAllowed(env,user))return reply({ok:false,error:'staff_protected'},403);
   const since=Date.now()-60000;
   const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM dashboard_moderation WHERE actor_discord_id=? AND requested_at_ms>=?').bind(user.id,since).first();
   if(Number(count?.n||0)>=5)return reply({ok:false,error:'rate_limited'},429);
   const now=Date.now();
   await env.DB.batch([
    env.DB.prepare('INSERT INTO dashboard_moderation(roblox_user_id,action,reason,actor_discord_id,status,requested_at_ms,updated_at_ms) VALUES(?,?,?,?,?,?,?)').bind(target,action,reason,user.id,'pending',now,now),
    env.DB.prepare('INSERT INTO audit_logs(actor_discord_id,action,target_id,details_json) VALUES(?,?,?,?)').bind(user.id,'roblox.moderation.request',target,JSON.stringify({action,reason}))
   ]);
   return Response.redirect(new URL('/moderacion?queued=1',request.url),303);
  }
  return reply({ok:false,error:'not_found'},404);
 }catch(e){console.error('Control center save error',String(e?.message||'').slice(0,100));return reply({ok:false,error:'database_error'},500);}
}
export async function controlService(request,env,url){
 if(!env.DB)return reply({ok:false,error:'not_configured'},503);
 const path=url.pathname;
 const isBot=path==='/api/sync/discord';
 const secret=isBot?env.BOT_CONFIG_SYNC_SECRET:env.ROBLOX_INGEST_SECRET;
 if(!checkBearer(request,secret))return reply({ok:false,error:'unauthorized'},401);
 try{
  await setup(env);
  if(isBot&&request.method==='GET'){
   const rows=(await env.DB.prepare('SELECT key,value FROM discord_settings ORDER BY key').all()).results||[];
   const guilds=await loadGuilds(env.DB);
   return reply({ok:true,settings:Object.fromEntries(rows.map(r=>[r.key,r.value])),guildTypes:Object.fromEntries(guilds.map(g=>[g.kind,g.id]))});
  }
  if(path==='/api/ingest/moderation/poll'&&request.method==='GET'){
   const server=url.searchParams.get('serverJobId');
   if(typeof server!=='string'||!/^[\w-]{1,100}$/.test(server))return reply({ok:false,error:'invalid_server'},400);
   const now=Date.now();
   await env.DB.batch([
    env.DB.prepare("UPDATE dashboard_moderation SET status='failed',result_message='Sin servidor que confirmara la expulsión durante 2 minutos',updated_at_ms=? WHERE action='kick' AND status='pending' AND requested_at_ms<?").bind(now,now-120000),
    env.DB.prepare("UPDATE dashboard_moderation SET status='failed',result_message='No se pudo ejecutar tras 5 intentos',updated_at_ms=? WHERE action IN ('ban','unban') AND status='processing' AND attempts>=5 AND lease_until_ms<?").bind(now,now)
   ]);
   const kicked=(await env.DB.prepare("SELECT id,roblox_user_id,reason,action FROM dashboard_moderation WHERE action='kick' AND status='pending' AND requested_at_ms>=? ORDER BY id ASC LIMIT 20").bind(now-120000).all()).results||[];
   const claim=await env.DB.prepare("UPDATE dashboard_moderation SET status='processing',lease_until_ms=?,attempts=attempts+1,updated_at_ms=? WHERE id=(SELECT id FROM dashboard_moderation WHERE action IN ('ban','unban') AND (status='pending' OR (status='processing' AND lease_until_ms<?)) AND attempts<5 ORDER BY id ASC LIMIT 1) RETURNING id,roblox_user_id,reason,action").bind(now+30000,now,now).first();
   return reply({ok:true,commands:[...kicked,...(claim?[claim]:[])]});
  }
  if(path==='/api/ingest/moderation/ack'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>1500)return reply({ok:false,error:'too_large'},413);
   let b;try{b=JSON.parse(raw);}catch{return reply({ok:false,error:'invalid_json'},400);}
   const id=Number(b?.id),status=b?.status,server=b?.serverJobId,message=String(b?.message||'');
   if(!Number.isSafeInteger(id)||id<1||!['applied','failed'].includes(status)||typeof server!=='string'||!/^[\w-]{1,100}$/.test(server)||message.length>250)return reply({ok:false,error:'invalid_ack'},400);
   const result=await env.DB.prepare("UPDATE dashboard_moderation SET status=?,executed_server=?,result_message=?,lease_until_ms=NULL,updated_at_ms=? WHERE id=? AND status IN ('pending','processing') RETURNING id").bind(status,server,message,Date.now(),id).first();
   return result?reply({ok:true}):reply({ok:false,error:'already_resolved'},409);
  }
  return reply({ok:false,error:'not_found'},404);
 }catch(e){console.error('Control center API error',String(e?.message||'').slice(0,100));return reply({ok:false,error:'database_error'},500);}
}
