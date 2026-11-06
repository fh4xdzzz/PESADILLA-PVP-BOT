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
  const guildTypes=json.guildTypes||{};
  // The dashboard knows which actual Discord server is the main/support one.
  if(/^\d+$/.test(String(guildTypes.main||'')))config.discord.mainGuildId=String(guildTypes.main);
  if(/^\d+$/.test(String(guildTypes.support||'')))config.discord.supportGuildId=String(guildTypes.support);
  const source=Object.keys(settings).sort().map(k=>[k,settings[k]]);
  const hash=JSON.stringify([source,config.discord.mainGuildId,config.discord.supportGuildId]);
  if(hash===lastHash)return true;
  const prefix=/^(channel\.[a-z-]+|guild\.(main|support)|welcome\.(enabled|message)|feature\.(tickets|giveaways|polls|events|automod|logs))$/;
  const scoped=/^guild\.(\d+)\.(channel\.[a-z-]+|role\.[a-z-]+|welcome\.(enabled|message)|feature\.(tickets|giveaways|polls|events|automod|logs))$/;
  for(const [key,value] of source){
   if(typeof value!=='string')continue;
   const m=key.match(scoped);
   if(m){
    if((await getSetting(key))!==value)await setSetting(key,value,'dashboard-sync');
    // Old commands reference non-scoped keys. Keep main guild compatible.
    if(m[1]===config.discord.mainGuildId && (await getSetting(m[2]))!==value)
      await setSetting(m[2],value,'dashboard-sync');
   }else if(prefix.test(key)&& (await getSetting(key))!==value){
    await setSetting(key,value,'dashboard-sync');
   }
  }
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
