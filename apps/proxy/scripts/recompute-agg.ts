import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { BRANDS, resolveBrand, resolveBrandFlexible } from '../config/brands.js';
import { recomputeYearAgg } from '../lib/report/sync.js';
import { reportDb, localPaperCount } from '../lib/report/db.js';
import { parseArgs } from './parse-args.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 统一从仓库根 .env 读取（与 sync.ts 一致）
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

// 用法（与 sync 保持一致）:
//   pnpm --filter zhiliaowo-proxy recompute --brand=procell --year=2025
//   pnpm --filter zhiliaowo-proxy recompute --brand=procell --fromYear=2008 [--toYear=2026]
//   pnpm --filter zhiliaowo-proxy recompute procell 2025        # 位置参数兼容（旧写法）
//   pnpm --filter zhiliaowo-proxy recompute --all               # 全品牌 × 全部已同步年份
// 仅从本地 zlw_papers 重算月度聚合，不请求知了窝 API。
// --toYear 缺省时默认「当前真实年份」；--year 与 --fromYear/--toYear 二选一。
const args = parseArgs(process.argv.slice(2));
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const nowYear = new Date().getFullYear();

const brandInput = String(args.brand ?? positional[0] ?? 'procell');

function parseYear(raw: string | boolean | undefined, label: string): number | null {
  if (raw == null || raw === '' || raw === true) return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    console.error(`${label} 无效: ${raw}`);
    process.exit(1);
  }
  return n;
}

const singleYear = positional[1] != null ? parseYear(positional[1], 'year') : parseYear(args.year, 'year');
const fromYear = parseYear(args.fromYear, 'fromYear') ?? singleYear ?? nowYear;
const toYear = parseYear(args.toYear, 'toYear') ?? singleYear ?? nowYear;

if (!brandInput) {
  console.error('用法: recompute --brand=procell --year=2025 [--fromYear=.. --toYear=..] [--all]');
  process.exit(1);
}

// 将 WAL 落盘到主库，确保 git 跟踪的 report.db 字节同步（否则重算结果只存在于 -wal 文件）
function checkpoint(): void {
  reportDb.pragma('wal_checkpoint(TRUNCATE)');
}

if (args.all === true) {
  const brands = Object.keys(BRANDS).map((k) => resolveBrand(k));
  let total = 0;
  for (const b of brands) {
    const years = reportDb
      .prepare(`SELECT DISTINCT year FROM zlw_papers WHERE brand=? ORDER BY year`)
      .all(b.brand) as Array<{ year: number }>;
    if (years.length === 0) {
      console.log(`[recompute] ${b.brand}: 无本地文献，跳过`);
      continue;
    }
    console.log(`[recompute] ${b.brand}: ${years.length} 个年份（${years[0].year}-${years[years.length - 1].year}）`);
    for (const { year: y } of years) {
      const r = recomputeYearAgg(b, y);
      total += r.localPapers;
      console.log(`  ${y}: months=${r.months}, papers=${r.localPapers}`);
    }
  }
  checkpoint();
  console.log(`[recompute] 全部完成: ${total} 篇（已 checkpoint）`);
  process.exit(0);
}

const brand = resolveBrandFlexible(brandInput);
console.log(
  `[recompute] ${brand.brand} 年份范围 ${fromYear}-${toYear}` +
    (args.toYear == null && args.year == null ? `（toYear 默认当前年 ${nowYear}）` : '') +
    ` 开始重算聚合（仅本地，不请求 API）...`,
);
let total = 0;
for (let year = fromYear; year <= toYear; year++) {
  const cnt = localPaperCount(brand.brand, year);
  if (cnt === 0) {
    console.log(`[recompute] ${brand.brand} ${year}: 本地无文献，跳过`);
    continue;
  }
  const r = recomputeYearAgg(brand, year);
  total += r.localPapers;
  console.log(`  ${year}: months=${r.months}, papers=${r.localPapers}`);
}
checkpoint();
console.log(`[recompute] 完成: ${total} 篇（已 checkpoint）`);
