import { prisma } from '../db.js';
import { createHash, randomInt } from 'node:crypto';
import { config } from '../config.js';
import { log } from '../logger.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos

export function generateLinkCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `PVP-${code}`;
}

/** Crea un código de vinculación Discord→Roblox (expira en 10 min). */
export async function createLinkCode(discordUserId: string) {
  // Invalidar códigos previos del usuario
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

/**
 * Valida un código introducido desde Roblox (por el jugador en el juego).
 * Devuelve el discordUserId vinculado o null si es inválido/expirado/usado.
 */
export async function consumeLinkCode(code: string, robloxUserId: string, robloxName?: string) {
  const normalized = code.trim().toUpperCase();
  const record = await prisma.linkCode.findUnique({ where: { code: normalized } });

  if (!record || record.used || record.expiresAt < new Date()) {
    return null;
  }

  // Marcar como usado de forma atómica
  const updated = await prisma.linkCode.updateMany({
    where: { id: record.id, used: false },
    data: { used: true, robloxUserId },
  });
  if (updated.count === 0) return null;

  // Crear/actualizar el vínculo
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

export async function getLinkByDiscord(discordUserId: string) {
  return prisma.playerLink.findUnique({ where: { discordUserId } });
}

export async function getLinkByRoblox(robloxUserId: string) {
  return prisma.playerLink.findUnique({ where: { robloxUserId } });
}

export async function removeLink(discordUserId: string) {
  return prisma.playerLink.deleteMany({ where: { discordUserId } });
}

/** Hash de verificación para endpoints del juego (sin exponer userIds). */
export function verificationToken(robloxUserId: string): string {
  return createHash('sha256').update(`${robloxUserId}:${config.linkSecret}`).digest('hex').slice(0, 24);
}

export function verifyToken(robloxUserId: string, token: string): boolean {
  return verificationToken(robloxUserId) === token;
}
