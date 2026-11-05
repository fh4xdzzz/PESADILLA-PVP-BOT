const { prisma } = require('../db.js');

async function createGiveaway(data) {
  return prisma.giveaway.create({ data: { ...data, status: 'ACTIVE' } });
}

async function getGiveaway(id) {
  return prisma.giveaway.findUnique({ where: { id }, include: { entries: true } });
}

async function enterGiveaway(giveawayId, discordUserId) {
  return prisma.giveawayEntry.upsert({
    where: { giveawayId_discordUserId: { giveawayId, discordUserId } },
    create: { giveawayId, discordUserId },
    update: {},
  });
}

async function giveawayEntryCount(giveawayId) {
  return prisma.giveawayEntry.count({ where: { giveawayId } });
}

async function pickWinners(giveawayId, count) {
  const entries = await prisma.giveawayEntry.findMany({
    where: { giveawayId },
    select: { discordUserId: true },
  });
  const pool = entries.map((e) => e.discordUserId);
  const winners = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

async function endGiveaway(id, winners) {
  return prisma.giveaway.update({
    where: { id },
    data: { status: 'ENDED', winners: JSON.parse(JSON.stringify(winners)) },
  });
}

async function activeGiveaways() {
  return prisma.giveaway.findMany({ where: { status: 'ACTIVE' }, include: { entries: { select: { discordUserId: true } } } });
}

async function getActiveTournament(guildId) {
  return prisma.tournament.findFirst({
    where: { guildId, status: { in: ['REGISTRATION', 'IN_PROGRESS'] } },
    include: { participants: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function createTournament(data) {
  return prisma.tournament.create({ data });
}

async function registerParticipant(tournamentId, data) {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.status !== 'REGISTRATION') throw new Error('El torneo no está en fase de registro.');
  if (t.maxPlayers && t.participants.length >= t.maxPlayers) throw new Error('El torneo está lleno.');
  return prisma.tournamentParticipant.create({ data: { tournamentId, ...data } });
}

module.exports = {
  createGiveaway,
  getGiveaway,
  enterGiveaway,
  giveawayEntryCount,
  pickWinners,
  endGiveaway,
  activeGiveaways,
  getActiveTournament,
  createTournament,
  registerParticipant,
};
