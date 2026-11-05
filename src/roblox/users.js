const { roblox, RobloxApiError } = require('./client.js');
const { robloxLookupLimiter } = require('../core/rateLimit.js');

async function resolveRobloxUser(input) {
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

  const res = await roblox.publicApi('/usernames/users', {
    method: 'POST',
    body: { usernames: [cleaned], excludeBannedUsers: false },
  });

  const found = res.data?.[0];
  if (!found) {
    throw new RobloxApiError(`No se encontró ningún usuario de Roblox llamado "${cleaned}"`, 404);
  }

  return { id: found.id, name: found.name, displayName: found.displayName };
}

async function getUserById(userId) {
  const res = await roblox.publicApi(`/users/${userId}`);
  return { id: Number(userId), name: res.name, displayName: res.displayName };
}

async function getAvatarUrl(userId) {
  try {
    const res = await roblox.thumbnails(
      `/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
    );
    return res.data?.[0]?.imageUrl ?? null;
  } catch {
    return null;
  }
}

module.exports = { resolveRobloxUser, getUserById, getAvatarUrl };
