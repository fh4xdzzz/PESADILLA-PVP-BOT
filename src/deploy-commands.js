import { REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
import { commands } from './commands.js';

validateConfig();

const rest = new REST().setToken(config.discordToken);

const route = config.discordGuildId
  ? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
  : Routes.applicationCommands(config.discordClientId);

await rest.put(route, { body: commands });
console.log('Comandos registrados.');
