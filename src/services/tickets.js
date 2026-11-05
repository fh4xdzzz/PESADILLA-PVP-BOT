const { prisma } = require('../db.js');

async function createTicket(data) {
  const catMap = {
    report_player: 'REPORT_PLAYER', appeal_ban: 'APPEAL_BAN', technical: 'TECHNICAL',
    reward_claim: 'REWARD_CLAIM', general: 'GENERAL', contact_admin: 'CONTACT_ADMIN',
  };
  return prisma.ticket.create({
    data: {
      guildId: data.guildId,
      ownerId: data.ownerId,
      category: catMap[data.category] ?? 'GENERAL',
      subject: data.subject,
      channelId: data.channelId ?? null,
      robloxUserId: data.robloxUserId ?? null,
    },
  });
}

async function getTicketByChannel(channelId) {
  return prisma.ticket.findFirst({ where: { channelId, status: { not: 'CLOSED' } } });
}

async function getTicketById(id) {
  return prisma.ticket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } } });
}

async function claimTicket(ticketId, staffId) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CLAIMED', assigneeId: staffId, claimedAt: new Date() },
  });
}

async function closeTicket(ticketId, closedBy) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CLOSED', closedAt: new Date(), closedBy },
  });
}

async function reopenTicket(ticketId) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'OPEN', closedAt: null, closedBy: null, assigneeId: null },
  });
}

async function addTicketMessage(ticketId, authorId, authorTag, isStaff, content) {
  return prisma.ticketMessage.create({ data: { ticketId, authorId, authorTag, isStaff, content } });
}

async function userOpenTickets(ownerId, guildId) {
  return prisma.ticket.findMany({
    where: { ownerId, guildId, status: { not: 'CLOSED' } },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = {
  createTicket,
  getTicketByChannel,
  getTicketById,
  claimTicket,
  closeTicket,
  reopenTicket,
  addTicketMessage,
  userOpenTickets,
};
