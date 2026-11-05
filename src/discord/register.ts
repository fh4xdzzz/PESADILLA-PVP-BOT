import { REST, Routes } from 'discord.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import { config } from '../config.js';
import { commandBuilders } from './commands/index.js';
import { log } from '../logger.js';

export async function registerCommands(clientId = config.discord.clientId, token = config.discord.token): Promise<void> {
  const body = commandBuilders.map((b) => b.toJSON()) as RESTPostAPIChatInputApplicationCommandsJSONBody[];
  const rest = new REST().setToken(token);

  const guildIds = [config.discord.supportGuildId, config.discord.mainGuildId].filter(Boolean);

  if (guildIds.length === 0) {
    await rest.put(Routes.applicationCommands(clientId), { body });
    log.info({ count: body.length }, 'Comandos registrados globalmente');
    return;
  }

  for (const guildId of guildIds) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    log.info({ guildId, count: body.length }, 'Comandos registrados en guild');
  }
}
