const { config } = require('../config.js');
const { roblox } = require('./client.js');
const { robloxRestrictionLimiter, robloxGlobalLimiter } = require('../core/rateLimit.js');
const { RobloxApiError } = require('./types.js');

function universeBase() {
  if (!config.roblox.universeId) {
    const err = new Error('ROBLOX_UNIVERSE_ID no configurado');
    err.status = 0;
    throw err;
 };
  return `/cloud/v2/universes/${config.roblox.universeId}/user-restrictions`;
}

function parseDurationToSeconds(input) {
  const m = input.trim().toLowerCase().match(/^(\d+)(s|m|h|d|w)$/);
  if (!m) {
    const n = Number(input);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
 };
  const n = Number(m[1]);
  const mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2]];
  return n * mult;
}

function secondsToDuration(seconds) {
  return `${Math.floor(seconds)}s`;
}

function enforceLimiters(userId) {
  if (!robloxGlobalLimiter.check('roblox')) {
    const err = new Error('El bot está realizando demasiadas llamadas a Roblox, espera un momento');
    err.status = 429;
    throw err;
 };
  if (!robloxRestrictionLimiter.check(`user:${userId}`)) {
    const err = new Error('Límite de Roblox alcanzado para este usuario (máx 2 sanciones/minuto). Espera ~60s.');
    err.status = 429;
    throw err;
 };
}

async function setUserRestriction(params) {
  enforceLimiters(params.userId);

  const restriction = {
    active: true,
    displayReason: params.displayReason.slice(0, 100),
    privateReason: params.privateNote?.slice(0, 1000),
    excludeAltAccounts: params.excludeAlts ?? false,
    ...(params.durationSec ? { duration: secondsToDuration(params.durationSec) } : {}),
  };

  const body = { gameJoinRestriction: restriction };

  const query = {};
  if (params.idempotencyKey) {
    query['idempotencyKey.key'] = params.idempotencyKey;
    query['idempotencyKey.firstSent'] = new Date().toISOString();
 };

  return roblox.cloud(`${universeBase()}/${params.userId}`, {
    method: 'PATCH',
    body,
    query,
  });
}

async function removeUserRestriction(userId) {
  enforceLimiters(userId);
  return roblox.cloud(`${universeBase()}/${userId}`, {
    method: 'PATCH',
    body: { gameJoinRestriction: { active: false } },
  });
}

async function getUserRestriction(userId) {
  try {
    return await roblox.cloud(`${universeBase()}/${userId}`);
  } catch (err) {
    if (err instanceof RobloxApiError && err.isNotFound) return null;
    throw err;
 };
}

async function listUserRestrictions(maxPageSize = 50) {
  const all = [];
  let pageToken;
  do {
    const res = await roblox.cloud(universeBase(), { query: { maxPageSize: String(maxPageSize), pageToken } });
    all.push(...(res.userRestrictions ?? []));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return all;
}

async function listRestrictionLogs(maxPageSize = 50) {
  return roblox.cloud(`${universeBase()}:listLogs`, { query: { maxPageSize: String(maxPageSize) } });
}

module.exports = {
  parseDurationToSeconds,
  secondsToDuration,
  setUserRestriction,
  removeUserRestriction,
  getUserRestriction,
  listUserRestrictions,
  listRestrictionLogs,
};
