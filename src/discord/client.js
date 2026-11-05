const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { config } = require('../config.js');
const { log } = require('../logger.js');

function createClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message],
    failIfNotExists: false,
  });

  client.on('error', (err) => log.error({ err }, 'Discord client error'));
  client.on('warn', (msg) => log.warn({ msg }, 'Discord client warn'));

  client.once('clientReady', (c) => {
    log.info({ tag: c.user.tag, id: c.user.id, guilds: c.guilds.cache.size }, 'Bot conectado a Discord');
  });

  return client;
}

module.exports = { createClient, config };
