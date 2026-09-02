import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { BRANDS, resolveBrand } from '../config/brands.js';
import { ZhiliaowoClient } from '../lib/zhiliaowo.js';
import { MemoryCache } from '../lib/cache.js';
import { migrateReportDb } from '../lib/report/db.js';
import { syncYear, CONCURRENCY_INFO } from '../lib/report/sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

/**
 * 定时任务入口：同步全部品牌「当前年 + 上一年」（上一年用于板块 5 同比 / 板块 2 同比）。
 * 由 crontab / 宝塔计划任务 / WorkBuddy 定时任务每天 03:10 调用：
 *   tsx scripts/sync-current.ts
 * 仅落库 + 重算聚合，不启服务。
 */
async function main() {
  console.log(`[sync-current] 并发=${CONCURRENCY_INFO}`);
  migrateReportDb();
  const client = new ZhiliaowoClient(new MemoryCache());
  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() - 1];
  const brandKeys = Object.keys(BRANDS);

  for (const key of brandKeys) {
    const brand = resolveBrand(key);
    for (const year of years) {
      console.log(`[sync-current] 开始 ${brand.label} ${year}`);
      try {
        // 上游每页上限 15 条，页数可达数百，按整百分点 + 首尾页节流输出
        let lastPct = -1;
        const r = await syncYear(client, brand, year, {
          onProgress: (p) => {
            const pctInt = Math.floor(p.pct);
            const isLast = p.page === p.totalPages;
            if (pctInt === lastPct && !isLast) return;
            lastPct = pctInt;
            console.log(
              `[${brand.label} ${year}] 第 ${p.page}/${p.totalPages} 页（每页 ${p.pageItems} 条）` +
                ` 累计 ${p.fetched}/${p.total} (${p.pct.toFixed(1)}%)`,
            );
          },
        });
        if (r.skipped) {
          console.log(`[sync-current] ${brand.label} ${year} 已是最新，跳过`);
        } else {
          console.log(
            `[sync-current] ${brand.label} ${year} 完成：落库 ${r.inserted} 条（上游 ${r.totalCount} 篇 / ${r.pages} 页，` +
              `每页生效 ${r.effectivePageSize} 条），失败 ${r.failedPages} 页，补拉 ${r.refilledPages} 页` +
              (r.shortfall > 0 ? `  ⚠️ 缺口 ${r.shortfall} 条` : ''),
          );
        }
      } catch (e) {
        console.error(`[sync-current] ${brand.label} ${year} 失败:`, e);
      }
    }
  }
  console.log('[sync-current] 全部完成');
}

main().catch((e) => {
  console.error('[sync-current] 异常:', e);
  process.exit(1);
});
