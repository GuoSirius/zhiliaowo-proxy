import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCache } from '../lib/cache.js';

test('MemoryCache: set 后能 get 到原值', async () => {
  const c = new MemoryCache();
  await c.set('k1', { a: 1, b: 'x' }, 30);
  assert.deepEqual(await c.get('k1'), { a: 1, b: 'x' });
});

test('MemoryCache: 不存在的 key 返回 undefined', async () => {
  const c = new MemoryCache();
  assert.equal(await c.get('nope'), undefined);
});

test('MemoryCache: 不同 key 互相独立', async () => {
  const c = new MemoryCache();
  await c.set('a', 1, 30);
  await c.set('b', 2, 30);
  assert.equal(await c.get('a'), 1);
  assert.equal(await c.get('b'), 2);
});

test('MemoryCache: 负数 TTL 立即过期，get 返回 undefined', async () => {
  const c = new MemoryCache();
  await c.set('exp', 'v', -1);
  assert.equal(await c.get('exp'), undefined);
});
