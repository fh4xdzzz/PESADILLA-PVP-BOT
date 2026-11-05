import { commandBuilders } from './commands/index.js';
import { registerCommands } from './discord/register.js';
import { log } from './logger.js';

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
