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
  info: (obj: object | string, msg?: string) => logger.info(obj, msg),
  warn: (obj: object | string, msg?: string) => logger.warn(obj, msg),
  error: (obj: object | string, msg?: string) => logger.error(obj, msg),
  debug: (obj: object | string, msg?: string) => logger.debug(obj, msg),
};
