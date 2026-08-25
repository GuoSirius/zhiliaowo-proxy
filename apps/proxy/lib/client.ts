import { createCache, type Cache } from './cache.js';
import { ZhiliaowoClient } from './zhiliaowo.js';

let client: ZhiliaowoClient | null = null;

/** 启动时初始化：创建缓存（memory/redis 按 env 切换）+ 客户端单例 */
export async function initClient(): Promise<ZhiliaowoClient> {
  const cache: Cache = await createCache();
  client = new ZhiliaowoClient(cache);
  return client;
}

/** 请求处理时获取客户端单例 */
export function getClient(): ZhiliaowoClient {
  if (!client) {
    throw new Error('ZhiliaowoClient not initialized; call initClient() at startup');
  }
  return client;
}
