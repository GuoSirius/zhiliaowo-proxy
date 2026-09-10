
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 受控并发 map：同时最多 limit 个在途任务，结果按输入顺序返回。
 * 适用于网络 I/O 密集型批量任务（如分页同步）——等待上游响应时事件循环空闲，
 * 提高并发能显著缩短总耗时，但仍需限流避免打爆上游。
 */
export async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await fn(items[cur]);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}
