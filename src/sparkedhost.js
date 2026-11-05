import WebSocket from 'ws';

const BASE_URL = 'https://control.sparkedhost.us/api/client';
const PANEL_ORIGIN = 'https://control.sparkedhost.us';

export class SparkedHostError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class SparkedHost {
  constructor(apiKey, serverId) {
    if (!apiKey) throw new Error('SPARKEDHOST_API_KEY no configurada');
    if (!serverId) throw new Error('SPARKEDHOST_SERVER_ID no configurado');
    this.apiKey = apiKey;
    this.serverId = serverId;
  }

  async request(method, path, { body, raw } = {}) {
    const res = await fetch(`${BASE_URL}/servers/${this.serverId}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }

    if (!res.ok) {
      const msg = json?.errors?.[0]?.detail || `Error ${res.status} en ${method} ${path}`;
      throw new SparkedHostError(msg, res.status, json);
    }
    return json;
  }

  server() {
    return this.request('GET', '');
  }

  resources() {
    return this.request('GET', '/resources');
  }

  power(signal) {
    if (!['start', 'stop', 'restart', 'kill'].includes(signal)) {
      throw new Error(`Señal de power inválida: ${signal}`);
    }
    return this.request('POST', '/power', { body: { signal } });
  }

  websocketCredentials() {
    return this.request('GET', '/websocket');
  }

  listFiles(directory = '/') {
    return this.request('GET', `/files/list?directory=${encodeURIComponent(directory)}`);
  }

  readFile(file) {
    return this.request('GET', `/files/contents?file=${encodeURIComponent(file)}`);
  }

  async writeFile(file, content) {
    return this.request('POST', `/files/write?file=${encodeURIComponent(file)}`, {
      body: content,
      raw: true,
    });
  }

  deleteFiles(root, files) {
    return this.request('POST', '/files/delete', { body: { root, files } });
  }

  /**
   * Abre una sesión websocket con Wings, se autentica y ejecuta `onReady`.
   * Devuelve { close(), sendCommand(cmd), sendPower(signal) }.
   */
  async connectConsole({ onLine, onStatus, onStats } = {}) {
    const creds = await this.websocketCredentials();
    const { token, socket } = creds.data;

    const ws = new WebSocket(socket, {
      headers: { Origin: PANEL_ORIGIN },
    });

    const lines = [];
    let authenticated = false;
    let resolveAuth;
    const authPromise = new Promise((res, rej) => {
      resolveAuth = res;
      ws.once('error', rej);
    });

    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      switch (msg.event) {
        case 'auth success':
          authenticated = true;
          resolveAuth();
          break;
        case 'console output': {
          const line = msg.args?.[0];
          if (line) { lines.push(line); onLine?.(line); }
          break;
        }
        case 'status':
          onStatus?.(msg.args?.[0]);
          break;
        case 'stats': {
          try { onStats?.(JSON.parse(msg.args?.[0])); } catch { /* noop */ }
          break;
        }
        case 'token expired':
        case 'token expiring':
          break;
      }
    });

    await new Promise((res, rej) => {
      ws.once('open', res);
      ws.once('error', rej);
    });
    ws.send(JSON.stringify({ event: 'auth', args: [token] }));
    await authPromise;

    return {
      ws,
      lines,
      sendCommand: (command) => ws.send(JSON.stringify({ event: 'send command', args: [command] })),
      sendPower: (signal) => ws.send(JSON.stringify({ event: 'set state', args: [signal] })),
      requestLogs: () => ws.send(JSON.stringify({ event: 'send logs', args: [null] })),
      requestStats: () => ws.send(JSON.stringify({ event: 'send stats', args: [null] })),
      close: () => ws.close(),
      get authenticated() { return authenticated; },
    };
  }

  /**
   * Lee las últimas líneas de la consola abriendo una sesión temporal.
   */
  async readLogs(maxLines = 50, timeoutMs = 8000) {
    const session = await this.connectConsole();
    try {
      session.requestLogs();
      const deadline = Date.now() + timeoutMs;
      while (session.lines.length < maxLines && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 250));
      }
      return session.lines.slice(-maxLines);
    } finally {
      session.close();
    }
  }
}
