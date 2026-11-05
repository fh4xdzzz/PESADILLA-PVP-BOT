import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { config, validateConfig } from './config.js';
import { commands } from './commands.js';
import { handleInteraction } from './handlers.js';

validateConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('clientReady', async () => {
  console.log(`[bot] Conectado como ${client.user.tag}`);

  const rest = new REST().setToken(config.discordToken);
  try {
    if (config.discordGuildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId),
        { body: commands },
      );
      console.log('[bot] Comandos registrados en el servidor (guild).');
    } else {
      await rest.put(
        Routes.applicationCommands(config.discordClientId),
        { body: commands },
      );
      console.log('[bot] Comandos registrados globalmente (pueden tardar ~1h en aparecer).');
    }
  } catch (err) {
    console.error('[bot] Error registrando comandos:', err);
  }

  if (config.adminUserIds.size === 0) {
    console.warn('[bot] AVISO: ADMIN_USER_IDS está vacío, nadie podrá usar los comandos.');
  }
});

client.on('interactionCreate', handleInteraction);

client.on('error', (err) => console.error('[client] error:', err));

client.login(config.discordToken);
