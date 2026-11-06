import {loadGuilds} from './discord-guild-directory.js';
import {CHANNELS} from './control-center.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const ROLE_KEYS=Object.freeze({'role.owner':'Propietario','role.admin':'Administrador','role.moderator':'Moderador','role.support':'Equipo de soporte','role.member':'Miembro'});
const FEATURES=Object.freeze({'welcome.enabled':'Mensaje de bienvenida','feature.tickets':'Tickets','feature.giveaways':'Sorteos','feature.polls':'Encuestas','feature.events':'Eventos','feature.automod':'Automoderación','feature.logs':'Registros'});
const GROUPS=[
 {title:'Información y anuncios',desc:'Dónde publica tu bot las novedades y datos importantes.',keys:['channel.announcements','channel.rules','channel.game-link','channel.status','channel.updates','channel.sneak-peek','channel.faq','channel.codes']},
 {title:'Comunidad y contenido',desc:'Organiza las publicaciones, las actividades y la interacción.',keys:['channel.chat','channel.cmds','channel.media','channel.trading','channel.videos','channel.roles','channel.daily-shop','channel.events','channel.giveaways','channel.polls','channel.boosts']},
 {title:'Soporte y tickets',desc:'Define dónde recibir las consultas y organizar la atención.',keys:['channel.ticket','channel.tickets-category','channel.panel-staff','channel.incidencias-internas','channel.comandos-bot']},
 {title:'Registros y moderación',desc:'Canales privados para las acciones del equipo.',keys:['channel.registro-moderacion','channel.registro-mensajes','channel.registro-entradas','channel.organizacion-torneos']}
];
const mainGroups=[0,1,3],supportGroups=[2,3];
function channelDropdown(key,selected,channels){
 const isCategory=key==='channel.tickets-category';
 const eligible=channels.filter(c=>isCategory?c.type===4:c.type!==4);
 const groups=eligible.reduce((acc,c)=>{const parent=channels.find(a=>a.id===c.parentId);const label=parent?.name||'Otros canales';(acc[label]??=[]).push(c);return acc},{});
 let options='<option value="">Sin configurar</option>';
 for(const [group,items] of Object.entries(groups))options+='<optgroup label="'+esc(group)+'">'+items.map(c=>'<option value="'+esc(c.id)+'"'+(selected===c.id?' selected':'')+'>'+esc(c.type===4?'▣ ':'# ')+esc(c.name)+'</option>').join('')+'</optgroup>';
 if(selected&&!eligible.some(c=>c.id===selected))options='<option value="'+esc(selected)+'" selected>Canal anterior (no disponible)</option>'+options;
 return '<label class="config-field"><span>'+esc(CHANNELS[key]||key)+'</span><select name="'+esc(key)+'" aria-label="'+esc(CHANNELS[key]||key)+'">'+options+'</select></label>';
}
function roleDropdown(key,selected,roles){
 const options='<option value="">Sin configurar</option>'+roles.filter(r=>r.name!=='@everyone').sort((a,b)=>b.position-a.position).map(r=>'<option value="'+esc(r.id)+'"'+(selected===r.id?' selected':'')+'>'+esc(r.name)+'</option>').join('');
 return '<label class="config-field"><span>'+esc(ROLE_KEYS[key])+'</span><select name="'+key+'">'+options+'</select></label>';
}
function switcher(key,label,selected,desc=''){
 const checked=selected==='true';
 return '<label class="switch-line"><span><strong>'+esc(label)+'</strong>'+(desc?'<small>'+esc(desc)+'</small>':'')+'</span><span class="toggle"><input type="checkbox" name="'+esc(key)+'" value="true"'+(checked?' checked':'')+'><i></i></span></label>';
}
export async function renderGuildSettings(env,csrf,query,isOwner){
 const guilds=await loadGuilds(env.DB);
 if(!guilds.length)return '<div class="page-header"><span class="eyebrow">CONFIGURACIÓN / COMUNIDADES</span><h1>Mis comunidades</h1><p>Conecta el bot para descubrir automáticamente los servidores, canales y roles.</p></div><div class="dashboard-card empty-state"><div class="status-icon">⌁</div><h2>Esperando conexión con Discord</h2><p>Cuando el bot publique su directorio, podrás seleccionar Comunidad o Soporte. No necesitas copiar ningún ID.</p><p class="subtle">Requiere el secreto BOT_CONFIG_SYNC_SECRET en el Worker y en el hosting del bot, además del bot ejecutándose.</p></div>';
 const requested=query.get('guild');
 const chosen=guilds.find(g=>g.id===requested)||guilds.find(g=>g.kind==='main')||guilds[0];
 const stale=Date.now()-Number(chosen.updatedAt)>5*60*1000;
 const rows=(await env.DB.prepare('SELECT key,value FROM discord_settings WHERE key LIKE ?').bind('guild.'+chosen.id+'.%').all()).results||[];
 const scoped=Object.fromEntries(rows.map(r=>[r.key.slice(('guild.'+chosen.id+'.').length),r.value]));
 const communities=guilds.map(g=>{
   const active=g.id===chosen.id;
   return '<a class="guild-option'+(active?' active':'')+'" href="/discord?guild='+encodeURIComponent(g.id)+'"><span class="guild-avatar">'+esc(g.name.slice(0,1).toUpperCase())+'</span><span class="guild-info"><strong>'+esc(g.name)+'</strong><small>'+(g.kind==='main'?'Comunidad principal':g.kind==='support'?'Servidor de soporte':'Servidor conectado')+' · '+Number(g.memberCount).toLocaleString('es')+' miembros</small></span><span class="guild-arrow">›</span></a>';
 }).join('');
 const channelGroups=(chosen.kind==='support'?supportGroups:mainGroups).map(i=>{
   const section=GROUPS[i],fields=section.keys.map(key=>channelDropdown(key,scoped[key]||'',chosen.channels)).join('');
   return '<details class="setting-group"'+(i===(chosen.kind==='support'?2:0)?' open':'')+'><summary><span><strong>'+esc(section.title)+'</strong><small>'+esc(section.desc)+'</small></span><b>⌄</b></summary><div class="setting-content"><div class="form-grid">'+fields+'</div></div></details>';
 }).join('');
 const featureKeys=chosen.kind==='support'?['welcome.enabled','feature.tickets','feature.automod','feature.logs']:['welcome.enabled','feature.giveaways','feature.polls','feature.events','feature.automod','feature.logs'];
 const featureGrid=featureKeys.map(key=>switcher(key,FEATURES[key],scoped[key],key==='welcome.enabled'?'Envía una bienvenida a los miembros nuevos':'' )).join('');
 const roleFields=Object.keys(ROLE_KEYS).map(k=>roleDropdown(k,scoped[k]||'',chosen.roles)).join('');
 const kindSelect='<label class="config-field"><span>Tipo de servidor</span><select name="guildKind"><option value="main"'+(chosen.kind==='main'?' selected':'')+'>Comunidad principal</option><option value="support"'+(chosen.kind==='support'?' selected':'')+'>Servidor de soporte</option><option value="other"'+(chosen.kind==='other'?' selected':'')+'>Otro servidor</option></select></label>';
 return '<div class="page-header"><span class="eyebrow">CONFIGURACIÓN / DISCORD</span><h1>Mis comunidades</h1><p>Configura cada servidor de manera independiente. Los canales y roles vienen directamente del bot.</p></div>'+
  '<div class="guild-layout"><section class="guild-sidebar"><div class="section-heading">SERVIDORES CONECTADOS</div>'+communities+'<p class="subtle guild-foot">Los servidores aparecen automáticamente cuando el bot está conectado.</p></section>'+
  '<section class="guild-main"><div class="guild-banner"><div class="guild-avatar large">'+esc(chosen.name.charAt(0).toUpperCase())+'</div><div><span class="eyebrow">'+(chosen.kind==='support'?'SOPORTE':chosen.kind==='main'?'COMUNIDAD PRINCIPAL':'SERVIDOR DISCORD')+'</span><h2>'+esc(chosen.name)+'</h2><p>'+Number(chosen.channels.length)+' canales · '+Number(chosen.roles.length)+' roles</p></div><span class="connection-state '+(stale?'offline':'online')+'">'+(stale?'Sin actualización reciente':'Bot sincronizado')+'</span></div>'+
  (query.get('saved')==='1'?'<div class="notice success">Configuración guardada para este servidor.</div>':'')+
  (stale?'<div class="notice">Los canales podrían estar desactualizados: comprueba que el bot siga conectado.</div>':'')+
  '<form method="post" action="/discord" class="guild-form"><input type="hidden" name="csrf" value="'+esc(csrf)+'"><input type="hidden" name="guildId" value="'+esc(chosen.id)+'">'+
  '<div class="panel-section"><div class="panel-title"><h3>Funciones del bot</h3><p>Activa únicamente las funciones que quieras usar en esta comunidad.</p></div><div class="switch-grid">'+featureGrid+'</div></div>'+
  '<div class="panel-section"><div class="panel-title"><h3>Canales automáticos</h3><p>Elige canales por nombre, sin copiar identificadores.</p></div>'+channelGroups+'</div>'+
  '<div class="panel-section"><div class="panel-title"><h3>Roles y permisos</h3><p>Selecciona los roles que ya existen en este servidor.</p></div><div class="form-grid">'+roleFields+'</div></div>'+
  '<div class="panel-section"><div class="panel-title"><h3>Bienvenida</h3><p>Mensaje automático al entrar un nuevo miembro.</p></div><label class="config-field"><span>Mensaje</span><textarea name="welcome.message" rows="3" maxlength="240" placeholder="¡Bienvenido a nuestra comunidad!">'+esc(scoped['welcome.message']||'')+'</textarea></label></div>'+
  '<div class="panel-section"><div class="panel-title"><h3>Identidad de la comunidad</h3><p>Organiza tus servidores como Comunidad principal o Soporte.</p></div>'+kindSelect+'</div>'+
  '<div class="save-bar"><span>Los cambios se aplican a <strong>'+esc(chosen.name)+'</strong></span>'+(isOwner?'<button type="submit">Guardar cambios</button>':'<span>Solo el propietario puede guardar</span>')+'</div></form></section></div>'+
  '<div class="notice">Algunas funciones del bot pueden necesitar que se terminen sus comandos. El selector no activa sistemas que aún no estén implementados.</div>';
}
export async function saveGuildSettings(env,user,form){
 const guildId=form.get('guildId');
 if(!/^[1-9]\d{0,19}$/.test(guildId||''))return {error:'invalid_guild'};
 const guilds=await loadGuilds(env.DB);
 const guild=guilds.find(g=>g.id===guildId);
 if(!guild)return {error:'guild_not_connected'};
 const kind=form.get('guildKind');
 if(!['main','support','other'].includes(kind))return {error:'invalid_guild_kind'};
 const channels=new Set(guild.channels.map(c=>c.id)),roles=new Set(guild.roles.map(r=>r.id));
 const expected=[...Object.keys(CHANNELS),...Object.keys(ROLE_KEYS),'welcome.message',...Object.keys(FEATURES)];
 const statements=[];
 for(const key of expected){
  const raw=form.get(key);
  let value=raw===null?'':raw;
  if(typeof value!=='string'||value.length>240||/[\u0000-\u001f\u007f]/.test(value))return {error:'invalid_value',key};
  if(key.startsWith('channel.')&&!(!value||channels.has(value)))return {error:'channel_not_in_guild',key};
  if(key.startsWith('role.')&&!(!value||roles.has(value)))return {error:'role_not_in_guild',key};
  if(Object.hasOwn(FEATURES,key))value=value==='true'?'true':'false';
  if(key==='welcome.message'&&value.length>240)return {error:'invalid_welcome_message'};
  statements.push(env.DB.prepare('INSERT INTO discord_settings(key,value,updated_by) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').bind('guild.'+guildId+'.'+key,value,user.id));
 }
 if(kind==='main'||kind==='support')statements.push(env.DB.prepare("UPDATE discord_guild_directory SET kind='other' WHERE kind=? AND guild_id!=?").bind(kind,guildId));
 statements.push(env.DB.prepare("UPDATE discord_guild_directory SET kind=? WHERE guild_id=?").bind(kind,guildId));
 statements.push(env.DB.prepare('INSERT INTO audit_logs(actor_discord_id,action,target_id,details_json) VALUES(?,?,?,?)').bind(user.id,'discord.guild.update',guildId,JSON.stringify({kind,keys:expected})));
 await env.DB.batch(statements);
 return {ok:true,guildId};
}
