import { prisma } from '../db.js';
import { audit } from '../core/audit.js';
import { log } from '../logger.js';

/** Configuración dinámica persistida en BotSetting (IDs de canales, roles, textos). */
export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.botSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string, actorId?: string): Promise<void> {
  await prisma.botSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: actorId ?? null },
    update: { value, updatedBy: actorId ?? null },
  });
  await audit({ actorId: actorId ?? 'system', action: 'config.update', targetType: 'setting', targetId: key, metadata: { value } });
}

// Helpers de canales conocidos
export const CHANNEL_KEYS = {
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
} as const;

export async function getChannelId(key: string): Promise<string | null> {
  return getSetting(key);
}

/** Publica un embed en un canal configurado; si no está configurado, solo loguea. */
export async function postToChannel(
  client: { channels: { fetch(id: string): Promise<unknown> } },
  channelKey: string,
  payload: { embeds?: unknown[]; content?: string },
): Promise<boolean> {
  try {
    const channelId = await getChannelId(channelKey);
    if (!channelId) {
      log.debug({ channelKey }, 'Canal no configurado, se omite publicación');
      return false;
    }
    const channel = await client.channels.fetch(channelId);
    const ch = channel as { isTextBased(): boolean; send(p: unknown): Promise<unknown> };
    if (!ch?.isTextBased?.()) return false;
    await ch.send(payload as never);
    return true;
  } catch (err) {
    log.error({ err, channelKey }, 'Error publicando en canal configurado');
    return false;
  }
}
