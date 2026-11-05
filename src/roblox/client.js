const { config } = require('../config.js');
const { log } = require('../logger.js');

const CLOUD_BASE = 'https://apis.roblox.com/cloud/v2';
const OPEN_CLOUD_BASE = 'https://apis.roblox.com';
const USERS_BASE = 'https://users.roblox.com/v1';
const THUMBNAILS_BASE = 'https://thumbnails.roblox.com/v1';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;

function buildUrl(base, path, query) {
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function request(base, path, opts = {}) {
  const { method = 'GET', body, auth = 'cloud', query } = opts;
  const url = buildUrl(base, path, query);

  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const headers = { Accept: 'application/json' };
      if (auth === 'cloud') {
        if (!config.roblox.apiKey) {
          const err = new Error('ROBLOX_API_KEY no configurada');
          err.status = 0;
          err.endpoint = url;
          throw err;
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
      let json;
      try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

      if (res.ok) return json;

      const errBody = json;
      const msg = errBody?.errors?.[0]?.message ?? `Roblox API ${res.status} en ${method} ${path}`;

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get('retry-after') ?? '2');
        log.warn({ url, attempt, retryAfter }, 'Roblox rate limit, reintentando');
        await new Promise((r) => setTimeout(r, Math.min(retryAfter, 10) * 1000));
        continue;
      }

      const err = new Error(msg);
      err.status = res.status;
      err.body = json;
      err.endpoint = url;
      throw err;
    } catch (err) {
      if (err.status !== undefined) throw err;
      if (attempt < MAX_RETRIES && err.name === 'AbortError') {
        log.warn({ url, attempt }, 'Timeout Roblox, reintentando');
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

const roblox = {
  configured: config.roblox.configured,
  universeId: config.roblox.universeId,
  placeId: config.roblox.placeId,

  cloud: (path, opts) => request(OPEN_CLOUD_BASE, path, { ...opts, auth: 'cloud' }),
  publicApi: (path, opts) => request(USERS_BASE, path, { ...opts, auth: 'public' }),
  thumbnails: (path, opts) => request(THUMBNAILS_BASE, path, { ...opts, auth: 'public' }),

  universePath: () => `/cloud/v2/universes/${config.roblox.universeId}`,
};

class RobloxApiError extends Error {
  constructor(message, status, body, endpoint) {
    super(message);
    this.name = 'RobloxApiError';
    this.status = status;
    this.body = body;
    this.endpoint = endpoint;
  }
  get isRateLimit() { return this.status === 429; }
  get isNotFound() { return this.status === 404; }
}

module.exports = { roblox, RobloxApiError };
