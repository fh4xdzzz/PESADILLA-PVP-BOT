const { prisma } = require('../db.js');
const { log } = require('../logger.js');

async function createCase(input) {
  return prisma.case.create({
    data: {
      type: input.type,
      subjectId: input.subjectId,
      subjectName: input.subjectName ?? null,
      actorId: input.actorId,
      actorTag: input.actorTag ?? null,
      guildId: input.guildId ?? null,
      publicReason: input.publicReason,
      privateNote: input.privateNote ?? null,
      evidence: input.evidence ?? null,
      durationSec: input.durationSec ?? null,
      expiresAt: input.expiresAt ?? null,
      robloxRestrictionId: input.robloxRestrictionId ?? null,
      propagateAlts: input.propagateAlts ?? false,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
    },
  });
}

async function getCaseByNumber(caseNumber) {
  return prisma.case.findUnique({ where: { caseNumber } });
}

async function listCasesForSubject(subjectId, limit = 10) {
  return prisma.case.findMany({
    where: { subjectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function listActiveBans(subjectId) {
  return prisma.case.findMany({
    where: {
      type: 'ROBLOX_BAN',
      status: 'ACTIVE',
      ...(subjectId ? { subjectId } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

async function updateCaseStatus(caseId, status, extra) {
  return prisma.case.update({
    where: { id: caseId },
    data: { status, ...(extra || {}) },
  });
}

async function addWarn(caseId, subjectId, subjectName, reason, actorId) {
  return prisma.warn.create({
    data: { caseId, subjectId, subjectName: subjectName ?? null, reason, actorId },
  });
}

async function listWarns(subjectId) {
  return prisma.warn.findMany({ where: { subjectId }, orderBy: { createdAt: 'desc' }, take: 20 });
}

async function countWarns(subjectId) {
  return prisma.warn.count({ where: { subjectId } });
}

async function expireStaleCases() {
  const res = await prisma.case.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  if (res.count > 0) log.info({ count: res.count }, 'Casos expirados marcados');
  return res.count;
}

module.exports = {
  createCase,
  getCaseByNumber,
  listCasesForSubject,
  listActiveBans,
  updateCaseStatus,
  addWarn,
  listWarns,
  countWarns,
  expireStaleCases,
};
