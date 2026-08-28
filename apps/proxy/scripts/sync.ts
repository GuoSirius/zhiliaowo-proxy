import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { resolveBrandFlexible } from '../config/brands.js';
import { ZhiliaowoClient } from '../lib/zhiliaowo.js';
import { MemoryCache } from '../lib/cache.js';
import { migrateReportDb } from '../lib/report/db.js';
import { syncYear } from '../lib/report/sync.js';
import { parseArgs } from './parse-args.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 统一从仓库根 .env 读取（与 index.ts 一致）
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const brandKey = String(args.brand ?? '');
  const yearRaw = String(args.year ?? '');
  const force = !!args.force;

  if (!brandKey || !yearRaw) {
    console.error('用法: tsx scripts/sync.ts --brand=procell --year=2025 [--force]');
    process.exit(1);
  }
  const year = Number(yearRaw);
  if (!Number.isInteger(year)) {
    console.error(`year 无效: ${yearRaw}`);
    process.exit(1);
  }

  const brand = resolveBrandFlexible(brandKey);
  migrateReportDb();
  const client = new ZhiliaowoClient(new MemoryCache());

  console.log(`[sync] 开始同步 ${brand.label} ${year}（force=${force}）`);
  const t0 = Date.now();
  const result = await syncYear(client, brand, year, {
    force,
    onProgress: (p) => {
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
      `✅ 同步完成 ${brand.label} ${year}：拉取 ${result.pagesFetched}/${result.pages} 页，` +
        `落库 ${result.inserted} 条，失败页 ${result.failedPages}，耗时 ${(result.durationMs / 1000).toFixed(1)}s`,
    );
  }
}

main().catch((e) => {
  console.error('[sync] 失败:', e);
  process.exit(1);
});
