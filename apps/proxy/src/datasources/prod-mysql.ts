import { env } from '../shared/env.js';

/**
 * 四站点生产库（只读）数据源。
 *
 * 用途：板块 5 产品引用 Top 的「中文名 / 分类」来自各站点生产 MySQL（按 site.dbPrefix 区分表），
 * 知了窝 API 不返回这些字段，故在此只读回查。文献/统计等 brand 级数据不走这里。
 *
 * 只读是**硬约束**：本模块只发 SELECT，绝不执行任何写入/DDL/DML（env.prodMysql.readonly 恒定 true）。
 *
 * ⚠️ 运行时依赖 `mysql2/promise`：由用户侧 `pnpm install` 安装（本仓库不内置）。
 * 为避免在「未安装驱动」时 tsc 报错，这里用**变量说明符** `import(spec)` 做动态加载——
 * TypeScript 对变量说明符的动态 import 返回 `Promise<any>`，不解析模块、不需 node_modules 中存在 mysql2。
 * 启用 PROD_MYSQL_ENABLED=1 且已安装 mysql2 时即正常运行；禁用或驱动缺失时 getProdMysql() 返回 null，调用方优雅降级。
 */

export interface ProdMysqlClient {
  /** 执行查询，返回行数组（已解包 [rows, fields]） */
  query: <T = Record<string, unknown>>(sql: string, params: unknown[]) => Promise<T[]>;
  /** 关闭连接池（进程退出时调用；连接池本身随进程常驻） */
  close: () => Promise<void>;
}

/** 是否启用：开关开启且凭据/库名齐全才视为可用（缺任一项 → 不连库，调用方返回原数据） */
export function prodMysqlEnabled(): boolean {
  return (
    env.prodMysql.enabled &&
    !!env.prodMysql.user &&
    !!env.prodMysql.password &&
    !!env.prodMysql.database
  );
}

let initPromise: Promise<ProdMysqlClient> | null = null;

/**
 * 惰性建立只读连接池（进程内单例）。
 * - 未启用/缺凭据 → 返回 null（调用方无需判错，直接降级）。
 * - 已启用 → 首次调用时动态 import mysql2 建池，后续复用。
 */
export async function getProdMysql(): Promise<ProdMysqlClient | null> {
  if (!prodMysqlEnabled()) return null;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const spec: string = 'mysql2/promise';
    // 变量说明符：tsc 不解析模块，构建无需 mysql2 存在
    const mysql: any = await import(spec);
    const pool: any = mysql.createPool({
      host: env.prodMysql.host,
      port: env.prodMysql.port,
      user: env.prodMysql.user,
      password: env.prodMysql.password,
      database: env.prodMysql.database,
      waitForConnections: true,
      connectionLimit: 4,
      // 仅 SELECT：不在代码里执行任何写操作；以下为 mysql2 连接选项（无 DML 语义）
      multipleStatements: false,
    });
    return {
      query: async <T = Record<string, unknown>>(sql: string, params: unknown[]): Promise<T[]> => {
        // mysql2 pool.query 返回 [rows, fields]，此处解包为纯行数组
        const [rows] = await pool.query(sql, params);
        return rows as T[];
      },
      close: async () => {
        await pool.end();
      },
    };
  })();
  return initPromise;
}

/** 进程退出时释放连接池（可选调用） */
export async function closeProdMysql(): Promise<void> {
  if (!initPromise) return;
  const client = await initPromise;
  await client.close();
  initPromise = null;
}
