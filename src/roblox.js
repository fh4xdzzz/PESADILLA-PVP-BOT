const CLOUD_BASE = 'https://apis.roblox.com/cloud/v2';

export class RobloxError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/**
 * Cliente mínimo para Roblox Open Cloud (Data Stores).
 * Requiere una API key con acceso a la universe correspondiente.
 * Crear en: https://create.roblox.com/dashboard/credentials
 */
export class RobloxCloud {
  constructor(apiKey, universeId) {
    this.apiKey = apiKey;
    this.universeId = universeId;
  }

  get configured() {
    return Boolean(this.apiKey && this.universeId);
  }

  async request(method, path, body) {
    if (!this.configured) {
      throw new RobloxError('Roblox Open Cloud no configurado (ROBLOX_API_KEY / ROBLOX_UNIVERSE_ID)', 0);
    }
    const res = await fetch(`${CLOUD_BASE}/universes/${this.universeId}${path}`, {
      method,
      headers: {
        'x-api-key': this.apiKey,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }

    if (!res.ok) {
      const msg = json?.errors?.[0]?.message || `Error ${res.status} en ${method} ${path}`;
      throw new RobloxError(msg, res.status, json);
    }
    return json;
  }

  listDataStores() {
    return this.request('GET', '/data-stores?maxPageSize=100');
  }

  getDataStoreEntry(datastore, key) {
    return this.request('GET', `/data-stores/${encodeURIComponent(datastore)}/entries/${encodeURIComponent(key)}`);
  }

  setDataStoreEntry(datastore, key, value) {
    return this.request(
      'POST',
      `/data-stores/${encodeURIComponent(datastore)}/entries/${encodeURIComponent(key)}`,
      { value: String(value) },
    );
  }
}
