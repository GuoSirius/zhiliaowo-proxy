import type { Redis } from 'ioredis';

/**
 * 缓存抽象接口 —— 业务代码只依赖此接口，不感知具体实现。
 * 切换 memory / redis 对调用方零影响（无缝切换的关键）。
 */
export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

/** 内存缓存（默认）：进程内 Map + TTL，零外部依赖 */
export class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expires: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
}

/** Redis 缓存（可选）：需 ioredis + CACHE_REDIS_URL */
export class RedisCache implements Cache {
  private readonly client: Redis;
  constructor(client: Redis) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
}

/**
 * 缓存工厂：按 CACHE_DRIVER 决定实现。
 * - memory（默认）：零依赖，开箱即用
 * - redis：动态加载 ioredis，未配置 URL 或加载失败自动回退 memory 并告警
 * 业务代码无需任何改动即可在两种实现间切换。
 */
export async function createCache(): Promise<Cache> {
  const driver = (process.env.CACHE_DRIVER ?? 'memory').toLowerCase();

  if (driver === 'redis') {
    const url = process.env.CACHE_REDIS_URL;
    if (!url) {
      console.warn('[cache] CACHE_DRIVER=redis 但未设置 CACHE_REDIS_URL，回退 memory');
      return new MemoryCache();
    }
    try {
      const { Redis } = await import('ioredis');
      const client = new Redis(url);
      client.on('error', (e) => console.error('[cache] redis error:', e.message));
      console.log('[cache] using RedisCache');
      return new RedisCache(client);
    } catch (e) {
      console.warn('[cache] ioredis 加载失败，回退 memory:', (e as Error).message);
      return new MemoryCache();
    }
  }

  console.log('[cache] using MemoryCache');
  return new MemoryCache();
}
