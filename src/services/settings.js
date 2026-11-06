const { prisma } = require('../db.js');
const { audit } = require('../core/audit.js');
const { log } = require('../logger.js');

async function getSetting(key) {
  const row = await prisma.botSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key, value, actorId) {
  await prisma.botSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: actorId ?? null },
    update: { value, updatedBy: actorId ?? null },
  });
  await audit({ actorId: actorId ?? 'system', action: 'config.update', targetType: 'setting', targetId: key, metadata: { value } });
}

const CHANNEL_KEYS = {
  registroModeracion: 'channel.registro-moderacion',
  registroMensajes: 'channel.registro-mensajes',
  registroEntradas: 'channel.registro-entradas',
  anuncios: 'channel.announcements',
  reglas: 'channel.rules',
  gameLink: 'channel.game-link',
  estado: 'channel.status',
  updates: 'channel.update',
  sneakPeek: 'channel.sneak-peek',
  faq: 'channel.faq',
  codes: 'channel.codes',
  boosts: 'channel.boosts',
  giveaways: 'channel.giveaways',
  polls: 'channel.polls',
  videos: 'channel.videos',
  roles: 'channel.roles',
  dailyShop: 'channel.daily-shop',
  events: 'channel.events',
  chat: 'channel.chat',
  cmds: 'channel.cmds',
  media: 'channel.media',
  trading: 'channel.trading',
  ticketPanel: 'channel.ticket',
  ticketsCategory: 'channel.tickets-category',
  panelStaff: 'channel.panel-staff',
  organizacionTorneos: 'channel.organizacion-torneos',
  incidencias: 'channel.incidencias-internas',
  comandosBot: 'channel.comandos-bot',
};

async function getChannelId(key) {
  return getSetting(key);
}

async function postToChannel(client, channelKey, payload) {
  try {
    const channelId = await getSetting(channelKey);
    if (!channelId) {
      log.debug({ channelKey }, 'Canal no configurado, se omite publicación');
      return false;
   };
    const channel = await client.channels.fetch(channelId);
    const isTextBased = channel.isTextBased?.();
    if (!isTextBased) return false;
    await channel.send(payload);
    return true;
  } catch (err) {
    log.error({ err, channelKey }, 'Error publicando en canal configurado');
    return false;
 };
}

module.exports = { getSetting, setSetting, CHANNEL_KEYS, getChannelId, postToChannel };
