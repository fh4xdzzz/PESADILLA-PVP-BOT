// Sync Discord control center settings from Cloudflare into the bot's existing Prisma BotSetting.
// Only the bot server holds BOT_CONFIG_SYNC_SECRET; Discord users cannot query this endpoint.
const {setSetting,getSetting} = require('./settings.js');
const {log} = require('../logger.js');
const {config} = require('../config.js');

const endpoint=process.env.DASHBOARD_BASE_URL;
const token=process.env.BOT_CONFIG_SYNC_SECRET;
const WAIT=60_000;
let syncing=false;
let lastHash='';
async function syncDashboardSettings(){
 if(!endpoint||!token){return false;}
 if(syncing)return false;
 syncing=true;
 try{
  const url=new URL('/api/sync/discord',endpoint);
  const response=await fetch(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('HTTP '+response.status);
  const json=await response.json();
  if(!json||json.ok!==true||typeof json.settings!=='object'||!json.settings)throw Error('invalid_response');
  const settings=json.settings;
  // Do not reset existing settings when dashboard has not been configured.
  const source=Object.keys(settings).sort().map(k=>[k,settings[k]]);
  const hash=JSON.stringify(source);
  if(hash===lastHash)return true;
  const prefix=/^(channel\.[a-z-]+|guild\.(main|support)|welcome\.(enabled|message)|feature\.(tickets|giveaways|polls|events|automod|logs))$/;
  for(const [key,value] of source){
   if(!prefix.test(key)||typeof value!=='string')continue;
   if((await getSetting(key))!==value)await setSetting(key,value,'dashboard-sync');
  }
  if(settings['guild.main'])config.discord.mainGuildId=settings['guild.main'];
  if(settings['guild.support'])config.discord.supportGuildId=settings['guild.support'];
  lastHash=hash;
  log.info({count:source.length},'Configuración Discord sincronizada desde dashboard');
  return true;
 }catch(e){
  log.warn({err:String(e?.message||e)},'No se pudo sincronizar configuración Discord');
  return false;
 }finally{syncing=false;}
}
function startDashboardSync(){
 if(!endpoint||!token){
  log.warn('DASHBOARD_BASE_URL / BOT_CONFIG_SYNC_SECRET no configurados; configuración web no sincronizada');
  return;
 }
 syncDashboardSettings().catch(()=>{});
 const interval=setInterval(()=>syncDashboardSettings().catch(()=>{}),WAIT);
 interval.unref?.();
}
module.exports={syncDashboardSettings,startDashboardSync};
