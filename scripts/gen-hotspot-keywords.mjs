#!/usr/bin/env node
/**
 * 研究热点关键词生成脚本
 * 扫描 data/hotspot-keywords/*.xlsx（品牌各一份，文件名即 brandKey），
 * 解析 Sheet1（A 列=中文热点名，B 列=英文关键词逗号分隔），
 * 生成 apps/proxy/config/hotspots/<brandKey>.json 供本地匹配使用。
 *
 * 用法：
 *   node scripts/gen-hotspot-keywords.mjs
 *   node scripts/gen-hotspot-keywords.mjs --src=其它目录 --out=其它目录
 *   node scripts/gen-hotspot-keywords.mjs --file=data/hotspot-keywords/procell.xlsx --brand=procell
 *
 * 输出结构：{ brandKey, generatedAt, items: [{ cn, keywords: string[] }] }
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'node-xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { src: null, out: null, file: null, brand: null };
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const SRC_DIR = resolve(ROOT, args.src ?? 'data/hotspot-keywords');
const OUT_DIR = resolve(ROOT, args.out ?? 'apps/proxy/config/hotspots');

function splitKeywords(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseSheet(buf, brandKey) {
  const sheets = xlsx.parse(buf);
  if (!sheets.length) throw new Error(`[${brandKey}] 工作簿无工作表`);
  const rows = sheets[0].data;
  const items = [];
  // 跳过表头（第 1 行），数据从第 2 行起
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const cn = String(row[0] ?? '').trim();
    const keywords = splitKeywords(row[1]);
    if (!cn || keywords.length === 0) continue;
    items.push({ cn, keywords });
  }
  return items;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const files = args.file
    ? [resolve(ROOT, args.file)]
    : readdirSync(SRC_DIR)
        .filter((f) => /\.xlsx$/i.test(f))
        .map((f) => join(SRC_DIR, f));

  if (!files.length) {
    console.warn(`[gen-hotspot] 未找到 xlsx 文件（src=${SRC_DIR}）`);
    return;
  }

  let total = 0;
  for (const file of files) {
    const fallbackKey = args.brand ?? file.replace(/\\/g, '/').split('/').pop().replace(/\.xlsx$/i, '').toLowerCase();
    const brandKey = args.brand ?? fallbackKey;
    const buf = readFileSync(file);
    const items = parseSheet(buf, brandKey);
    const out = {
      brandKey,
      generatedAt: new Date().toISOString(),
      items,
    };
    const outPath = join(OUT_DIR, `${brandKey}.json`);
    writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`[gen-hotspot] ${brandKey}: ${items.length} 个热点 -> ${outPath}`);
    total += items.length;
  }
  console.log(`[gen-hotspot] 完成，共 ${total} 个热点`);
}

main();
