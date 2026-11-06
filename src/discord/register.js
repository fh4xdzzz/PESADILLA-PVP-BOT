const { REST, Routes } = require('discord.js');
const { config } = require('../config.js');
const { all } = require('../commands/index.js');
const { log } = require('../logger.js');

async function registerCommands(clientId = config.discord.clientId, token = config.discord.token) {
  const body = all.map((b) => b.toJSON());
  const rest = new REST().setToken(token);

  const guildIds = [config.discord.supportGuildId, config.discord.mainGuildId].filter(Boolean);

  if (guildIds.length === 0) {
    await rest.put(Routes.applicationCommands(clientId), { body });
    log.info({ count: body.length }, 'Comandos registrados globalmente');
    return;
 };

  for (const guildId of guildIds) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    log.info({ guildId, count: body.length }, 'Comandos registrados en guild');
 };
}

module.exports = { registerCommands };
