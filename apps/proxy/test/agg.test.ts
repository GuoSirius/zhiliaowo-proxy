import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeCounts, mergeMax } from '../lib/report/agg.js';

test('mergeCounts: 累加同 key，缺失 key 补 0', () => {
  const target: Record<string, number> = { a: 1, b: 2 };
  mergeCounts(target, JSON.stringify({ a: 3, c: 5 }));
  assert.deepEqual(target, { a: 4, b: 2, c: 5 });
});

test('mergeCounts: src 为 null/空/非法 JSON 时跳过', () => {
  const target: Record<string, number> = { a: 1 };
  mergeCounts(target, null);
  mergeCounts(target, '');
  mergeCounts(target, '{bad json');
  assert.deepEqual(target, { a: 1 });
});

test('mergeCounts: 多个月份累加', () => {
  const target: Record<string, number> = {};
  mergeCounts(target, JSON.stringify({ x: 2 }));
  mergeCounts(target, JSON.stringify({ x: 3, y: 1 }));
  mergeCounts(target, JSON.stringify({ x: 5 }));
  assert.deepEqual(target, { x: 10, y: 1 });
});

test('mergeMax: 取同 key 最大值', () => {
  const target: Record<string, number> = { a: 5, b: 2 };
  mergeMax(target, JSON.stringify({ a: 9, b: 1, c: 7 }));
  assert.deepEqual(target, { a: 9, b: 2, c: 7 });
});

test('mergeMax: src 缺失/非法时跳过', () => {
  const target: Record<string, number> = { a: 5 };
  mergeMax(target, null);
  mergeMax(target, 'not json');
  assert.deepEqual(target, { a: 5 });
});
