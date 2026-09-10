import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZhiliaowoClient } from '../datasources/zhiliaowo.js';
import { MemoryCache } from '../shared/cache.js';
import type { ResolvedBrand } from '../config/brands.js';

// 最小可用的 ResolvedBrand（request 仅用到 key/brand/appId）
const fakeBrand = {
  key: 'procell',
  brand: 'Procell',
  appId: 'test-appid',
  label: 'Procell',
  appIdEnv: 'ZLIW_PROCELL_APPID',
} as ResolvedBrand;

/** 用计数型 mock 替换全局 fetch，便于断言上游真实命中次数 */
function mockFetch(handler: (url: string) => Response): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => handler(String(url))) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

const OK = (result: unknown) =>
  new Response(JSON.stringify({ code: 200, msg: 'ok', result }), { status: 200 });

test('§1 相同业务参数两次调用只打一次上游（缓存真正生效）', async () => {
  let calls = 0;
  const restore = mockFetch(() => {
    calls++;
    return OK({ data: [{ id: 1 }], totalCount: 1, totalPage: 1, pageNum: 1, pageSize: 15 });
  });

  const client = new ZhiliaowoClient(new MemoryCache());
  const q = { year: '2025', pageNum: '1', pageSize: '15' };
  const a = await client.brandPapers(fakeBrand, q);
  const b = await client.brandPapers(fakeBrand, q);

  assert.equal(calls, 1, '业务参数不变时，上游应只被请求一次');
  assert.deepEqual(a, b, '两次返回应为同一缓存对象');
  restore();
});

test('§1 不同业务参数不互相命中缓存（各自打一次上游）', async () => {
  const seen = new Set<string>();
  const restore = mockFetch((url) => {
    seen.add(new URL(url).searchParams.get('pageNum') ?? '');
    return OK({ data: [], totalCount: 0, totalPage: 0, pageNum: 1, pageSize: 15 });
  });

  const client = new ZhiliaowoClient(new MemoryCache());
  await client.brandPapers(fakeBrand, { year: '2025', pageNum: '1', pageSize: '15' });
  await client.brandPapers(fakeBrand, { year: '2025', pageNum: '2', pageSize: '15' });

  assert.equal(seen.size, 2, '不同 pageNum 应分别请求上游');
  restore();
});

test('§1 同步路径 bypassCache 强制拉取最新（每次都打上游、不读缓存）', async () => {
  let calls = 0;
  const restore = mockFetch(() => {
    calls++;
    return OK({ data: [], totalCount: 0, totalPage: 0, pageNum: 1, pageSize: 15 });
  });

  const client = new ZhiliaowoClient(new MemoryCache());
  const q = { year: '2025', pageNum: '1', pageSize: '15' };
  await client.brandPapers(fakeBrand, q, { bypassCache: true });
  await client.brandPapers(fakeBrand, q, { bypassCache: true });

  assert.equal(calls, 2, 'bypassCache 时每次都应直连上游，不命中缓存');
  restore();
});

test('§1 缓存键不含 timestamp（实时鉴权字段不影响缓存）', async () => {
  const keys = new Set<string>();
  const restore = mockFetch((url) => {
    // 记录实际发出的 URL 中是否含 timestamp（应含，且每次不同）
    keys.add(new URL(url).searchParams.get('timestamp') ?? '');
    return OK({ data: [], totalCount: 0, totalPage: 0, pageNum: 1, pageSize: 15 });
  });

  const client = new ZhiliaowoClient(new MemoryCache());
  const q = { year: '2025', pageNum: '1', pageSize: '15' };
  await client.brandPapers(fakeBrand, q);
  await client.brandPapers(fakeBrand, q); // 第二次命中缓存，不再发请求

  assert.equal(keys.size, 1, '两次请求只有一次真正打到上游');
  // 发往上游的 URL 必须带 timestamp（鉴权需要）
  const onlyUrlTs = [...keys][0];
  assert.ok(onlyUrlTs && /^\d+$/.test(onlyUrlTs), '上游请求必须携带毫秒级 timestamp');
  restore();
});
