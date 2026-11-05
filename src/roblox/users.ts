import { roblox } from './client.js';
import { robloxLookupLimiter } from '../core/rateLimit.js';
import { RobloxApiError } from './types.js';
import type { RobloxUser, UsernameLookupResponse, AvatarResponse } from './types.js';

/**
 * Resuelve un input de usuario a un Roblox UserId numérico.
 * Acepta:
 *  - UserId directo ("123456789")
 *  - @username o username ("Builderman")
 *
 * Username→ID usa el endpoint público de users.roblox.com (sin auth).
 */
export async function resolveRobloxUser(input: string): Promise<RobloxUser> {
  const cleaned = input.trim().replace(/^@/, '');

  if (/^\d{1,20}$/.test(cleaned)) {
    return getUserById(cleaned);
  }

  if (!/^[A-Za-z0-9_]{3,20}$/.test(cleaned)) {
    throw new RobloxApiError(`"${input}" no es un UserId ni un username válido de Roblox`, 400);
  }

  if (!robloxLookupLimiter.check('lookup')) {
    throw new RobloxApiError('Límite de consultas de usuarios alcanzado, intenta en un minuto', 429);
  }

  const res = await roblox.publicApi<UsernameLookupResponse>('/usernames/users', {
    method: 'POST',
    body: { usernames: [cleaned], excludeBannedUsers: false },
  });

  const found = res.data?.[0];
  if (!found) {
    throw new RobloxApiError(`No se encontró ningún usuario de Roblox llamado "${cleaned}"`, 404);
  }

  return { id: found.id, name: found.name, displayName: found.displayName };
}

export async function getUserById(userId: string | number): Promise<RobloxUser> {
  const res = await roblox.publicApi<{ name: string; displayName: string }>(`/users/${userId}`);
  return { id: Number(userId), name: res.name, displayName: res.displayName };
}

/** Avatar headshot URL del usuario (PNG). */
export async function getAvatarUrl(userId: string | number): Promise<string | null> {
  try {
    const res = await roblox.thumbnails<AvatarResponse>(
      `/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
    );
    return res.data?.[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}
