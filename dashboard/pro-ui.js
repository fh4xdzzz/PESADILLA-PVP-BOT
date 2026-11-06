import { icon } from './lucide-icons.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const format = n => Number(n||0).toLocaleString('es');
const date = v => {const d=new Date(v);return Number.isNaN(d.getTime())?esc(v):new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(d)+' UTC';};
const initials = v => String(v||'?').slice(0,2).toUpperCase();
const nav = [
 ['/', 'layout-dashboard', 'Vista general'],
 ['/jugadores','users','Jugadores'],
 ['/partidas','swords','Partidas'],
 ['/reportes','flag','Reportes'],
 ['/baneos','shield-ban','Sanciones'],
 ['/discord','messages-square','Discord']
];
const style = `
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:#f3edf5;background:#0a090d;font-synthesis:none}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse 75% 34% at 72% -6%,#3e13274d,transparent),#0a090d}
a{color:inherit;text-decoration:none}button,input{font:inherit}button{cursor:pointer}
.shell{display:grid;grid-template-columns:248px minmax(0,1fr);min-height:100vh}
.sidebar{border-right:1px solid #30252a;background:#100e13;display:flex;flex-direction:column;padding:26px 15px;position:sticky;top:0;height:100vh}
.brand{padding:8px 13px 31px;display:flex;align-items:center;gap:13px}.brandmark{width:43px;height:43px;border-radius:13px;background:linear-gradient(140deg,#c5293b,#60142d);display:grid;place-items:center;font-size:24px;box-shadow:0 9px 25px #b01e3740}
.brandmark .lucide{width:25px;height:25px}.logout .lucide{width:14px;height:14px;margin-right:4px}.btn .lucide{width:15px;height:15px;margin-right:5px}.metric-label .lucide{width:15px;height:15px;margin-right:7px;color:#df7285}.pill .lucide{width:13px;height:13px;margin-right:5px}
.brand strong{font-size:14px;letter-spacing:.11em}.brand small{display:block;margin-top:5px;color:#c98693;font-size:10px;letter-spacing:.2em}
.navhead{font-size:10px;color:#827079;letter-spacing:.17em;text-transform:uppercase;padding:10px 14px}.nav{display:flex;flex-direction:column;gap:5px}
.nav a{display:flex;gap:13px;align-items:center;color:#a99da6;padding:13px 14px;border-radius:10px;font-size:13px;font-weight:600;border:1px solid transparent}
.nav a .ico{width:21px;display:inline-flex;align-items:center;justify-content:center;color:#ad6b7a;flex-shrink:0}.lucide{display:inline-block;vertical-align:middle;flex-shrink:0}.nav a:hover{background:#26191e;color:#fff}
.nav a.active{color:#fff;background:linear-gradient(100deg,#4e1c2b,#2b1922);border-color:#7c3240}
.nav a.active .ico{color:#ff8393}.sidebottom{margin-top:auto;border-top:1px solid #30252a;padding:18px 10px 3px;font-size:12px;color:#9f8d96}
.live{display:inline-block;background:#70e9a6;width:7px;height:7px;border-radius:50%;box-shadow:0 0 8px #3ccc77;margin-right:6px}
.area{min-width:0}.topbar{height:78px;border-bottom:1px solid #30252a;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:0 clamp(18px,3.4vw,54px);background:#120f1480}
.breadcrumb{color:#887a84;font-size:12px}.breadcrumb b{color:#f4eaf0;font-weight:600}
.account{display:flex;align-items:center;gap:11px;font-size:12px;color:#d6c2cb}.avatar{height:34px;width:34px;background:#672c3d;border:1px solid #9d475c;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:800}.logout{color:#d7929c;border:1px solid #57313b;padding:9px 12px;border-radius:8px}
main{padding:38px clamp(18px,3.4vw,54px) 70px;max-width:1540px;margin:auto}.eyebrow{text-transform:uppercase;letter-spacing:.2em;color:#e5687d;font-size:11px;font-weight:800;margin:0 0 11px}
h1{font-size:clamp(27px,3vw,38px);letter-spacing:-.045em;line-height:1.1;margin:0 0 10px}h2{font-size:17px;margin:0 0 16px;letter-spacing:-.015em}
.lead{font-size:13px;color:#9d8e99;margin:0 0 28px;line-height:1.7}
.pills{display:flex;gap:9px;flex-wrap:wrap}.pill{font-size:11px;font-weight:700;border-radius:30px;padding:7px 11px;border:1px solid #66434d;color:#f0a0ae;background:#301c25}.pill.green{border-color:#315746;color:#8cdeb1;background:#172b24}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin:27px 0}
.metric{background:linear-gradient(150deg,#20191f,#151217);border:1px solid #382a32;border-radius:14px;padding:21px 23px;min-height:144px;position:relative;overflow:hidden}.metric:before{content:'';height:3px;position:absolute;inset:0 0 auto;background:linear-gradient(90deg,#ad2d45,#e57883,transparent)}
.metric-label{font-size:11px;color:#b3a0a9;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.metric-value{font-size:35px;letter-spacing:-.045em;font-weight:800;margin:18px 0 5px}.metric-foot{font-size:11px;color:#8c7883}
.panel{background:#171319;border:1px solid #382a32;border-radius:15px;padding:23px;min-width:0}.split{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(250px,.85fr);gap:17px}
.paneltop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:15px}.paneltop h2{margin:0}.subtle{color:#9e8f97;font-size:12px;line-height:1.6}
.link{color:#ec8796;font-size:12px;font-weight:700}.link:hover{text-decoration:underline}.tablewrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;text-align:left;font-size:12px;white-space:nowrap}
th{font-size:10px;color:#95838b;text-transform:uppercase;letter-spacing:.09em;font-weight:700;padding:13px 11px;border-bottom:1px solid #362931}
td{padding:15px 11px;border-bottom:1px solid #2a2228;color:#d1bdc7}tr:last-child td{border-bottom:0}
.primary{color:#f2e9ee;font-weight:700}.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px}.muted{color:#9c8994}
.rank{color:#f1a2a8;font-weight:800}.rowperson{display:flex;align-items:center;gap:10px}.tinyavatar{width:30px;height:30px;border-radius:9px;background:#492432;display:grid;place-items:center;color:#ffbbc7;font-size:10px;font-weight:800}
.empty{text-align:center;color:#93818d;padding:37px 15px;font-size:13px;line-height:1.7}.empty strong{display:block;color:#e4d2db;margin-bottom:6px}
.search{display:flex;gap:9px;margin-bottom:18px}.search input{min-width:0;width:100%;background:#100d12;border:1px solid #45313b;color:#fff;padding:12px 15px;border-radius:9px;outline:none}.search input:focus{border-color:#ca5369}
.btn{background:#ac2e48;color:white;border:1px solid #c64b65;border-radius:9px;padding:11px 17px;font-size:12px;font-weight:800}.btn:hover{background:#c53e58}
.notice{padding:18px 20px;background:#271b22;border:1px solid #633848;border-left:3px solid #d44965;border-radius:11px;margin-top:18px}.notice strong{font-size:13px}.notice p{font-size:12px;color:#b49ca8;line-height:1.6;margin:7px 0 0}
.kv{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #33272f;padding:13px 0;font-size:12px}.kv:last-child{border:0}.kv span:first-child{color:#a9929f}
.footer{padding-top:28px;font-size:11px;color:#655862}
@media(max-width:1150px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.split{grid-template-columns:1fr}}
@media(max-width:780px){.shell{display:block}.sidebar{height:auto;position:static;padding:13px}.brand{padding:2px 7px 14px}.nav{flex-direction:row;overflow:auto}.nav a{white-space:nowrap;padding:10px}.navhead,.sidebottom{display:none}.topbar{height:64px}.cards{gap:10px}.metric{padding:16px;min-height:128px}.metric-value{font-size:29px}main{padding-top:26px}}
@media(max-width:430px){.cards{grid-template-columns:1fr 1fr}.metric-label{font-size:9px}.metric-value{font-size:27px}.account span{display:none}}
`;
export function renderShell(title, body, user=null) {
 const links=nav.map(([url,ico,label])=>'<a class="'+(title===label?'active':'')+'" href="'+url+'"><span class="ico">'+icon(ico)+'</span>'+label+'</a>').join('');
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><title>'+esc(title)+' · PESADILLA PVP</title><style>'+style+'</style></head><body><div class="shell"><aside class="sidebar"><div class="brand"><div class="brandmark">'+icon('skull')+'</div><div><strong>PESADILLA PVP</strong><small>ADMINISTRATION</small></div></div><div class="navhead">Administración</div><nav class="nav" aria-label="Navegación principal">'+links+'</nav><div class="sidebottom"><span class="live"></span>Panel seguro · Cloudflare</div></aside><div class="area"><header class="topbar"><div class="breadcrumb">PESADILLA PVP / <b>'+esc(title)+'</b></div>'+(user?'<div class="account"><div class="avatar">'+esc(initials(user.username))+'</div><span>'+esc(user.username)+'</span><a class="logout" href="/logout">'+icon('log-out')+' Salir</a></div>':'<span class="pill">Acceso privado</span>')+'</header><main>'+body+'<footer class="footer">PESADILLA PVP · Datos reales desde Roblox · Solo administradores autorizados</footer></main></div></div></body></html>';
}
async function all(env, sql, params=[]) {const st=env.DB.prepare(sql);return (await (params.length?st.bind(...params):st).all()).results||[];}
async function one(env,sql,params=[]) {const st=env.DB.prepare(sql);return (await (params.length?st.bind(...params):st).first())||{};}
const metric=(name,value,foot,glyph='layout-dashboard')=>'<div class="metric"><div class="metric-label">'+icon(glyph)+esc(name)+'</div><div class="metric-value">'+(value===null?'—':format(value))+'</div><div class="metric-foot">'+esc(foot)+'</div></div>';
function matchTable(rows) {
 return rows.length?'<div class="tablewrap"><table><thead><tr><th>Partida</th><th>Fecha UTC</th><th>Jugadores</th><th>Estado</th></tr></thead><tbody>'+rows.map(x=>'<tr><td><a class="link mono" href="/partidas/'+encodeURIComponent(x.match_id)+'">'+esc(x.match_id.slice(0,12))+'…</a> <a class="link" style="margin-left:10px" href="/replays/'+encodeURIComponent(x.match_id)+'">▶ Replay 3D</a></td><td>'+esc(date(x.started_at))+'</td><td>'+format(x.participants)+'</td><td><span class="pill green">Finalizada</span></td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><strong>No hay partidas registradas</strong>Termina una partida real en Roblox para verla aquí.</div>';
}
function playersTable(rows) {
 return rows.length?'<div class="tablewrap"><table><thead><tr><th>Jugador</th><th>ID Roblox</th><th>Kills</th><th>Muertes</th><th>Victorias</th><th>Partidas</th></tr></thead><tbody>'+rows.map((x,i)=>'<tr><td><div class="rowperson"><span class="tinyavatar">'+esc(initials(x.username))+'</span><a class="link" href="/jugadores/'+encodeURIComponent(x.roblox_user_id)+'">'+esc(x.username||'Jugador')+'</a></div></td><td class="mono muted">'+esc(x.roblox_user_id)+'</td><td>'+format(x.kills)+'</td><td>'+format(x.deaths)+'</td><td class="rank">'+format(x.wins)+'</td><td>'+format(x.matches)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><strong>Sin jugadores registrados</strong>Los jugadores aparecerán al terminar una partida.</div>';
}
const Q={
  metrics:"SELECT (SELECT COUNT(*) FROM players) players,(SELECT COUNT(*) FROM matches) matches,(SELECT COUNT(*) FROM reports) reports,(SELECT COUNT(*) FROM sanctions) sanctions",
  matches:"SELECT m.match_id,m.started_at,m.ended_at,m.status,COUNT(mp.roblox_user_id) participants FROM matches m LEFT JOIN match_participants mp ON mp.match_id=m.match_id GROUP BY m.match_id ORDER BY m.started_at DESC LIMIT 50",
  players:"SELECT p.roblox_user_id,p.username,COUNT(mp.match_id) matches,COALESCE(SUM(mp.kills),0) kills,COALESCE(SUM(mp.deaths),0) deaths,COALESCE(SUM(mp.wins),0) wins FROM players p LEFT JOIN match_participants mp ON mp.roblox_user_id=p.roblox_user_id GROUP BY p.roblox_user_id ORDER BY wins DESC,kills DESC LIMIT 100",
};
function head(title,description,kicker='OPERACIONES / PESADILLA PVP') {return '<p class="eyebrow">'+esc(kicker)+'</p><h1>'+esc(title)+'</h1><p class="lead">'+esc(description)+'</p>';}
function panel(title,body,link='') {return '<section class="panel"><div class="paneltop"><h2>'+esc(title)+'</h2>'+link+'</div>'+body+'</section>';}
function safeSearch(q) {return typeof q==='string'?q.trim().slice(0,80):'';}
export async function renderDashboard(path,env,user,params=new URLSearchParams()) {
 if(!env.DB)return renderShell('Inicio',head('Base de datos no conectada','Comprueba el binding DB de Cloudflare.'),user);
 const title=path.startsWith('/partidas/')?'Detalle de partida':path.startsWith('/jugadores/')?'Perfil de jugador':(nav.find(n=>n[0]===path)?.[2]||'Inicio');
 try {
 let body='';
 if(path==='/') {
   const [m,players,matches]=await Promise.all([one(env,Q.metrics),all(env,Q.players),all(env,Q.matches)]);
   body=head('Centro de control','Supervisa la actividad real de tu experiencia Roblox y la comunidad Discord.')+'<div class="pills"><span class="pill green">'+icon('database')+' Datos conectados a D1</span><span class="pill">Solo lectura</span></div><div class="cards">'+metric('Jugadores',m.players,'Registrados en Roblox','users')+metric('Partidas',m.matches,'Resultados recibidos','swords')+metric('Reportes',m.reports,'Casos almacenados','flag')+metric('Sanciones',m.sanctions,'Sanciones registradas','shield-ban')+'</div><div class="split">'+panel('Últimas partidas',matchTable(matches.slice(0,7)),'<a class="link" href="/partidas">'+icon('arrow-up-right')+' Ver todas</a>')+panel('Clasificación PvP',players.length?'<div class="tablewrap"><table><thead><tr><th>Jugador</th><th>Victorias</th><th>Kills</th></tr></thead><tbody>'+players.slice(0,7).map((p,i)=>'<tr><td class="primary"><span class="rank">#'+(i+1)+'</span> <a class="link" href="/jugadores/'+encodeURIComponent(p.roblox_user_id)+'">'+esc(p.username)+'</a></td><td>'+format(p.wins)+'</td><td>'+format(p.kills)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">Sin resultados aún.</div>','<a class="link" href="/jugadores">'+icon('arrow-up-right')+' Ver ranking</a>')+'</div>';
 } else if(path==='/jugadores'){
   const players=await all(env,Q.players),q=safeSearch(params.get('q')),shown=q?players.filter(x=>String(x.username||'').toLowerCase().includes(q.toLowerCase())||String(x.roblox_user_id).includes(q)):players;
   body=head('Jugadores','Estadísticas acumuladas por jugador, basadas en partidas recibidas.')+'<form class="search" action="/jugadores" method="get"><input name="q" maxlength="80" aria-label="Buscar jugador" placeholder="Buscar por nombre o ID de Roblox" value="'+esc(q)+'"><button class="btn" type="submit">'+icon('search')+' Buscar</button></form>'+panel('Jugadores · '+shown.length,playersTable(shown));
 } else if(path.startsWith('/jugadores/')){
   const id=path.slice('/jugadores/'.length);
   if(!/^[1-9][0-9]{0,19}$/.test(id))return renderShell('Error',head('Jugador inválido','Identificador de Roblox incorrecto.'),user);
   const person=await one(env,'SELECT roblox_user_id,username FROM players WHERE roblox_user_id=?',[id]);
   const pageNum=Math.max(1,Math.min(100000,Number.parseInt(params.get('page')||'1',10)||1));
   const games=await all(env,'SELECT m.match_id,m.started_at,m.ended_at,m.status,COUNT(allmp.roblox_user_id) participants FROM matches m JOIN match_participants mp ON mp.match_id=m.match_id LEFT JOIN match_participants allmp ON allmp.match_id=m.match_id WHERE mp.roblox_user_id=? GROUP BY m.match_id ORDER BY m.started_at DESC LIMIT 50 OFFSET ?',[id,(pageNum-1)*50]);
   body=head(person.username?'Partidas de @'+person.username:'Jugador no encontrado','Todos los enfrentamientos recientes registrados para este usuario de Roblox.')+panel('Historial · página '+pageNum,matchTable(games))+'<p>'+(pageNum>1?'<a class="link" href="/jugadores/'+id+'?page='+(pageNum-1)+'">← Anterior</a>　':'')+(games.length===50?'<a class="link" href="/jugadores/'+id+'?page='+(pageNum+1)+'">Siguiente página →</a>':'')+'</p><p><a class="link" href="/jugadores">← Volver a jugadores</a></p>';
 } else if(path==='/partidas'){
   const pageNum=Math.max(1,Math.min(100000,Number.parseInt(params.get('page')||'1',10)||1));
   const q=safeSearch(params.get('q'));
   const matches=await all(env,'SELECT m.match_id,m.started_at,m.ended_at,m.status,COUNT(mp.roblox_user_id) participants FROM matches m LEFT JOIN match_participants mp ON m.match_id=mp.match_id WHERE m.match_id LIKE ? GROUP BY m.match_id ORDER BY m.started_at DESC LIMIT 50 OFFSET ?',['%'+q+'%',(pageNum-1)*50]);
   const shown=matches;
   body=head('Historial de partidas','Resultados guardados en Cloudflare D1, recibidos directamente del servidor.')+'<form class="search" action="/partidas" method="get"><input name="q" maxlength="80" aria-label="Buscar partida" placeholder="Buscar por ID de partida" value="'+esc(q)+'"><button class="btn" type="submit">'+icon('search')+' Buscar</button></form>'+panel('Partidas · página '+pageNum,matchTable(shown))+'<p>'+(pageNum>1?'<a class="link" href="/partidas?page='+(pageNum-1)+'&q='+encodeURIComponent(q)+'">← Anterior</a>　':'')+(shown.length===50?'<a class="link" href="/partidas?page='+(pageNum+1)+'&q='+encodeURIComponent(q)+'">Siguiente página →</a>':'')+'</p>';
 } else if(path.startsWith('/partidas/')){
   const id=decodeURIComponent(path.slice('/partidas/'.length));
   if(!/^[a-zA-Z0-9:_-]{1,100}$/.test(id))return renderShell('Error',head('Partida inválida','El identificador no tiene el formato esperado.'),user);
   const m=await one(env,'SELECT match_id,server_job_id,started_at,ended_at,status FROM matches WHERE match_id=?',[id]);
   const participants=await all(env,'SELECT p.username,mp.roblox_user_id,mp.kills,mp.deaths,mp.wins FROM match_participants mp JOIN players p ON p.roblox_user_id=mp.roblox_user_id WHERE mp.match_id=? ORDER BY mp.wins DESC,mp.kills DESC',[id]);
   body=head('Detalle de partida','Consulta el resultado y las estadísticas guardadas por participante.')+(m.match_id?panel('Información','<div class="kv"><span>ID de partida</span><span class="mono">'+esc(m.match_id)+'</span></div><div class="kv"><span>Inicio (UTC)</span><span>'+esc(date(m.started_at))+'</span></div><div class="kv"><span>Final (UTC)</span><span>'+esc(date(m.ended_at))+'</span></div><div class="kv"><span>Estado</span><span>'+esc(m.status)+'</span></div>')+panel('Participantes',playersTable(participants.map(p=>({...p,matches:1})))):panel('No encontrada','<p class="subtle">Esta partida no existe en la base de datos.</p>'))+'<p><a class="btn" href="/replays/'+encodeURIComponent(id)+'">▶ Abrir replay 3D</a></p><p><a class="link" href="/partidas">← Volver al historial</a></p>';
 } else if(path==='/reportes'||path==='/baneos'){
   const isReports=path==='/reportes';
   const rows=isReports?await all(env,'SELECT report_id,reporter_user_id,target_user_id,reason,status,created_at FROM reports ORDER BY created_at DESC LIMIT 50'):await all(env,'SELECT sanction_id,target_user_id,moderator_discord_id,action,reason,created_at FROM sanctions ORDER BY created_at DESC LIMIT 50');
   const list=rows.length?'<div class="tablewrap"><table><thead><tr><th>ID</th><th>Usuario</th><th>Motivo</th><th>Estado / Acción</th><th>Fecha</th></tr></thead><tbody>'+rows.map(x=>'<tr><td class="mono">'+esc((isReports?x.report_id:x.sanction_id).slice(0,16))+'</td><td>'+esc(x.target_user_id)+'</td><td>'+esc(x.reason)+'</td><td>'+esc(isReports?x.status:x.action)+'</td><td>'+esc(date(x.created_at))+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty"><strong>No hay registros</strong>Las acciones administrativas estarán disponibles cuando se complete la integración segura.</div>';
   body=head(isReports?'Reportes':'Sanciones',isReports?'Consulta las denuncias almacenadas en D1.':'Consulta el historial de sanciones almacenadas en D1.')+panel(isReports?'Reportes recientes':'Historial de sanciones',list)+'<div class="notice"><strong>Acciones deshabilitadas por seguridad</strong><p>El dashboard todavía no puede modificar sanciones de Roblox o resolver reportes. Se implementarán con permisos, confirmación y auditoría.</p></div>';
 } else {
   body=head('Discord','Configuración de los servidores de PESADILLA PVP.')+panel('Integración pendiente','<div class="kv"><span>Discord principal</span><span class="pill">Solo lectura</span></div><div class="kv"><span>Discord de soporte</span><span class="pill">Solo lectura</span></div>')+'<div class="notice"><strong>Próxima fase</strong><p>La administración de canales, roles y tickets requerirá una conexión autenticada con el bot y comprobación de permisos.</p></div>';
 }
 return renderShell(title,body,user);
 } catch (e) {
 console.error('Dashboard query failed',String(e?.message||'').slice(0,120));
 return renderShell(title,head('No se pudieron cargar los datos','La base de datos no respondió. Comprueba D1 e inténtalo de nuevo.'),user);
 }
}
