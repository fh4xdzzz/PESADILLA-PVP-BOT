const { config } = require('../config.js');
const { roblox } = require('./client.js');
const { RobloxApiError } = require('./types.js');

const STATS_DS = 'PVPStats_v1';
const LEADERBOARD_DS = 'PVPLeaderboard_v1';

function dsPath(datastore) {
  return `/cloud/v2/universes/${config.roblox.universeId}/data-stores/${encodeURIComponent(datastore)}`;
}

function requireUniverse() {
  if (!config.roblox.universeId) {
    const err = new Error('ROBLOX_UNIVERSE_ID no configurado');
    err.status = 0;
    throw err;
 };
}

async function getDataStoreEntry(datastore, key) {
  requireUniverse();
  try {
    return await roblox.cloud(`${dsPath(datastore)}/entries/${encodeURIComponent(key)}`);
  } catch (err) {
    if (err instanceof RobloxApiError && err.isNotFound) return null;
    throw err;
 };
}

async function setDataStoreEntry(datastore, key, value) {
  requireUniverse();
  await roblox.cloud(`${dsPath(datastore)}/entries/${encodeURIComponent(key)}`, {
    method: 'POST',
    body: { value: typeof value === 'string' ? value : JSON.stringify(value) },
  });
}

async function listDataStoreEntries(datastore, maxPageSize = 25) {
  requireUniverse();
  const res = await roblox.cloud(`${dsPath(datastore)}/entries:list`, {
    query: { maxPageSize: String(maxPageSize) },
  });
  return res.dataStoreEntries ?? [];
}

async function getLeaderboard(sortOrder = 'DESC', maxEntries = 10) {
  requireUniverse();
  try {
    const res = await roblox.cloud(
      `/cloud/v2/universes/${config.roblox.universeId}/ordered-data-stores/${encodeURIComponent(LEADERBOARD_DS)}/entries:listKeys`,
      { query: { maxPageSize: String(maxEntries), sortOrder } },
    );
    return (res.orderedDataStoreEntries ?? []).map((e) => {
      const userId = (e.path ?? '').split('/').pop() ?? '';
      const score = Number(e.value ?? 0);
      return { userId, score: Number.isFinite(score) ? score : 0 };
    });
  } catch (err) {
    if (err instanceof RobloxApiError && err.isNotFound) return [];
    throw err;
 };
}

async function getPlayerStats(robloxUserId) {
  const entry = await getDataStoreEntry(STATS_DS, robloxUserId);
  if (!entry?.value) return null;
  try {
    return typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
  } catch {
    return null;
 };
}

async function listAllPlayerStats(maxEntries = 100) {
  const entries = await listDataStoreEntries(STATS_DS, maxEntries);
  return entries.map((e) => ({
    key: (e.path ?? '').split('/').pop() ?? '',
    value: e.value,
  }));
}

module.exports = {
  getDataStoreEntry,
  setDataStoreEntry,
  listDataStoreEntries,
  getLeaderboard,
  getPlayerStats,
  listAllPlayerStats,
};
