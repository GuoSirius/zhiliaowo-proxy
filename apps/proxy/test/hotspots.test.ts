import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyHotspot, type HotspotEntry } from '../lib/report/hotspots.js';

function mk(cn: string, keywords: string[]): HotspotEntry {
  return {
    cn,
    keywords,
    regexes: keywords.map((k) => new RegExp(`\\b${k}\\b`, 'i')),
  };
}

const hotspots = [mk('铁死亡', ['ferroptosis']), mk('凋亡', ['apoptosis'])];

test('classifyHotspot: 命中单热点返回其名', () => {
  assert.equal(classifyHotspot('Ferroptosis in cancer cells', hotspots), '铁死亡');
});

test('classifyHotspot: 大小写不敏感', () => {
  assert.equal(classifyHotspot('APOPTOSIS AND P53', hotspots), '凋亡');
});

test('classifyHotspot: 无命中返回 null', () => {
  assert.equal(classifyHotspot('some unrelated title about metabolism', hotspots), null);
});

test('classifyHotspot: 空/undefined/空串标题返回 null', () => {
  assert.equal(classifyHotspot(null, hotspots), null);
  assert.equal(classifyHotspot(undefined, hotspots), null);
  assert.equal(classifyHotspot('', hotspots), null);
});

test('classifyHotspot: 多命中取词数最多者为主热点', () => {
  const hs = [mk('A', ['a', 'b']), mk('B', ['c'])];
  assert.equal(classifyHotspot('a and b mechanism', hs), 'A');
});
