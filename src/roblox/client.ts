import { config } from '../config.js';
import { log } from '../logger.js';
import { RobloxApiError } from './types.js';

const CLOUD_BASE = 'https://apis.roblox.com/cloud/v2';
const OPEN_CLOUD_BASE = 'https://apis.roblox.com';
const USERS_BASE = 'https://users.roblox.com/v1';
const THUMBNAILS_BASE = 'https://thumbnails.roblox.com/v1';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** 'cloud' usa x-api-key contra apis.roblox.com; 'public' no requiere auth. */
  auth?: 'cloud' | 'public';
  query?: Record<string, string | undefined>;
}

function buildUrl(base: string, path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function request<T>(base: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = 'cloud', query } = opts;
  const url = buildUrl(base, path, query);

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (auth === 'cloud') {
        if (!config.roblox.apiKey) {
          throw new RobloxApiError('ROBLOX_API_KEY no configurada', 0, undefined, url);
        }
        headers['x-api-key'] = config.roblox.apiKey;
      }
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      const res = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await res.text();
      let json: unknown;
      try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

      if (res.ok) return json as T;

      const errBody = json as { errors?: { message?: string; code?: string }[] };
      const msg = errBody?.errors?.[0]?.message
        ?? `Roblox API ${res.status} en ${method} ${path}`;

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get('retry-after') ?? '2');
        log.warn({ url, attempt, retryAfter }, 'Roblox rate limit, reintentando');
        await new Promise((r) => setTimeout(r, Math.min(retryAfter, 10) * 1000));
        continue;
      }

      throw new RobloxApiError(msg, res.status, json, url);
    } catch (err) {
      if (err instanceof RobloxApiError) throw err;
      if (attempt < MAX_RETRIES && (err as Error).name === 'AbortError') {
        log.warn({ url, attempt }, 'Timeout Roblox, reintentando');
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const roblox = {
  configured: config.roblox.configured,
  universeId: config.roblox.universeId,
  placeId: config.roblox.placeId,

  // ---------- Open Cloud (x-api-key) ----------
  cloud: <T>(path: string, opts?: RequestOptions) =>
    request<T>(OPEN_CLOUD_BASE, path, { ...opts, auth: 'cloud' }),

  // ---------- APIs públicas de usuarios (sin auth) ----------
  publicApi: <T>(path: string, opts?: RequestOptions) =>
    request<T>(USERS_BASE, path, { ...opts, auth: 'public' }),

  thumbnails: <T>(path: string, opts?: RequestOptions) =>
    request<T>(THUMBNAILS_BASE, path, { ...opts, auth: 'public' }),

  // Atajos comunes
  universePath: () => `/cloud/v2/universes/${config.roblox.universeId}`,
};
