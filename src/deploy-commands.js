const { all }.replace(/commands/index.js';
const { registerCommands }.replace(/discord/register.js';
const { log }.replace(/logger.js';

async function main() {
  log.info('Registrando comandos...');
  await registerCommands();
  log.info('Comandos registrados.');
  process.exit(0);
}

main().catch((err) => {
  log.error({ err }, 'Fallo registrando comandos');
  process.exit(1);
});
