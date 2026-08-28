import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

/**
 * 报告数据层（6 板块海报）—— 独立 SQLite 库，与 H5 库分离。
 * 路径按模块文件定位（而非 process.cwd），避免 CLI / 服务启动时 cwd 不一致导致读写不同库。
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.REPORT_DB_PATH ?? resolve(__dirname, '..', '..', 'data', 'report.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const reportDb = new Database(DB_PATH);
reportDb.pragma('journal_mode = WAL');

/** 启动时建表（幂等），服务与 CLI 各自调用一次即可 */
export function migrateReportDb(): void {
  reportDb.exec(`
    CREATE TABLE IF NOT EXISTS zlw_papers (
      id         TEXT PRIMARY KEY,
      brand      TEXT NOT NULL,
      year       INTEGER NOT NULL,
      month      INTEGER NOT NULL,
      pub_time   TEXT NOT NULL,
      doi        TEXT,
      title      TEXT,
      journal    TEXT,
      factor     REAL,
      authors    TEXT,
      url        TEXT,
      cn_fields  TEXT,
      products   TEXT,
      raw        TEXT NOT NULL,
      synced_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_papers_brand_year ON zlw_papers(brand, year);
    CREATE INDEX IF NOT EXISTS idx_papers_pubtime    ON zlw_papers(brand, pub_time);

    CREATE TABLE IF NOT EXISTS zlw_papers_agg (
      brand          TEXT NOT NULL,
      year           INTEGER NOT NULL,
      month          INTEGER NOT NULL,
      paper_count    INTEGER,
      total_factor   REAL,
      factor_ge10    INTEGER,
      max_factor     REAL,
      avg_factor     REAL,
      journal_counts TEXT,
      hotspot_counts TEXT,
      computed_at    TEXT,
      source_version TEXT,
      PRIMARY KEY (brand, year, month)
    );

    CREATE TABLE IF NOT EXISTS zlw_sync_state (
      brand          TEXT NOT NULL,
      year           INTEGER NOT NULL,
      total_count    INTEGER,
      last_synced_at TEXT,
      status         TEXT,
      duration_ms    INTEGER,
      PRIMARY KEY (brand, year)
    );
  `);
}

export interface SyncStateRow {
  brand: string;
  year: number;
  total_count: number | null;
  last_synced_at: string | null;
  status: string | null;
  duration_ms: number | null;
}

export function getSyncState(brand: string, year: number): SyncStateRow | undefined {
  return reportDb
    .prepare('SELECT * FROM zlw_sync_state WHERE brand=? AND year=?')
    .get(brand, year) as SyncStateRow | undefined;
}

export function localPaperCount(brand: string, year: number): number {
  const row = reportDb
    .prepare('SELECT COUNT(*) AS c FROM zlw_papers WHERE brand=? AND year=?')
    .get(brand, year) as { c: number };
  return row.c;
}

// 模块加载即建表（幂等），确保后续 import 该模块时的 prepare 不会因表不存在而失败
migrateReportDb();
