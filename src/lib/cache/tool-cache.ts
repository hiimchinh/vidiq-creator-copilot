interface Entry<T> {
  value: T;
  storedAt: number;
}

export interface ToolCacheOptions {
  ttlMs: number;
  now?: () => number;
  maxEntries?: number;
}

export type CacheSnapshot<T> = [string, Entry<T>][];

/** Small TTL + LRU-ish cache. Insertion order is eviction order. */
export class ToolCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly maxEntries: number;

  constructor({ ttlMs, now = Date.now, maxEntries = 200 }: ToolCacheOptions) {
    this.ttlMs = ttlMs;
    this.now = now;
    this.maxEntries = maxEntries;
  }

  static fromSnapshot<T>(snapshot: unknown, options: ToolCacheOptions): ToolCache<T> {
    const cache = new ToolCache<T>(options);
    if (!Array.isArray(snapshot)) return cache;
    for (const item of snapshot) {
      if (Array.isArray(item) && typeof item[0] === "string" && item[1] && typeof item[1].storedAt === "number") {
        cache.entries.set(item[0], item[1] as Entry<T>);
      }
    }
    return cache;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (this.now() - entry.storedAt > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: this.now() });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  snapshot(): CacheSnapshot<T> {
    return [...this.entries.entries()];
  }
}
