import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';
import { resolveBrandByName } from '../config/brands.js';
import { recomputeYearAgg } from '../lib/report/sync.js';
import { reportDb } from '../lib/report/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 统一从仓库根 .env 读取（与 sync.ts 一致）
dotenv.config({ path: resolve(__dirname, '..', '..', '..', '.env') });

// 用法: tsx scripts/recompute-agg.ts [brandName=Procell] [year=2025]
// 仅从本地 zlw_papers 重算月度聚合，不请求知了窝 API。
const brandName = process.argv[2] ?? 'Procell';
const year = Number(process.argv[3] ?? 2025);

const brand = resolveBrandByName(brandName);
console.log(`[recompute] ${brand.brand} ${year} 开始重算聚合（仅本地，不请求 API）...`);
const r = recomputeYearAgg(brand, year);
// 将 WAL 落盘到主库，确保 git 跟踪的 report.db 字节同步（否则重算结果只存在于 -wal 文件）
reportDb.pragma('wal_checkpoint(TRUNCATE)');
console.log(`[recompute] 完成: months=${r.months}, localPapers=${r.localPapers}（已 checkpoint）`);
