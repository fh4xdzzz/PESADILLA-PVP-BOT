const { prisma } = require('../db.js');
const { config } = require('../config.js');
const { log } = require('../logger.js');
const { randomInt } = require('crypto');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TTL_MS = 10 * 60 * 1000;

function generateLinkCode() {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return `PVP-${code}`;
}

async function createLinkCode(discordUserId) {
  await prisma.linkCode.updateMany({
    where: { discordUserId, used: false },
    data: { used: true },
  });
  return prisma.linkCode.create({
    data: {
      code: generateLinkCode(),
      discordUserId,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
}

async function consumeLinkCode(code, robloxUserId, robloxName) {
  const normalized = code.trim().toUpperCase();
  const record = await prisma.linkCode.findUnique({ where: { code: normalized } });

  if (!record || record.used || record.expiresAt < new Date()) {
    return null;
 };

  const updated = await prisma.linkCode.updateMany({
    where: { id: record.id, used: false },
    data: { used: true, robloxUserId },
  });
  if (updated.count === 0) return null;

  await prisma.playerLink.upsert({
    where: { discordUserId: record.discordUserId },
    create: {
      discordUserId: record.discordUserId,
      robloxUserId,
      robloxName: robloxName ?? null,
    },
    update: { robloxUserId, robloxName: robloxName ?? null, verifiedAt: new Date() },
  });

  return record.discordUserId;
}

async function getLinkByDiscord(discordUserId) {
  return prisma.playerLink.findUnique({ where: { discordUserId } });
}

async function getLinkByRoblox(robloxUserId) {
  return prisma.playerLink.findUnique({ where: { robloxUserId } });
}

async function removeLink(discordUserId) {
  return prisma.playerLink.deleteMany({ where: { discordUserId } });
}

const { createHash } = require('crypto');

function verificationToken(robloxUserId) {
  return createHash('sha256').update(`${robloxUserId}:${config.linkSecret}`).digest('hex').slice(0, 24);
}

function verifyToken(robloxUserId, token) {
  return verificationToken(robloxUserId) === token;
}

module.exports = {
  createLinkCode,
  consumeLinkCode,
  getLinkByDiscord,
  getLinkByRoblox,
  removeLink,
  verificationToken,
  verifyToken,
};
