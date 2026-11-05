import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from '../config.js';
import { log } from '../logger.js';

export function createClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // necesario para antispam/moderación de chat
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message],
    // FailIfNotExists para detectar interacciones expiradas limpiamente
    failIfNotExists: false,
  });

  client.on('error', (err) => log.error({ err }, 'Discord client error'));
  client.on('warn', (msg) => log.warn({ msg }, 'Discord client warn'));

  client.once('clientReady', (c) => {
    log.info({ tag: c.user.tag, id: c.user.id, guilds: c.guilds.cache.size }, 'Bot conectado a Discord');
  });

  return client;
}

export { config };
