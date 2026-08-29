import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { BRANDS, resolveBrand, resolveBrandFlexible } from '../config/brands.js';
import { recomputeYearAgg } from '../lib/report/sync.js';
import { reportDb } from '../lib/report/db.js';
import { parseArgs } from './parse-args.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 统一从仓库根 .env 读取（与 sync.ts 一致）
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

// 用法:
//   pnpm --filter zhiliaowo-proxy recompute --brand=procell --year=2025
//   pnpm --filter zhiliaowo-proxy recompute --all            # 全品牌 × 全部已同步年份
//   pnpm --filter zhiliaowo-proxy recompute procell 2025     # 位置参数兼容（旧写法）
// 仅从本地 zlw_papers 重算月度聚合，不请求知了窝 API。
const args = parseArgs(process.argv.slice(2));
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const brandInput = String(args.brand ?? positional[0] ?? 'procell');
const yearRaw = String(args.year ?? positional[1] ?? 2025);

if (!brandInput) {
  console.error('用法: recompute --brand=procell --year=2025');
  process.exit(1);
}
const year = Number(yearRaw);
if (!Number.isInteger(year)) {
  console.error(`year 无效: ${yearRaw}`);
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
console.log(`[recompute] ${brand.brand} ${year} 开始重算聚合（仅本地，不请求 API）...`);
const r = recomputeYearAgg(brand, year);
checkpoint();
console.log(`[recompute] 完成: months=${r.months}, localPapers=${r.localPapers}（已 checkpoint）`);
