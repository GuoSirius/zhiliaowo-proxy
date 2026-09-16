#!/usr/bin/env node
'use strict';
// 只读交叉校验：report.db 中「当前年 + 上一年」各 brand 的
// 明细计数(zlw_papers) 与 月度聚合(zlw_papers_agg) 是否一致。
//
// 关键约定（已从事实测 schema 确认）：
//   brand 列真实取值为首字母大写 'Elabscience' / 'Procell'，绝非小写。
//   此前多次手敲脚本误用小写导致查到 0 行，又因 d===a 在双零时哑过静默 OK。
//
// 彻底修复（2026-09-16 重写）：
//   1. 年份动态 = 当前年 + 上一年（按上海时区取，避免跨年时区错位），不再写死 2025/2026。
//      例：2027 年运行自动校验 2027 + 2026。
//   2. brand 动态 = 从库内 DISTINCT brand 读取，新增品牌自动覆盖。
//   3. schema 自检：关键列缺失直接 FAIL，杜绝列名变更导致双零哑过。
//   4. 月份桶校验：仅当该年有聚合行时才要求 =13（上游真 0 篇则跳过，避免年初空数据误报）。
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const tz = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(tz);
dayjs.tz.setDefault('Asia/Shanghai');

const ROOT = path.resolve(__dirname, '..');
const dataDir = path.join(ROOT, 'data');
// 数据库名固定 report.db，不扫描 data 目录取第一个 .db，避免误读其它库
const dbFile = 'report.db';
const dbPath = path.join(dataDir, dbFile);
if (!fs.existsSync(dbPath)) {
  console.error('[verify] 未找到 data/report.db');
  process.exit(2);
}
const db = new Database(dbPath, { readonly: true });

// 动态年份：当前年 + 上一年（上海时区）
const curYear = dayjs.tz().year();
const years = [curYear, curYear - 1];

// 动态 brand + schema 自检
const papersCols = db.prepare("SELECT name FROM pragma_table_info('zlw_papers')").all().map((r) => r.name);
const aggCols = db.prepare("SELECT name FROM pragma_table_info('zlw_papers_agg')").all().map((r) => r.name);
for (const need of ['brand', 'year']) {
  if (!papersCols.includes(need)) {
    console.error(`[verify] zlw_papers 缺少列 ${need}`);
    process.exit(2);
  }
}
for (const need of ['brand', 'year', 'month', 'paper_count']) {
  if (!aggCols.includes(need)) {
    console.error(`[verify] zlw_papers_agg 缺少列 ${need}`);
    process.exit(2);
  }
}
const brands = db.prepare('SELECT DISTINCT brand FROM zlw_papers').all().map((r) => r.brand);
if (!brands.length) {
  console.error('[verify] zlw_papers 无任何 brand');
  process.exit(2);
}

let failed = false;
console.log(`[verify] DB=${dbFile}  校验年份=${years.join(',')}  brands=${brands.join('/')}`);
const total = db.prepare('SELECT count(*) c FROM zlw_papers').get().c;
console.log(`[verify] zlw_papers 总行数 = ${total}`);

for (const brand of brands) {
  for (const year of years) {
    const detail = db.prepare('SELECT count(*) c FROM zlw_papers WHERE brand=? AND year=?').get(brand, year).c;
    const aggSum = db.prepare('SELECT COALESCE(SUM(paper_count),0) s FROM zlw_papers_agg WHERE brand=? AND year=?').get(brand, year).s;
    const aggMonths = db.prepare('SELECT count(*) c FROM zlw_papers_agg WHERE brand=? AND year=?').get(brand, year).c;
    let ok = detail === aggSum;
    let note = '';
    if (aggMonths > 0 && aggMonths !== 13) {
      ok = false;
      note = ` 月份桶=${aggMonths}(应为13)`;
    }
    if (!ok) failed = true;
    console.log(`[verify] ${brand} ${year}: detail=${detail} agg=${aggSum} months=${aggMonths}${note} ${ok ? 'OK' : 'FAIL'}`);
  }
}

const aggRows = db.prepare('SELECT count(*) c FROM zlw_papers_agg').get().c;
const syncRows = db.prepare('SELECT count(*) c FROM zlw_sync_state').get().c;
const syncState = db.prepare('SELECT status, count(*) c FROM zlw_sync_state GROUP BY status').all();
console.log(`[verify] zlw_papers_agg 行数 = ${aggRows}, zlw_sync_state 行数 = ${syncRows}, sync_state=${JSON.stringify(syncState)}`);

db.close();
if (failed) {
  console.error('[verify] 交叉校验存在不一致，请检查');
  process.exit(1);
}
console.log('[verify] 交叉校验全部通过');
process.exit(0);
