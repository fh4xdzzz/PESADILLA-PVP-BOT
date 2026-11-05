import { PrismaClient } from '@prisma/client';
import { config } from './config.js';
import { log } from './logger.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProd ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!config.isProd) globalForPrisma.prisma = prisma;

export async function connectDb(): Promise<void> {
  await prisma.$connect();
  log.info('Base de datos conectada');
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
