import {renderShell} from './pro-ui.js';
import {configuredRobloxUser} from './replay-theater.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function replayPage(env,user,id) {
 const linked=configuredRobloxUser(env,user.id);
 let state='unknown';
 try{
  const result=await env.DB.prepare('SELECT finished FROM replay_meta WHERE match_id=?').bind(id).first();
  state=result?Number(result.finished)===1?'ready':'partial':'missing';
 }catch{state='unknown';}
 const headline=state==='ready'?'Grabación disponible':state==='partial'?'Grabación en proceso':state==='missing'?'Esta partida todavía no tiene replay':'No se pudo verificar el estado';
 const button=linked&&state==='ready'?
   '<button class="btn" id="queue-replay" type="button">▶ Abrir Replay Theater en Roblox</button>':
   '<button class="btn" disabled type="button">▶ Replay Theater no disponible</button>';
 const body=
  '<p class="eyebrow">CENTRO DE CONTROL / REPLAY THEATER</p>'+
  '<h1>Reproducir partida dentro de Roblox</h1>'+
  '<p class="lead">Partida <span class="mono">'+esc(id)+'</span> · Esta página solicita la reproducción en el motor Roblox. Ya no muestra las figuras antiguas del navegador.</p>'+
  '<section class="panel" style="max-width:800px">'+
  '<div class="paneltop"><h2>Replay Theater</h2><span class="pill'+(state==='ready'?' green':'')+'">'+esc(headline)+'</span></div>'+
  '<p>Abre PESADILLA PVP con tu cuenta administradora de Roblox. En el juego, el teatro recibirá la solicitud y abrirá el replay automáticamente cuando el servidor la recoja.</p>'+
  (linked?'<p class="subtle">Cuenta de Roblox vinculada: <strong>'+esc(linked)+'</strong></p>':
   '<div class="notice"><strong>Vinculación pendiente</strong><p>Un administrador del Worker debe configurar <code>REPLAY_ADMIN_BINDINGS</code> para vincular tu Discord con tu Roblox UserId. No se acepta un UserId elegido desde el navegador.</p></div>')+
  (state==='missing'?'<p class="subtle">No se puede reconstruir una partida anterior a la instalación del grabador.</p>':'')+
  '<p style="margin:20px 0">'+button+'</p>'+
  '<div class="notice"><strong>Cómo usarlo</strong><p>1. Pulsa abrir Replay Theater. 2. Abre PESADILLA PVP con tu cuenta admin y entra en un servidor publicado. 3. El servidor comprobará las solicitudes pendientes periódicamente. Si no se abre, pulsa F7 y pega el ID de la partida. La solicitud caduca a los 5 minutos.</p></div>'+
  '<p class="subtle" id="queue-status" role="status" aria-live="polite"></p>'+
  '<p class="subtle">Esta reconstrucción todavía puede carecer de animaciones, sonidos, efectos y cámara originales que no hayan sido grabados. No es un vídeo de la pantalla del jugador.</p>'+
  '</section><p style="margin-top:22px"><a href="/partidas" class="link">← Volver a partidas</a></p>'+
  '<script>(function(){const b=document.getElementById("queue-replay");if(!b)return;'+
   'const id='+JSON.stringify(id)+';'+
   'b.addEventListener("click",async()=>{const el=document.getElementById("queue-status");b.disabled=true;el.textContent="Enviando solicitud al servidor...";try{'+
   'const r=await fetch("/api/ingest/replay/request",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({matchId:id})});'+
   'const data=await r.json();if(!r.ok||!data.ok){el.textContent="No se pudo solicitar: "+String(data.error||r.status);return;}'+
   'el.textContent="Solicitud enviada. Entra a PESADILLA PVP con la cuenta autorizada. El Replay Theater buscará la partida durante los próximos 5 minutos.";'+
   '}catch{el.textContent="Error de red al enviar la solicitud.";}finally{b.disabled=false;}});})();</script>';
 return renderShell('Replay Theater',body,user);
}
