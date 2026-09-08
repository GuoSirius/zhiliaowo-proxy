import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { resolveBrandFlexible } from '../config/brands.js';
import { ZhiliaowoClient } from '../lib/zhiliaowo.js';
import { MemoryCache } from '../lib/cache.js';
import { migrateReportDb } from '../lib/report/db.js';
import { syncYear, CONCURRENCY_INFO } from '../lib/report/sync.js';
import { parseArgs } from './parse-args.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 统一从仓库根 .env 读取（与 index.ts 一致）
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

function usage(): never {
  console.error('用法: tsx scripts/sync.ts --brand=procell --year=2025 [--force]');
  console.error('      tsx scripts/sync.ts --brand=procell --fromYear=2008 [--toYear=2026] [--force]');
  console.error('      （--toYear 缺省默认当前真实年份；--year 与 --fromYear/--toYear 二选一）');
  process.exit(1);
}

function parseYear(raw: string | boolean | undefined, label: string): number | null {
  if (raw == null || raw === '' || raw === true) return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) {
    console.error(`${label} 无效: ${raw}`);
    process.exit(1);
  }
  return n;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const brandKey = String(args.brand ?? '');
  const nowYear = new Date().getFullYear();
  const singleYear = parseYear(args.year, 'year');
  // 与 recompute 保持一致：--year 单年 / --fromYear~--toYear 区间；
  // 缺省时 toYear 默认「当前真实年份」，fromYear 再缺省则取 toYear（即单年 = 当前年）。
  const fromYear = parseYear(args.fromYear, 'fromYear') ?? singleYear ?? nowYear;
  const toYear = parseYear(args.toYear, 'toYear') ?? singleYear ?? nowYear;
  const force = !!args.force;

  if (!brandKey || fromYear > toYear) {
    usage();
  }

  const brand = resolveBrandFlexible(brandKey);
  console.log(
    `[sync] 品牌=${brand.label} 年份范围=${fromYear}-${toYear}` +
      (args.toYear == null && args.year == null ? `（toYear 默认当前年 ${nowYear}）` : '') +
      ` force=${force} 并发=${CONCURRENCY_INFO}`,
  );
  migrateReportDb();
  const client = new ZhiliaowoClient(new MemoryCache());

  let totalInserted = 0;
  let totalFetched = 0;
  const tAll = Date.now();

  for (let year = fromYear; year <= toYear; year++) {
    console.log(`[sync] 开始同步 ${brand.label} ${year}（force=${force}）`);
    const t0 = Date.now();
    // 上游每页上限 15 条，页数可达数百，按整百分点 + 首尾页节流输出，避免日志爆炸
    let lastPct = -1;
    const result = await syncYear(client, brand, year, {
      force,
      onProgress: (p) => {
        const pctInt = Math.floor(p.pct);
        const isLast = p.page === p.totalPages;
        if (pctInt === lastPct && !isLast) return;
        lastPct = pctInt;
        console.log(
          `[${brand.label} ${year}] 第 ${p.page}/${p.totalPages} 页  本页 ${p.pageItems} 条 (${p.pageMs}ms)  ` +
            `累计 ${p.fetched}/${p.total} (${p.pct.toFixed(1)}%)  已用时 ${(p.elapsedMs / 1000).toFixed(1)}s  ` +
            `预计剩余 ${(p.etaMs / 1000).toFixed(1)}s`,
        );
      },
    });

    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    if (result.skipped) {
      console.log(`✅ 已是最新，跳过同步（${brand.label} ${year}，共 ${result.totalCount} 篇），耗时 ${sec}s`);
    } else {
      console.log(
        `✅ 同步完成 ${brand.label} ${year}：拉取 ${result.pagesFetched}/${result.pages} 页` +
          `（上游每页生效 ${result.effectivePageSize} 条），落库 ${result.inserted} 条，` +
          `失败页 ${result.failedPages}，补拉 ${result.refilledPages} 页，` +
          `耗时 ${(result.durationMs / 1000).toFixed(1)}s` +
          (result.shortfall > 0 ? `  ⚠️ 缺口 ${result.shortfall} 条` : ''),
      );
      totalInserted += result.inserted;
      totalFetched += result.totalCount ?? 0;
    }
  }

  const totalSec = ((Date.now() - tAll) / 1000).toFixed(1);
  console.log(
    `[sync] ${brand.label} ${fromYear}-${toYear} 全部完成，总计落库 ${totalInserted} 条，` +
      `拉取 ${totalFetched} 篇，总耗时 ${totalSec}s`,
  );
}

main().catch((e) => {
  console.error('[sync] 失败:', e);
  process.exit(1);
});
