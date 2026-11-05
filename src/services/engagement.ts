import { prisma } from '../db.js';

export async function createGiveaway(data: {
  guildId: string; channelId: string; prize: string;
  winnersCount: number; hostId: string; endsAt: Date;
}) {
  return prisma.giveaway.create({ data: { ...data, status: 'ACTIVE' } });
}

export async function getGiveaway(id: string) {
  return prisma.giveaway.findUnique({ where: { id }, include: { entries: true } });
}

export async function enterGiveaway(giveawayId: string, discordUserId: string) {
  return prisma.giveawayEntry.upsert({
    where: { giveawayId_discordUserId: { giveawayId, discordUserId } },
    create: { giveawayId, discordUserId },
    update: {},
  });
}

export async function giveawayEntryCount(giveawayId: string) {
  return prisma.giveawayEntry.count({ where: { giveawayId } });
}

export async function pickWinners(giveawayId: string, count: number): Promise<string[]> {
  const entries = await prisma.giveawayEntry.findMany({
    where: { giveawayId },
    select: { discordUserId: true },
  });
  // Fisher-Yates parcial
  const pool = entries.map((e) => e.discordUserId);
  const winners: string[] = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

export async function endGiveaway(id: string, winners: string[]) {
  return prisma.giveaway.update({
    where: { id },
    data: { status: 'ENDED', winners: JSON.parse(JSON.stringify(winners)) },
  });
}

export async function activeGiveaways() {
  return prisma.giveaway.findMany({ where: { status: 'ACTIVE' }, include: { entries: { select: { discordUserId: true } } } });
}

export async function getActiveTournament(guildId: string) {
  return prisma.tournament.findFirst({
    where: { guildId, status: { in: ['REGISTRATION', 'IN_PROGRESS'] } },
    include: { participants: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTournament(data: { guildId: string; name: string; maxPlayers: number; createdBy: string }) {
  return prisma.tournament.create({ data });
}

export async function registerParticipant(tournamentId: string, data: { discordUserId?: string; robloxUserId?: string; ign?: string }) {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.status !== 'REGISTRATION') throw new Error('El torneo no está en fase de registro.');
  if (t.maxPlayers && t.participants.length >= t.maxPlayers) throw new Error('El torneo está lleno.');
  return prisma.tournamentParticipant.create({ data: { tournamentId, ...data } });
}
