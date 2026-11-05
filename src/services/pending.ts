/** Almacén en memoria de acciones pendientes de confirmación (TTL 5 min). */

export interface PendingAction {
  id: string;
  type: 'ROBLOX_BAN' | 'ROBLOX_UNBAN' | 'ROBLOX_KICK';
  actorId: string;
  guildId: string | null;
  channelId: string;
  userId: string;        // roblox userId
  userName: string;
  displayName?: string;
  durationSec?: number | null;
  publicReason: string;
  privateNote?: string;
  evidence?: string;
  propagateAlts?: boolean;
  caseId?: string;       // caso pre-creado (PENDING) para idempotencia
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, PendingAction>();

// Limpieza periódica
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.expiresAt < now) store.delete(k);
}, 60_000).unref();

export function setPending(action: Omit<PendingAction, 'expiresAt'>): PendingAction {
  const full: PendingAction = { ...action, expiresAt: Date.now() + TTL_MS };
  store.set(action.id, full);
  return full;
}

export function getPending(id: string): PendingAction | undefined {
  const p = store.get(id);
  if (p && p.expiresAt < Date.now()) {
    store.delete(id);
    return undefined;
  }
  return p;
}

export function consumePending(id: string): PendingAction | undefined {
  const p = getPending(id);
  if (p) store.delete(id);
  return p;
}
