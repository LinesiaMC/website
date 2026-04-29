/**
 * Tiny in-memory TTL cache used to absorb repeated analytics reads
 * (admin dashboard polls many endpoints every N seconds).
 *
 * Warning: this is per-process. Behind a load balancer each instance has
 * its own store — fine on a single VPS, acceptable on multi-instance setups
 * since the TTL is short.
 */

type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expires) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

/** Clear cache entries whose key starts with one of the given prefixes. */
export function cacheInvalidate(prefixes: string[]): void {
  if (prefixes.length === 0) return;
  for (const key of store.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) store.delete(key);
  }
}

/** Drop the entire in-memory cache (used on global perm/role changes). */
export function cacheClear(): void {
  store.clear();
}

/** For introspection / tests. */
export function cacheSize(): number {
  return store.size;
}
