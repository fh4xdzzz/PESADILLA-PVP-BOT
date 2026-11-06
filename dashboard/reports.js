import { renderShell } from './pro-ui.js';
import { icon } from './lucide-icons.js';

const categories = Object.freeze({
  cheating:'Trampas / hacks',
  exploiting:'Exploits',
  harassment:'Acoso / insultos',
  griefing:'Conducta antideportiva',
  other:'Otro'
});
const statuses = Object.freeze({open:'Abierto',in_review:'En revisión',resolved:'Resuelto',dismissed:'Descartado'});
const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validRobloxId = v => typeof v === 'string' && /^[1-9]\d{0,19}$/.test(v);
const validReportId = v => typeof v === 'string' && /^[a-zA-Z0-9:_-]{1,100}$/.test(v);
const json = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const csrfBytes = new TextEncoder();
async function csrfToken(session,secret) {
 const key=await crypto.subtle.importKey('raw',csrfBytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,csrfBytes.encode('report-action:'+session)));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function equal(a,b) {
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||a.length>512) return false;
 let diff=0; for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
function errorPage(message) {return '<section class="panel"><h2>No se pudo completar la operación</h2><p class="subtle">'+escapeHtml(message)+'</p><a class="link" href="/reportes">Volver a reportes</a></section>';}
function badge(status) {return '<span class="pill'+(status==='resolved'?' green':'')+'">'+escapeHtml(statuses[status]||status)+'</span>';}
function formatDate(value) {const d=new Date(value);return Number.isNaN(d.getTime())?escapeHtml(value):escapeHtml(new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(d)+' UTC');}
function title(text,desc) {return '<p class="eyebrow">MODERACIÓN / ROBLOX</p><h1>'+escapeHtml(text)+'</h1><p class="lead">'+escapeHtml(desc)+'</p>';}
function parseDescription(raw) {
 const index=String(raw||'').indexOf(' | ');
 if(index===-1) return {category:'Reporte',description:String(raw||'')};
 const key=String(raw).slice(0,index);
 return {category:categories[key]||'Reporte',description:String(raw).slice(index+3)};
}
async function getReport(db,id) {return db.prepare('SELECT report_id,reporter_user_id,target_user_id,reason,evidence_url,status,created_at FROM reports WHERE report_id=?').bind(id).first();}
export async function ingestReport(request,env) {
 if(!env.DB||typeof env.ROBLOX_INGEST_SECRET!=='string'||env.ROBLOX_INGEST_SECRET.length<32)return json({error:'not_configured'},503);
 const authorization=request.headers.get('authorization')||'';
 if(!equal(authorization,'Bearer '+env.ROBLOX_INGEST_SECRET))return json({error:'unauthorized'},401);
 if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json({error:'json_required'},415);
 if(Number(request.headers.get('content-length')||0)>4096)return json({error:'too_large'},413);
 const raw=await request.text();if(raw.length>4096)return json({error:'too_large'},413);
 let body;try{body=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
 if(!body || !validReportId(body.reportId) || !validRobloxId(String(body.reporterUserId??'')) ||
    !validRobloxId(String(body.targetUserId??'')) || String(body.reporterUserId)===String(body.targetUserId) ||
    !Object.hasOwn(categories,body.category) || typeof body.description!=='string' || body.description.trim().length<5 ||
    body.description.length>240 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body.description) ||
    body.filtered!==true) return json({error:'invalid_report'},400);
 const reporter=String(body.reporterUserId),target=String(body.targetUserId);
 try {
  const old=await getReport(env.DB,body.reportId);
  if(old)return json({ok:true,duplicate:true,id:old.report_id});
  const count=await env.DB.prepare("SELECT COUNT(*) n FROM reports WHERE reporter_user_id=? AND created_at >= datetime('now','-10 minutes')").bind(reporter).first();
  if(Number(count?.n||0)>=3)return json({error:'rate_limited'},429);
  const reason=body.category+' | '+body.description.trim();
  await env.DB.prepare("INSERT INTO reports(report_id,reporter_user_id,target_user_id,reason,evidence_url,status) VALUES(?,?,?,?,NULL,'open')").bind(body.reportId,reporter,target,reason).run();
  return json({ok:true,id:body.reportId},201);
 } catch(e) {console.error('Report insert error',String(e?.message||'').slice(0,120));return json({error:'database_error'},500);}
}
export async function showReports(env,user,query) {
 if(!env.DB)return renderShell('Reportes',title('Base de datos no conectada','Comprueba el binding DB.'),user);
 const status=query.get('status')||'all';
 const permitted=status==='all'||Object.hasOwn(statuses,status);
 if(!permitted)return renderShell('Reportes',errorPage('Filtro inválido.'),user);
 const rows=await (status==='all'
  ?env.DB.prepare('SELECT report_id,reporter_user_id,target_user_id,reason,status,created_at FROM reports ORDER BY created_at DESC LIMIT 100')
  :env.DB.prepare('SELECT report_id,reporter_user_id,target_user_id,reason,status,created_at FROM reports WHERE status=? ORDER BY created_at DESC LIMIT 100').bind(status)).all();
 const items=rows.results||[];
 const tabs=['all',...Object.keys(statuses)].map(s=>'<a class="pill'+(status===s?' green':'')+'" href="/reportes?status='+s+'">'+escapeHtml(s==='all'?'Todos':statuses[s])+'</a>').join(' ');
 const table=items.length?'<div class="tablewrap"><table><thead><tr><th>Caso</th><th>Reportado</th><th>Denunciante</th><th>Motivo</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>'+
 items.map(r=>{const d=parseDescription(r.reason);return '<tr><td><a class="link mono" href="/reportes/'+encodeURIComponent(r.report_id)+'">'+escapeHtml(r.report_id.slice(0,12))+'</a></td><td class="mono">'+escapeHtml(r.target_user_id)+'</td><td class="mono">'+escapeHtml(r.reporter_user_id)+'</td><td>'+escapeHtml(d.category)+'</td><td>'+badge(r.status)+'</td><td>'+formatDate(r.created_at)+'</td></tr>';}).join('')+
 '</tbody></table></div>':'<div class="empty"><strong>No hay reportes con este estado.</strong>Los reportes aparecerán al recibirse desde Roblox.</div>';
 return renderShell('Reportes',title('Centro de reportes','Consulta denuncias enviadas desde el juego y revisa cada caso.')+'<div class="pills" style="margin-bottom:20px">'+tabs+'</div><section class="panel"><div class="paneltop"><h2>Casos · '+items.length+'</h2><span class="pill">Vista privada</span></div>'+table+'</section>',user);
}
export async function showReportDetail(env,user,id,session) {
 if(!validReportId(id))return renderShell('Reportes',errorPage('ID inválido.'),user);
 const r=await getReport(env.DB,id);
 if(!r)return renderShell('Reportes',errorPage('Caso no encontrado.'),user);
 const actions=(await env.DB.prepare("SELECT actor_discord_id,action,details_json,created_at FROM audit_logs WHERE target_id=? AND action LIKE 'report_%' ORDER BY id DESC LIMIT 30").bind(id).all()).results||[];
 const {category,description}=parseDescription(r.reason);
 const token=await csrfToken(session,env.SESSION_SECRET);
 const options=Object.entries(statuses).map(([value,label])=>'<option value="'+value+'"'+(r.status===value?' selected':'')+'>'+escapeHtml(label)+'</option>').join('');
 const evidence=r.evidence_url?'<div class="kv"><span>Evidencia</span><span>'+escapeHtml(r.evidence_url)+'</span></div>':'';
 const history=actions.map(a=>{let note='';try{note=JSON.parse(a.details_json||'{}').note||'';}catch{}return '<div class="kv"><span>'+escapeHtml(a.action)+' · '+formatDate(a.created_at)+'</span><span>'+escapeHtml(a.actor_discord_id)+(note?'<br><small>'+escapeHtml(note)+'</small>':'')+'</span></div>';}).join('')||'<p class="subtle">Todavía no hay acciones de moderadores.</p>';
 return renderShell('Reportes',title('Caso '+id.slice(0,12),'Revisa los detalles antes de cambiar el estado.')+
 '<section class="panel"><h2>Denuncia</h2><div class="kv"><span>Reportado (Roblox ID)</span><span class="mono">'+escapeHtml(r.target_user_id)+'</span></div><div class="kv"><span>Denunciante (Roblox ID)</span><span class="mono">'+escapeHtml(r.reporter_user_id)+'</span></div><div class="kv"><span>Categoría</span><span>'+escapeHtml(category)+'</span></div><div class="kv"><span>Motivo filtrado</span><span style="max-width:65%;overflow-wrap:anywhere">'+escapeHtml(description)+'</span></div><div class="kv"><span>Estado</span>'+badge(r.status)+'</div><div class="kv"><span>Creado</span><span>'+formatDate(r.created_at)+'</span></div>'+evidence+'</section>'+
 '<section class="panel" style="margin-top:18px"><h2>Administrar caso</h2><form method="post" action="/reportes/'+encodeURIComponent(id)+'/actualizar"><input type="hidden" name="csrf" value="'+token+'"><label for="status" class="subtle">Estado del caso</label><div class="search"><select name="status" id="status" required style="background:#100d12;border:1px solid #45313b;color:#fff;padding:12px;border-radius:9px">'+options+'</select></div><label for="note" class="subtle">Nota interna (opcional)</label><div class="search"><input id="note" name="note" maxlength="240" placeholder="Justificación de la revisión"></div><button class="btn" type="submit">'+icon('shield-ban')+' Guardar decisión</button></form><p class="subtle">Cambiar el estado no banea ni desbanea al usuario. Todas las decisiones quedan registradas.</p></section>'+
 '<section class="panel" style="margin-top:18px"><h2>Historial de auditoría</h2>'+history+'</section><p><a class="link" href="/reportes">← Volver a reportes</a></p>',user);
}
export async function updateReport(request,env,user,id,session) {
 if(!validReportId(id))return json({error:'invalid_id'},400);
 let origin;try{origin=new URL(request.headers.get('origin')||'').origin;}catch{return json({error:'bad_origin'},403);}
 if(origin!==new URL(env.APP_BASE_URL).origin)return json({error:'bad_origin'},403);
 if(!(request.headers.get('content-type')||'').startsWith('application/x-www-form-urlencoded'))return json({error:'bad_content_type'},415);
 const text=await request.text();if(text.length>2048)return json({error:'too_large'},413);
 const form=new URLSearchParams(text);
 const token=await csrfToken(session,env.SESSION_SECRET);
 if(!equal(form.get('csrf'),token))return json({error:'csrf_invalid'},403);
 const status=form.get('status'),note=(form.get('note')||'').trim();
 if(!Object.hasOwn(statuses,status)||note.length>240||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(note))return json({error:'invalid_input'},400);
 const current=await getReport(env.DB,id);if(!current)return json({error:'not_found'},404);
 try {
   await env.DB.batch([
    env.DB.prepare('UPDATE reports SET status=? WHERE report_id=?').bind(status,id),
    env.DB.prepare('INSERT INTO audit_logs(actor_discord_id,action,target_id,details_json) VALUES(?,?,?,?)').bind(user.id,'report_status_changed',id,JSON.stringify({from:current.status,to:status,note}))
   ]);
   return new Response(null,{status:303,headers:{Location:'/reportes/'+encodeURIComponent(id),'Cache-Control':'no-store'}});
 } catch(e) {console.error('Report update failed',String(e?.message||'').slice(0,100));return json({error:'database_error'},500);}
}
