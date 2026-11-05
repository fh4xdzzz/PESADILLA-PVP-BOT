import { config } from '../config.js';
import { roblox } from './client.js';
import { RobloxApiError } from './types.js';
import type { DataStoreEntry, ListEntriesResponse } from './types.js';

/**
 * Data Stores vía Open Cloud.
 *
 * IMPORTANTE: estos endpoints leen los DataStores DE LA EXPERIENCIA.
 * Para que existan datos, el juego en Roblox Studio debe escribirlos
 * (ver roblox-scripts/DataStoreStats.server.lua). Si el datastore no
 * existe o está vacío, las funciones devuelven [] / null sin inventar datos.
 */

const STATS_DS = 'PVPStats_v1';
const LEADERBOARD_DS = 'PVPLeaderboard_v1';

function dsPath(datastore: string): string {
  return `/cloud/v2/universes/${config.roblox.universeId}/data-stores/${encodeURIComponent(datastore)}`;
}

function requireUniverse(): void {
  if (!config.roblox.universeId) {
    throw new RobloxApiError('ROBLOX_UNIVERSE_ID no configurado', 0);
  }
}

export async function getDataStoreEntry(datastore: string, key: string): Promise<DataStoreEntry | null> {
  requireUniverse();
  try {
    return await roblox.cloud<DataStoreEntry>(
      `${dsPath(datastore)}/entries/${encodeURIComponent(key)}`,
    );
  } catch (err) {
    if (err instanceof RobloxApiError && err.isNotFound) return null;
    throw err;
  }
}

export async function setDataStoreEntry(datastore: string, key: string, value: unknown): Promise<void> {
  requireUniverse();
  await roblox.cloud(`${dsPath(datastore)}/entries/${encodeURIComponent(key)}`, {
    method: 'POST',
    body: { value: typeof value === 'string' ? value : JSON.stringify(value) },
  });
}

/** Lista entradas de un datastore estándar. */
export async function listDataStoreEntries(datastore: string, maxPageSize = 25): Promise<DataStoreEntry[]> {
  requireUniverse();
  const res = await roblox.cloud<ListEntriesResponse>(`${dsPath(datastore)}/entries:list`, {
    query: { maxPageSize: String(maxPageSize) },
  });
  return res.dataStoreEntries ?? [];
}

/**
 * Leaderboard: el juego debe mantener un OrderedDataStore "PVPLeaderboard_v1"
 * con keys = robloxUserId y value = score (kills o wins).
 * Devuelve entradas ordenadas desc según `sortOrder`.
 */
export async function getLeaderboard(sortOrder: 'ASC' | 'DESC' = 'DESC', maxEntries = 10): Promise<
  { userId: string; score: number }[]
> {
  requireUniverse();
  try {
    const res = await roblox.cloud<ListEntriesResponse>(
      `/cloud/v2/universes/${config.roblox.universeId}/ordered-data-stores/${encodeURIComponent(LEADERBOARD_DS)}/entries:listKeys`,
      { query: { maxPageSize: String(maxEntries), sortOrder } },
    );
    // Las entradas ordered devuelven cursor+value; parseo defensivo.
    return (res.orderedDataStoreEntries ?? []).map((e: { path?: string; value?: unknown }) => {
      const userId = (e.path ?? '').split('/').pop() ?? '';
      const score = Number(e.value ?? 0);
      return { userId, score: Number.isFinite(score) ? score : 0 };
    });
  } catch (err) {
    if (err instanceof RobloxApiError && err.isNotFound) return [];
    throw err;
  }
}

// ---------- Atajos de stats ----------
export async function getPlayerStats(robloxUserId: string): Promise<Record<string, unknown> | null> {
  const entry = await getDataStoreEntry(STATS_DS, robloxUserId);
  if (!entry?.value) return null;
  try {
    return typeof entry.value === 'string' ? JSON.parse(entry.value) : (entry.value as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function listAllPlayerStats(maxEntries = 100): Promise<{ key: string; value: unknown }[]> {
  const entries = await listDataStoreEntries(STATS_DS, maxEntries);
  return entries.map((e) => ({
    key: (e.path ?? '').split('/').pop() ?? '',
    value: e.value,
  }));
}
