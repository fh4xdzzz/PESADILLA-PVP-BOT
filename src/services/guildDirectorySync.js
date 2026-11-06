const {config}=require('../config.js');
const {log}=require('../logger.js');
const base=process.env.DASHBOARD_BASE_URL;
const secret=process.env.BOT_CONFIG_SYNC_SECRET;
async function publishGuildDirectory(client){
 if(!base||!secret||secret.length<32)return false;
 try{
  const guilds=[];
  for(const guild of client.guilds.cache.values()){
   let channels,roles;
   try{[channels,roles]=await Promise.all([guild.channels.fetch(),guild.roles.fetch()]);}
   catch(err){log.warn({guildId:guild.id,error:String(err?.message||err)},'No se pudo obtener un directorio Discord');continue;}
   const kind=guild.id===config.discord.mainGuildId?'main':guild.id===config.discord.supportGuildId?'support':'other';
   guilds.push({
    id:guild.id,name:guild.name,kind,memberCount:guild.memberCount||0,
    channels:[...channels.values()].filter(c=>c&&[0,2,4,5,13,15,16].includes(c.type))
      .map(c=>({id:c.id,name:c.name,type:c.type,parentId:c.parentId||null})),
    roles:[...roles.values()].filter(r=>r).map(r=>({id:r.id,name:r.name,position:r.position}))
   });
  }
  const resp=await fetch(new URL('/api/sync/discord/guilds',base),{method:'POST',
   headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},
   body:JSON.stringify({guilds}),signal:AbortSignal.timeout(13000)});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  log.info({guilds:guilds.length},'Comunidades y canales sincronizados con dashboard');
  return true;
 }catch(e){log.warn({error:String(e?.message||e)},'No se pudo publicar el directorio Discord');return false;}
}
function startGuildDirectorySync(client){
 const refresh=()=>publishGuildDirectory(client).catch(()=>{});
 refresh();
 const timer=setInterval(refresh,120000);timer.unref?.();
 client.on('guildCreate',refresh);
 client.on('guildDelete',refresh);
 client.on('channelCreate',refresh);
 client.on('channelDelete',refresh);
 client.on('channelUpdate',refresh);
 client.on('roleCreate',refresh);
 client.on('roleDelete',refresh);
}
module.exports={publishGuildDirectory,startGuildDirectorySync};
