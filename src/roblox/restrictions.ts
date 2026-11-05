import { config } from '../config.js';
import { roblox } from './client.js';
import {
  robloxRestrictionLimiter,
  robloxGlobalLimiter,
} from '../core/rateLimit.js';
import { RobloxApiError } from './types.js';
import type {
  GameJoinRestriction,
  UserRestriction,
  ListUserRestrictionsResponse,
} from './types.js';

function universeBase(): string {
  if (!config.roblox.universeId) {
    throw new RobloxApiError('ROBLOX_UNIVERSE_ID no configurado', 0);
  }
  return `/cloud/v2/universes/${config.roblox.universeId}/user-restrictions`;
}

/** Parsea "7d", "12h", "30m" o segundos a protobuf Duration ("Ns"). */
export function parseDurationToSeconds(input: string): number | null {
  const m = input.trim().toLowerCase().match(/^(\d+)(s|m|h|d|w)$/);
  if (!m) {
    const n = Number(input);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }
  const n = Number(m[1]);
  const mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2] as 's' | 'm' | 'h' | 'd' | 'w'];
  return n * mult;
}

export function secondsToDuration(seconds: number): string {
  return `${Math.floor(seconds)}s`;
}

function enforceLimiters(userId: string): void {
  if (!robloxGlobalLimiter.check('roblox')) {
    throw new RobloxApiError('El bot está realizando demasiadas llamadas a Roblox, espera un momento', 429);
  }
  if (!robloxRestrictionLimiter.check(`user:${userId}`)) {
    throw new RobloxApiError(
      'Límite de Roblox alcanzado para este usuario (máx 2 sanciones/minuto). Espera ~60s.',
      429,
    );
  }
}

export interface BanParams {
  userId: string;
  displayReason: string;
  privateReason?: string;
  durationSec?: number | null; // null/undefined = permanente
  excludeAltAccounts?: boolean; // por defecto false (no propagar)
  idempotencyKey?: string;
}

/**
 * Aplica o renueva un gameJoinRestriction sobre un usuario.
 * Documentación: PATCH /cloud/v2/universes/{universe}/user-restrictions/{userId}
 */
export async function setUserRestriction(params: BanParams): Promise<UserRestriction> {
  enforceLimiters(params.userId);

  const restriction: GameJoinRestriction = {
    active: true,
    displayReason: params.displayReason.slice(0, 100),
    privateReason: params.privateReason?.slice(0, 1000),
    excludeAltAccounts: params.excludeAltAccounts ?? false,
    ...(params.durationSec ? { duration: secondsToDuration(params.durationSec) } : {}),
  };

  const body: Partial<UserRestriction> = { gameJoinRestriction: restriction };

  const query: Record<string, string | undefined> = {};
  if (params.idempotencyKey) {
    query['idempotencyKey.key'] = params.idempotencyKey;
    query['idempotencyKey.firstSent'] = new Date().toISOString();
  }

  return roblox.cloud<UserRestriction>(`${universeBase()}/${params.userId}`, {
    method: 'PATCH',
    body,
    query,
  });
}

/** Quita la restricción (desbaneo). */
export async function removeUserRestriction(userId: string): Promise<UserRestriction> {
  enforceLimiters(userId);
  return roblox.cloud<UserRestriction>(`${universeBase()}/${userId}`, {
    method: 'PATCH',
    body: { gameJoinRestriction: { active: false } },
  });
}

/** Obtiene la restricción actual de un usuario (404 si nunca fue sancionado). */
export async function getUserRestriction(userId: string): Promise<UserRestriction | null> {
  try {
    return await roblox.cloud<UserRestriction>(`${universeBase()}/${userId}`);
  } catch (err) {
    if (err instanceof RobloxApiError && err.isNotFound) return null;
    throw err;
  }
}

/** Lista restricciones del universo (paginado). */
export async function listUserRestrictions(maxPageSize = 50): Promise<UserRestriction[]> {
  const all: UserRestriction[] = [];
  let pageToken: string | undefined;
  do {
    const res = await roblox.cloud<ListUserRestrictionsResponse>(universeBase(), {
      query: { maxPageSize: String(maxPageSize), pageToken },
    });
    all.push(...(res.userRestrictions ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return all;
}

/** Historial de moderación del universo. */
export async function listRestrictionLogs(maxPageSize = 50): Promise<unknown> {
  return roblox.cloud(`${universeBase()}:listLogs`, {
    query: { maxPageSize: String(maxPageSize) },
  });
}
