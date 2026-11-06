const pino = require('pino');
const { config } = require('./config.js');

module.exports = {
  logger: pino({
    level: config.logLevel,
    transport: config.isProd
      ? undefined
      : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    redact: {
      paths: ['*.token', '*.apiKey', '*.authorization', 'req.headers.authorization'],
      censor: '[REDACTED]',
    },
  }),
  log: {
    info: (obj, msg) => module.exports.logger.info(obj, msg),
    warn: (obj, msg) => module.exports.logger.warn(obj, msg),
    error: (obj, msg) => module.exports.logger.error(obj, msg),
    debug: (obj, msg) => module.exports.logger.debug(obj, msg),
  },
};
