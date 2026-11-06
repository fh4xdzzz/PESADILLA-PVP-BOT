const { prisma } = require('../db.js');
const { log } = require('../logger.js');

async function audit(entry) {
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
 };
}

module.exports = { audit };
