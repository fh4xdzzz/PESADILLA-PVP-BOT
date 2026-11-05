/** Rate limiter en memoria por clave. Suficiente para un solo proceso. */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private maxHits: number,
    private windowMs: number,
  ) {}

  /** Devuelve true si la acción está permitida; false si excedió el límite. */
  check(key: string): boolean {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.maxHits) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }

  /** Milisegundos hasta que se libera un cupo (para mensajes de espera). */
  retryAfterMs(key: string): number {
    const arr = this.hits.get(key) ?? [];
    if (arr.length < this.maxHits) return 0;
    return this.windowMs - (Date.now() - arr[0]);
  }

  reset(key?: string): void {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }
}

// Cooldown por usuario para comandos sensibles (anti-spam de slash commands)
export const commandLimiter = new RateLimiter(10, 10_000); // 10 cmds / 10s por usuario

// Roblox UpdateUserRestriction: máx 2 req/min por usuario dentro del universo.
// El límite global de la API key es 10/s; usamos un margen conservador.
export const robloxRestrictionLimiter = new RateLimiter(2, 60_000); // por usuario Roblox
export const robloxGlobalLimiter = new RateLimiter(8, 1_000); // global conservador

// Límite para resolución de usernames (endpoint público de users.roblox.com)
export const robloxLookupLimiter = new RateLimiter(20, 60_000);
