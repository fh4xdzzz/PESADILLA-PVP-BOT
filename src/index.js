const { createClient } = require('./discord/client.js');
const { registerCommands } = require('./discord/register.js');
const { connectDb, disconnectDb } = require('./db.js');
const { handleInteraction } = require('./commands/interactionHandler.js');
const { config, validateConfig } = require('./config.js');
const { log } = require('./logger.js');

async function main() {
  log.info('Iniciando PESADILLA PVP BOT v2 (JavaScript)...');
  validateConfig();
  await connectDb();

  const client = createClient();

  client.once('clientReady', async () => {
    log.info('Registrando comandos...');
    await registerCommands();
  });

  client.on('interactionCreate', handleInteraction);

  client.on('guildMemberAdd', async (member) => {
    try {
      await member.send({
        embeds: [
          {
            color: 0x7c3aed,
            title: '👋 Bienvenido a PESADILLA PVP',
            description: 'Lee las reglas en el canal 📜rules y enlaza tu cuenta de Roblox con `/vincular`.',
            footer: { text: 'PESADILLA PVP • BOT OFICIAL' },
          },
        ],
      }).catch(() => {});
    } catch (err) {
      log.debug({ err, userId: member.id }, 'No se pudo enviar DM de bienvenida');
   };
  });

  await client.login(config.discord.token);
}

main().catch((err) => {
  log.error({ err }, 'Fallo fatal al iniciar el bot');
  process.exit(1);
});

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, async () => {
    log.info('Señal de terminación recibida, cerrando...');
    await disconnectDb();
    process.exit(0);
  });
});
