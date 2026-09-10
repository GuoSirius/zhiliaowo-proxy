import { env } from '../shared/env.js';
import type { ResolvedSite } from '../config/brands.js';

/**
 * 四站点生产库（只读）数据源。
 *
 * 用途：板块 5 产品引用 Top 的「中文名 / 分类」来自各站点生产 MySQL（按 site.dbPrefix 区分表），
 * 知了窝 API 不返回这些字段，故在此只读回查。文献/统计等 brand 级数据不走这里。
 *
 * 只读是**硬约束**：本模块只发 SELECT，绝不执行任何写入/DDL/DML（env.prodMysqlForSite().readonly 恒定 true）。
 *
 * 各站点账号/密码/库名不同：连接参数由 env.prodMysqlForSite(site.key, site.brandKey) 解析
 * （站点级变量优先、品牌级回退、全局兜底）。每个站点**独立连接池**（以 site.key 为 key 缓存），
 * 缺凭据/未启用/出错时 getProdMysql(site) 返回 null，调用方优雅降级。
 *
 * ⚠️ 运行时依赖 `mysql2/promise`：由用户侧 `pnpm install` 安装（本仓库不内置）。
 * 为避免在「未安装驱动」时 tsc 报错，这里用**变量说明符** `import(spec)` 做动态加载——
 * TypeScript 对变量说明符的动态 import 返回 `Promise<any>`，不解析模块、不需 node_modules 中存在 mysql2。
 * 启用 PROD_MYSQL_<SITE>_ENABLED=1 且已安装 mysql2 时即正常运行；禁用或驱动缺失时返回 null，调用方降级。
 */

export interface ProdMysqlClient {
  /** 执行查询，返回行数组（已解包 [rows, fields]） */
  query: <T = Record<string, unknown>>(sql: string, params: unknown[]) => Promise<T[]>;
  /** 关闭连接池（进程退出时调用；连接池本身随进程常驻） */
  close: () => Promise<void>;
}

/** 某站点是否启用：开关开启且凭据/库名齐全才视为可用（缺任一项 → 不连库，调用方返回原数据） */
export function prodMysqlEnabledForSite(site: ResolvedSite): boolean {
  const c = env.prodMysqlForSite(site.key, site.brandKey);
  return !!(c.enabled && c.user && c.password && c.database);
}

/** 站点级连接池缓存（site.key → 初始化 Promise，进程内每个站点单例） */
const poolMap = new Map<string, Promise<ProdMysqlClient>>();

/**
 * 惰性建立某站点的只读连接池。
 * - 未启用/缺凭据 → 返回 null（调用方无需判错，直接降级）。
 * - 已启用 → 首次调用时动态 import mysql2 建池，后续复用同一站点池。
 */
export async function getProdMysql(site: ResolvedSite): Promise<ProdMysqlClient | null> {
  if (!prodMysqlEnabledForSite(site)) return null;
  const cached = poolMap.get(site.key);
  if (cached) return cached;

  const init = (async () => {
    const c = env.prodMysqlForSite(site.key, site.brandKey);
    const spec: string = 'mysql2/promise';
    // 变量说明符：tsc 不解析模块，构建无需 mysql2 存在
    const mysql: any = await import(spec);
    const pool: any = mysql.createPool({
      host: c.host,
      port: c.port,
      user: c.user,
      password: c.password,
      database: c.database,
      waitForConnections: true,
      connectionLimit: 4,
      // 仅 SELECT：不在代码里执行任何写操作；以下为 mysql2 连接选项（无 DML 语义）
      multipleStatements: false,
      // 连接保活：空闲 socket 发 keepalive，避免被服务端 wait_timeout 静默回收后下次查询 ECONNRESET
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 10000,
      // 空闲连接回收：enrichment 低频，回收掉陈旧连接，下次取新连接更稳
      maxIdle: 4,
      idleTimeout: 30000,
    });
    // 连接级瞬时错误可重试一次（pool 会重新取一条连接）；非连接级错误不重试
    const RETRYABLE = /ECONNRESET|ECONNREFUSED|PROTOCOL_CONNECTION_LOST|ETIMEDOUT|EHOSTUNREACH/i;
    return {
      query: async <T = Record<string, unknown>>(sql: string, params: unknown[]): Promise<T[]> => {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            // mysql2 pool.query 返回 [rows, fields]，此处解包为纯行数组；timeout 防挂死（仅 SELECT）
            const [rows] = await pool.query({ sql, values: params, timeout: 15000 });
            return rows as T[];
          } catch (e) {
            lastErr = e;
            const msg = e instanceof Error ? e.message : String(e);
            if (!RETRYABLE.test(msg) || attempt === 1) throw e; // 非连接错误 / 已重试一次 → 抛出
            await new Promise((r) => setTimeout(r, 50)); // 短暂退避后重试一次
          }
        }
        throw lastErr; // 兜底（循环内已 throw，正常不可达）
      },
      close: async () => {
        await pool.end();
      },
    };
  })();

  poolMap.set(site.key, init);
  return init;
}

/** 进程退出时释放所有站点连接池（可选调用） */
export async function closeProdMysql(): Promise<void> {
  const entries = [...poolMap.entries()];
  poolMap.clear();
  await Promise.all(
    entries.map(async ([, p]) => {
      try {
        const client = await p;
        await client.close();
      } catch {
        /* 池未就绪或已关闭，忽略 */
      }
    }),
  );
}
