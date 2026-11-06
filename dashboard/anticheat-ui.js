// Signed Discord-admin web view of global anticheat detections.
// Authentication is enforced by worker.js before this HTML is rendered.
import {listAnticheat,ROBLOX_UID} from './anticheat.js';
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const link=(page,uid)=>'/anticheat?page='+page+(uid?'&userId='+encodeURIComponent(uid):'');
export async function anticheatPage(env,searchParams){
 const uid=(searchParams.get('userId')||'').trim();
 const rawPage=searchParams.get('page')||'1';
 const page=/^[1-9]\d{0,3}$/.test(rawPage)?Math.min(1000,Number(rawPage)):1;
 if(uid && !ROBLOX_UID.test(uid))return '<div class="page-header"><h1>Anticheat global</h1><p>Introduce un UserId válido de Roblox.</p></div><a href="/anticheat">Ver todos los eventos</a>';
 let result;
 try{result=await listAnticheat(env,{userId:uid||null,page});}
 catch(e){
  console.error('anticheat web lookup error',String(e?.message||'').slice(0,100));
  return '<div class="page-header"><h1>Anticheat global</h1><p>No pudimos consultar D1. Revisa el estado del Worker.</p></div>';
 }
 const rows=result.entries;
 const kinds={SPEED:'Velocidad',FLY:'Vuelo',TELEPORT:'Teletransporte',VOID:'Void',AUTO_KICK:'Expulsión automática',AUTO_BAN:'Baneo automático'};
 const tr=rows.map(x=>{
   const kind=kinds[String(x.kind).toUpperCase()]||x.kind;
   return '<tr><td><strong>'+escapeHTML(x.username)+'</strong><div class="subtle">'+escapeHTML(x.userId)+'</div></td>'+
     '<td><span style="background:#3a1d2d;border:1px solid #804156;border-radius:8px;padding:5px 8px">'+escapeHTML(kind)+'</span></td>'+
     '<td title="'+escapeHTML(x.reason)+'">'+escapeHTML(x.reason)+'</td>'+
     '<td style="font-weight:800;color:#f3a2b9">'+number(x.strikes)+'</td>'+
     '<td title="'+escapeHTML(x.serverJobId)+'"><code>'+escapeHTML(String(x.serverJobId).slice(0,13))+'…</code></td>'+
     '<td>'+escapeHTML(x.createdAt)+' UTC</td></tr>';
 }).join('');
 return '<div class="page-header"><span class="eyebrow">SEGURIDAD / ROBLOX</span><h1>Anticheat global</h1>'+
    '<p>Detecciones enviadas por todos los servidores de PESADILLA PVP. Son señales registradas, no pruebas definitivas de trampas.</p></div>'+
    '<div class="cards"><div class="card"><span class="eyebrow">EVENTOS EN ESTA PÁGINA</span><h2>'+rows.length+'</h2><p>Máximo 50 resultados por página</p></div>'+
    '<div class="card"><span class="eyebrow">ALCANCE</span><h2>Global</h2><p>Todos los servidores Roblox</p></div>'+
    '<div class="card"><span class="eyebrow">CONSULTA ACTUAL</span><h2 style="font-size:17px">'+escapeHTML(uid||'Todos los jugadores')+'</h2><p>Filtro por UserId</p></div></div>'+
    '<section class="panel-section"><div class="panel-title"><h3>Registro de detecciones</h3><p>Busca un jugador o consulta el feed completo.</p></div>'+
    '<form method="get" action="/anticheat" class="grid" style="align-items:end;margin-bottom:18px"><label class="field">UserId del jugador<input name="userId" inputmode="numeric" placeholder="Buscar por UserId" value="'+escapeHTML(uid)+'"></label><div><button type="submit">Buscar</button> <a href="/anticheat" style="margin-left:10px">Mostrar todos</a></div></form>'+
    '<div style="overflow-x:auto"><table><thead><tr><th>Jugador</th><th>Detección</th><th>Motivo</th><th>Strikes</th><th>Servidor</th><th>Fecha</th></tr></thead><tbody>'+
    (tr||'<tr><td colspan="6" style="text-align:center;padding:38px;color:#bb9bab">Todavía no hay detecciones para esta consulta.</td></tr>')+
    '</tbody></table></div>'+
    '<nav aria-label="Páginas de detecciones" style="display:flex;gap:20px;margin-top:22px;align-items:center"><span class="subtle">Página '+page+'</span>'+
    (page>1?'<a href="'+escapeHTML(link(page-1,uid))+'">← Anterior</a>':'')+
    (result.hasMore?'<a href="'+escapeHTML(link(page+1,uid))+'">Siguiente →</a>':'')+'</nav></section>'+
    '<div class="notice">La persistencia global requiere que el script anticheat del servidor publique sus eventos mediante POST /api/ingest/anticheat. Este historial no sincroniza automáticamente los strikes en memoria ni aplica sanciones por sí mismo.</div>';
}
