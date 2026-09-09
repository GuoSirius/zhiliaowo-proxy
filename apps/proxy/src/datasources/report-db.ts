import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { env } from '../shared/env.js';

/**
 * 报告数据层（6 板块海报）—— 独立 SQLite 库（report.db）。
 * 路径按模块文件定位（而非 process.cwd），避免 CLI / 服务启动时 cwd 不一致导致读写不同库。
 */
const DB_PATH = env.report.dbPath;
mkdirSync(dirname(DB_PATH), { recursive: true });

export const reportDb = new Database(DB_PATH);
reportDb.pragma('journal_mode = WAL');

/** 启动时建表（幂等），服务与 CLI 各自调用一次即可 */
export function migrateReportDb(): void {
  reportDb.exec(`
    CREATE TABLE IF NOT EXISTS zlw_papers (
      id         TEXT NOT NULL,
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
      synced_at  TEXT NOT NULL,
      deleted_at TEXT,
      PRIMARY KEY (id, brand)
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
      journal_counts TEXT,
      hotspot_counts TEXT,
      hotspot_max_if TEXT,
      computed_at    TEXT,
      synced_total   TEXT,
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

  // 对已有库做向后兼容迁移（新库由上面 CREATE 直接建好，这里不执行）
  migratePapersPrimaryKey();
  applyAggColumnMigrations();
  applyPapersSoftDeleteMigration();
}

/**
 * 原始文献表主键迁移：
 * 旧版本主键为单列 id，不同品牌共享知了窝 id 空间会导致互相覆盖。
 * 改为复合主键 (id, brand)，让同一 id 在不同品牌下独立存储。
 * 幂等：仅当检测到旧主键时才重建表。
 */
function migratePapersPrimaryKey(): void {
  const info = reportDb.pragma('table_info(zlw_papers)') as Array<{ name: string; pk: number }>;
  const pkCols = info
    .filter((c) => c.pk > 0)
    .sort((a, b) => a.pk - b.pk)
    .map((c) => c.name);
  if (pkCols.length === 1 && pkCols[0] === 'id') {
    console.log('[db] 检测到旧版 zlw_papers 主键为单列 id，重建为复合主键 (id, brand)...');
    reportDb.exec(`
      CREATE TABLE zlw_papers_new (
        id         TEXT NOT NULL,
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
        synced_at  TEXT NOT NULL,
        deleted_at TEXT
      );
      INSERT INTO zlw_papers_new SELECT *, NULL FROM zlw_papers;
      DROP TABLE zlw_papers;
      ALTER TABLE zlw_papers_new RENAME TO zlw_papers;
      CREATE INDEX IF NOT EXISTS idx_papers_brand_year ON zlw_papers(brand, year);
      CREATE INDEX IF NOT EXISTS idx_papers_pubtime    ON zlw_papers(brand, pub_time);
    `);
    console.log('[db] 主键迁移完成');
  }
}

/**
 * 聚合表列迁移：
 * - F7：source_version（实际存的是同步总数，语义误导）→ 改名 synced_total
 * - F13：删除从不被读取的死列 avg_factor
 * - F1：新增热点最高 IF 列 hotspot_max_if
 * 全部带存在性守卫，可重复执行（幂等）。
 */
function applyAggColumnMigrations(): void {
  const info = reportDb.pragma('table_info(zlw_papers_agg)') as Array<{ name: string }>;
  const cols = new Set(info.map((c) => c.name));

  if (cols.has('source_version') && !cols.has('synced_total')) {
    reportDb.exec('ALTER TABLE zlw_papers_agg RENAME COLUMN source_version TO synced_total');
    cols.delete('source_version');
    cols.add('synced_total');
  }
  if (cols.has('avg_factor')) {
    reportDb.exec('ALTER TABLE zlw_papers_agg DROP COLUMN avg_factor');
    cols.delete('avg_factor');
  }
  if (!cols.has('hotspot_max_if')) {
    reportDb.exec('ALTER TABLE zlw_papers_agg ADD COLUMN hotspot_max_if TEXT');
    cols.add('hotspot_max_if');
  }
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

/**
 * 软删除列迁移：zlw_papers 增加 deleted_at（NULL=活跃，非 NULL=上游已失效的文献）。
 * - 列与 idx_papers_active 索引都在此处确保存在：老库先 ALTER 加列再建索引；新库 CREATE TABLE 已带列，直接建索引。
 * - 不能把索引建进上面的 CREATE TABLE exec：老库 CREATE TABLE 是 no-op（表已存在无该列），同段建索引会报 no such column。
 */
function applyPapersSoftDeleteMigration(): void {
  const info = reportDb.pragma('table_info(zlw_papers)') as Array<{ name: string }>;
  const cols = new Set(info.map((c) => c.name));
  if (!cols.has('deleted_at')) {
    console.log('[db] zlw_papers 增加软删除列 deleted_at...');
    reportDb.exec('ALTER TABLE zlw_papers ADD COLUMN deleted_at TEXT');
    console.log('[db] 软删除列迁移完成');
  }
  reportDb.exec('CREATE INDEX IF NOT EXISTS idx_papers_active ON zlw_papers(brand, year, deleted_at)');
}

/** 活跃文献数（不含软删除），用于同步幂等校验 */
export function localPaperCount(brand: string, year: number): number {
  const row = reportDb
    .prepare('SELECT COUNT(*) AS c FROM zlw_papers WHERE brand=? AND year=? AND deleted_at IS NULL')
    .get(brand, year) as { c: number };
  return row.c;
}

// 模块加载即建表（幂等），确保后续 import 该模块时的 prepare 不会因表不存在而失败
migrateReportDb();

// ---------- 预编译写入语句（供同步 / 重算使用） ----------
// 放在本模块可确保「建表 → prepare」顺序正确，调用方无需关心初始化时机。

export const upsertPaperStmt = reportDb.prepare(`
  INSERT INTO zlw_papers
    (id, brand, year, month, pub_time, doi, title, journal, factor, authors, url, cn_fields, products, raw, synced_at, deleted_at)
  VALUES
    (@id, @brand, @year, @month, @pub_time, @doi, @title, @journal, @factor, @authors, @url, @cn_fields, @products, @raw, @synced_at, NULL)
  ON CONFLICT(id, brand) DO UPDATE SET
    year=excluded.year, month=excluded.month, pub_time=excluded.pub_time,
    doi=excluded.doi, title=excluded.title, journal=excluded.journal, factor=excluded.factor,
    authors=excluded.authors, url=excluded.url, cn_fields=excluded.cn_fields,
    products=excluded.products, raw=excluded.raw, synced_at=excluded.synced_at,
    deleted_at=NULL
`);

export const upsertAggStmt = reportDb.prepare(`
  INSERT INTO zlw_papers_agg
    (brand, year, month, paper_count, total_factor, factor_ge10, max_factor, journal_counts, hotspot_counts, hotspot_max_if, computed_at, synced_total)
  VALUES
    (@brand, @year, @month, @paper_count, @total_factor, @factor_ge10, @max_factor, @journal_counts, @hotspot_counts, @hotspot_max_if, @computed_at, @synced_total)
  ON CONFLICT(brand, year, month) DO UPDATE SET
    paper_count=excluded.paper_count, total_factor=excluded.total_factor, factor_ge10=excluded.factor_ge10,
    max_factor=excluded.max_factor, journal_counts=excluded.journal_counts,
    hotspot_counts=excluded.hotspot_counts, hotspot_max_if=excluded.hotspot_max_if,
    computed_at=excluded.computed_at, synced_total=excluded.synced_total
`);

export const upsertStateStmt = reportDb.prepare(`
  INSERT INTO zlw_sync_state (brand, year, total_count, last_synced_at, status, duration_ms)
  VALUES (@brand, @year, @total_count, @last_synced_at, @status, @duration_ms)
  ON CONFLICT(brand, year) DO UPDATE SET
    total_count=excluded.total_count, last_synced_at=excluded.last_synced_at,
    status=excluded.status, duration_ms=excluded.duration_ms
`);
