import { PrismaClient } from '@prisma/client';
import { config } from './config.js';
import { log } from './logger.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProd ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!config.isProd) globalForPrisma.prisma = prisma;

export async function connectDb() {
  await prisma.$connect();
  log.info('Base de datos conectada');
}

export async function disconnectDb() {
  await prisma.$disconnect();
}
