const { PrismaClient } = require('@prisma/client');
const { config } = require('./config.js');
const { log } = require('./logger.js');

const globalForPrisma = globalThis;

module.exports.prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isProd ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!config.isProd) globalForPrisma.prisma = module.exports.prisma;

module.exports.connectDb = async () => {
  await module.exports.prisma.$connect();
  log.info('Base de datos conectada');
};

module.exports.disconnectDb = async () => {
  await module.exports.prisma.$disconnect();
};
