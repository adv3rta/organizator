import type { CacheEnvelope } from "@adverta/shared";

export const storage = {
  get: async <T>(key: string): Promise<CacheEnvelope<T> | null> => window.adverta.cacheGet<T>(key),
  set: async <T>(key: string, data: T): Promise<void> =>
    window.adverta.cacheSet(key, {
      data,
      cachedAt: new Date().toISOString()
    }),
  delete: async (key: string): Promise<void> => window.adverta.cacheDelete(key)
};
