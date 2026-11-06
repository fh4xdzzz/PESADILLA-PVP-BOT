class RateLimiter {
  constructor(maxHits, windowMs) {
    this.maxHits = maxHits;
    this.windowMs = windowMs;
    this.hits = new Map();
 };

  check(key) {
    const now = Date.now();
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.maxHits) {
      this.hits.set(key, arr);
      return false;
   };
    arr.push(now);
    this.hits.set(key, arr);
    return true;
 };

  retryAfterMs(key) {
    const arr = this.hits.get(key) ?? [];
    if (arr.length < this.maxHits) return 0;
    return this.windowMs - (Date.now() - arr[0]);
 };

  reset(key) {
    if (key) this.hits.delete(key);
    else this.hits.clear();
 };
}

const commandLimiter = new RateLimiter(10, 10000);
const robloxRestrictionLimiter = new RateLimiter(2, 60000);
const robloxGlobalLimiter = new RateLimiter(8, 1000);
const robloxLookupLimiter = new RateLimiter(20, 60000);

module.exports = { RateLimiter, commandLimiter, robloxRestrictionLimiter, robloxGlobalLimiter, robloxLookupLimiter };
