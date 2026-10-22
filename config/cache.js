// In-memory cache with TTL (no Redis required)
// Used for sessions, rate limiting, and general caching
class Cache {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  _clearTimer(key) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.del(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    this._clearTimer(key);
    const entry = { value };
    if (ttlSeconds) {
      entry.expiry = Date.now() + ttlSeconds * 1000;
      this.timers.set(key, setTimeout(() => this.del(key), ttlSeconds * 1000));
    }
    this.store.set(key, entry);
    return 'OK';
  }

  del(key) {
    this._clearTimer(key);
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  incr(key, ttlSeconds) {
    const current = this.get(key);
    const next = (typeof current === 'number' ? current : 0) + 1;
    this.set(key, next, ttlSeconds);
    return next;
  }

  expire(key, seconds) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiry = Date.now() + seconds * 1000;
    this._clearTimer(key);
    this.timers.set(key, setTimeout(() => this.del(key), seconds * 1000));
    return 1;
  }

  flush() {
    for (const [key] of this.timers) clearTimeout(key);
    this.timers.clear();
    this.store.clear();
  }
}

const cache = new Cache();

module.exports = cache;
