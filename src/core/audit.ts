import { prisma } from '../db.js';
import { log } from '../logger.js';

export interface AuditEntry {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  guildId?: string | null;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
  caseId?: string;
  ip?: string;
}

/** Registra una acción en la tabla de auditoría. Nunca lanza excepciones. */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        guildId: entry.guildId ?? null,
        success: entry.success ?? true,
        error: entry.error ?? null,
        metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : undefined,
        caseId: entry.caseId ?? null,
        ip: entry.ip ?? null,
      },
    });
  } catch (err) {
    log.error({ err, entry }, 'Fallo al escribir audit log');
  }
}
