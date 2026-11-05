import { prisma } from '../db.js';
import type { CaseType, CaseStatus } from '@prisma/client';
import { log } from '../logger.js';

export interface CreateCaseInput {
  type: CaseType;
  subjectId: string;
  subjectName?: string;
  actorId: string;
  actorTag?: string;
  guildId?: string | null;
  publicReason: string;
  privateNote?: string;
  evidence?: string;
  durationSec?: number | null;
  expiresAt?: Date | null;
  robloxRestrictionId?: string;
  propagateAlts?: boolean;
  metadata?: Record<string, unknown>;
}

export async function createCase(input: CreateCaseInput) {
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

export async function getCaseByNumber(caseNumber: number) {
  return prisma.case.findUnique({ where: { caseNumber } });
}

export async function listCasesForSubject(subjectId: string, limit = 10) {
  return prisma.case.findMany({
    where: { subjectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listActiveBans(subjectId?: string) {
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

export async function updateCaseStatus(caseId: string, status: CaseStatus, extra?: Record<string, unknown>) {
  return prisma.case.update({
    where: { id: caseId },
    data: { status, ...(extra as object) },
  });
}

export async function addWarn(caseId: string | null, subjectId: string, subjectName: string | undefined, reason: string, actorId: string) {
  return prisma.warn.create({
    data: { caseId, subjectId, subjectName: subjectName ?? null, reason, actorId },
  });
}

export async function listWarns(subjectId: string) {
  return prisma.warn.findMany({ where: { subjectId }, orderBy: { createdAt: 'desc' }, take: 20 });
}

export async function countWarns(subjectId: string): Promise<number> {
  return prisma.warn.count({ where: { subjectId } });
}

/** Marca casos ACTIVE cuya expiración ya pasó (para jobs programados). */
export async function expireStaleCases(): Promise<number> {
  const res = await prisma.case.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  if (res.count > 0) log.info({ count: res.count }, 'Casos expirados marcados');
  return res.count;
}
