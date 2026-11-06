import { renderShell } from './pro-ui.js';
import { getReplay } from './replay-api.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function replayPage(env,user,id){
 const data=await getReplay(env,id);
 if(data.error)return renderShell('Replay 3D','<h1>Replay no disponible</h1><p class="lead">'+(data.error==='not_recorded'?'No existe grabación de esta partida. Las anteriores a la instalación del grabador no pueden reconstruirse.':'No se pudo cargar el replay.')+'</p><a class="link" href="/partidas">← Volver a partidas</a>',user);
 const encoded=JSON.stringify(data).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
 const complete=data.complete?'Grabación completa':'Grabación parcial';
 const body=
 '<p class="eyebrow">CENTRO DE CONTROL / REPLAY 3D</p><h1>Reproducción de partida</h1>'+
 '<p class="lead">Partida <span class="mono">'+esc(id)+'</span> · Reconstrucción con posiciones reales guardadas por Roblox.</p>'+
 '<section class="panel"><div class="paneltop"><h2>Visor 3D interactivo</h2><span class="pill'+(data.complete?' green':'')+'">'+complete+'</span></div>'+
 '<div style="position:relative;background:#070b12;border:1px solid #48303d;border-radius:12px;overflow:hidden">'+
 '<canvas id="replay3d" style="width:100%;height:min(58vw,550px);min-height:300px;display:block;touch-action:none" aria-label="Visor 3D"></canvas>'+
 '<div style="position:absolute;top:12px;left:14px;color:#f6dde4;font-size:12px;background:#100e14d9;padding:8px 11px;border-radius:8px">Arrastra para rotar · Rueda para zoom</div>'+
 '<div id="names" style="position:absolute;right:12px;top:12px;background:#100e14dd;padding:10px;border-radius:9px;font-size:12px;max-width:30%"></div></div>'+
 '<div style="padding-top:20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">'+
 '<button class="btn" type="button" id="toggle">▶ Reproducir</button>'+
 '<input id="timeline" type="range" min="0" max="1000" value="0" aria-label="Línea de tiempo" style="flex:1;min-width:140px;accent-color:#ed4f6b"/>'+
 '<span class="mono" id="clock">00:00 / 00:00</span>'+
 '<label class="subtle" for="speed">Velocidad</label>'+
 '<select id="speed" style="background:#241921;color:white;border:1px solid #573645;border-radius:7px;padding:9px"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></div>'+
 '<p class="subtle">Versión inicial: reproduce movimientos y orientación en 3D. No es vídeo y aún no incluye armas, disparos, animaciones o el mapa original.</p></section>'+
 '<p style="margin-top:20px"><a class="link" href="/partidas">← Volver al historial</a></p>'+
 '<script>window.REPLAY_DATA='+encoded+';</script><script src="/assets/replay-client.js" defer></script>';
 return renderShell('Replay 3D',body,user);
}
