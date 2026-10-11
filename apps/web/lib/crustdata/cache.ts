const TTL_MS = 24 * 60 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

export type CrustdataResponseCache = {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
};

export function canonicalCacheKey(endpoint: string, body: unknown): string {
  return `${endpoint}:${stableStringify(body)}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function createInMemoryCrustdataCache(
  nowMs: () => number = () => Date.now(),
): CrustdataResponseCache {
  const store = new Map<string, CacheEntry>();
  return {
    get(key: string) {
      const entry = store.get(key);
      if (!entry) {
        return undefined;
      }
      if (nowMs() > entry.expiresAt) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: unknown) {
      store.set(key, { value, expiresAt: nowMs() + TTL_MS });
    },
  };
}

/** No-op cache for unit tests (SP-05 §9). */
export const disabledCrustdataCache: CrustdataResponseCache = {
  get: () => undefined,
  set: () => {},
};
