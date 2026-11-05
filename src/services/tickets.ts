import { prisma } from '../db.js';

export async function createTicket(data: {
  guildId: string; ownerId: string; category: string; subject: string;
  channelId?: string; robloxUserId?: string;
}) {
  // Mapear string de categoría a enum
  const catMap: Record<string, 'REPORT_PLAYER' | 'APPEAL_BAN' | 'TECHNICAL' | 'REWARD_CLAIM' | 'GENERAL' | 'CONTACT_ADMIN'> = {
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

export async function getTicketByChannel(channelId: string) {
  return prisma.ticket.findFirst({ where: { channelId, status: { not: 'CLOSED' } } });
}

export async function getTicketById(id: string) {
  return prisma.ticket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } } });
}

export async function claimTicket(ticketId: string, staffId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CLAIMED', assigneeId: staffId, claimedAt: new Date() },
  });
}

export async function closeTicket(ticketId: string, closedBy: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'CLOSED', closedAt: new Date(), closedBy },
  });
}

export async function reopenTicket(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'OPEN', closedAt: null, closedBy: null, assigneeId: null },
  });
}

export async function addTicketMessage(ticketId: string, authorId: string, authorTag: string, isStaff: boolean, content: string) {
  return prisma.ticketMessage.create({ data: { ticketId, authorId, authorTag, isStaff, content } });
}

export async function userOpenTickets(ownerId: string, guildId: string) {
  return prisma.ticket.findMany({
    where: { ownerId, guildId, status: { not: 'CLOSED' } },
    orderBy: { createdAt: 'desc' },
  });
}
