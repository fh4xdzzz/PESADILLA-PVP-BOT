import { DEFAULT_SETTINGS, normalizeSettings } from "./settings.js";

const FRESH_FOR_MS = 5 * 60_000;
const MAX_PARALLEL = 4;

/**
 * Polling de solo lectura. Si la web deja de responder se conserva el último
 * estado durante 5 min; después se vuelve a los defaults seguros (módulos off).
 */
export function createSettingsSync({ baseUrl, token, fetchImpl = fetch, now = Date.now, logger = console }) {
  const entries = new Map();
  async function refresh(guildId) {
    const previous = entries.get(guildId);
    const url = new URL("/api/bot/guilds/" + encodeURIComponent(guildId) + "/settings", baseUrl);
    const headers = { Authorization: "Bearer " + token };
    if (previous?.etag) headers["If-None-Match"] = previous.etag;
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        method: "GET", headers, signal: AbortSignal.timeout(8000), cache: "no-store",
      });
      if (response.status === 304 && previous) {
        entries.set(guildId, { ...previous, fetchedAt: now() });
        return true;
      }
      if (!response.ok) throw new Error("HTTP " + response.status);
      const body = await response.json();
      if (body.guildId !== guildId) throw new Error("guild_mismatch");
      const settings = normalizeSettings(body.settings);
      if (!settings) throw new Error("invalid_bot_settings");
      entries.set(guildId, {
        settings, etag: response.headers.get("etag"), fetchedAt: now(),
      });
      return true;
    } catch (error) {
      logger.warn("[sync] " + guildId + ": " + (error instanceof Error ? error.message : "error"));
      return false;
    }
  }

  function get(guildId) {
    const entry = entries.get(guildId);
    return entry && now() - entry.fetchedAt < FRESH_FOR_MS ? entry.settings : DEFAULT_SETTINGS;
  }

  async function refreshAll(guildIds) {
    const ids = [...new Set(guildIds)];
    for (let i = 0; i < ids.length; i += MAX_PARALLEL) {
      await Promise.all(ids.slice(i, i + MAX_PARALLEL).map(refresh));
    }
    for (const known of entries.keys()) if (!ids.includes(known)) entries.delete(known);
  }

  return { get, refresh, refreshAll, forget: (id) => entries.delete(id) };
}

export async function sendHeartbeat({ baseUrl, token, botUserId, guildIds, fetchImpl = fetch, logger = console }) {
  if (!guildIds.length) return true;
  let allOk = true;
  for (let index = 0; index < guildIds.length; index += 100) {
    const chunk = guildIds.slice(index, index + 100);
    try {
      const response = await fetchImpl(
        new URL("/api/bot/heartbeat", baseUrl).toString(),
        {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ botUserId, guildIds: chunk }),
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("HTTP " + response.status);
    } catch (error) {
      allOk = false;
      logger.warn("[heartbeat] " + (error instanceof Error ? error.message : "error"));
    }
  }
  return allOk;
}
