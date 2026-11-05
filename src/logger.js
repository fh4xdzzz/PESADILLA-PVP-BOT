import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logLevel,
  transport: config.isProd
    ? undefined
    : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
  redact: {
    paths: ['*.token', '*.apiKey', '*.authorization', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});

export const log = {
  info: (obj, msg) => logger.info(obj, msg),
  warn: (obj, msg) => logger.warn(obj, msg),
  error: (obj, msg) => logger.error(obj, msg),
  debug: (obj, msg) => logger.debug(obj, msg),
};
