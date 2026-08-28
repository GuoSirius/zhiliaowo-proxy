import { test } from 'node:test';
import assert from 'node:assert/strict';
import { round, pct } from '../lib/report/calc.js';

test('round: 默认 2 位小数', () => {
  assert.equal(round(3.14159), 3.14);
});

test('round: 指定小数位', () => {
  assert.equal(round(2.71828, 3), 2.718);
});

test('round: 负数与整数（整数补零对齐）', () => {
  assert.equal(round(-1.2345, 2), -1.23);
  assert.equal(round(10, 2), 10);
});

test('round: 非有限值（NaN/Infinity）安全返回 0', () => {
  assert.equal(round(NaN), 0);
  assert.equal(round(Number('abc')), 0);
  assert.equal(round(Infinity), 0);
});

test('pct: 正常同比增长', () => {
  // (120-100)/100*100 = 20
  assert.equal(pct(120, 100), 20);
});

test('pct: 同比下降为负', () => {
  assert.equal(pct(80, 100), -20);
});

test('pct: prev<=0 返回 null（无法计算同比）', () => {
  assert.equal(pct(100, 0), null);
  assert.equal(pct(100, -5), null);
});

test('pct: 非有限值返回 null', () => {
  assert.equal(pct(Infinity, 100), null);
  assert.equal(pct(100, Infinity), null);
});

test('pct: 指定小数位', () => {
  // (115-100)/100*100 = 15.0，保留 2 位 = 15
  assert.equal(pct(115, 100, 2), 15);
});
