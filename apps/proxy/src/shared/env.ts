import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import dotenv from 'dotenv';

/**
 * 环境变量中心（单一事实源）。
 *
 * 设计目标：
 * - 所有 env 读取收口到本模块，业务代码不得再散落 `process.env.*`，便于切换数据库/源/鉴权、统一校验与测试。
 * - 采用**惰性 getter**：每次访问实时读取 `process.env`，因此无论 dotenv 在 import 前还是后加载都能正确反映。
 * - 本模块在首次加载时自动装载仓库根 `.env`（单一事实源），避免各 app 自管 .env 导致口径不一致。
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();

// __dirname = apps/proxy/src/shared
// 上溯四级到仓库根：shared → src → proxy → apps → zhiliaowo-proxy
const ROOT_ENV = resolve(__dirname, '..', '..', '..', '..', '.env');
// 上溯一级到 src：src/config（品牌配置：hotspots / journals / prompts / schools）
const CONFIG_DIR = resolve(__dirname, '..', 'config');
// 上溯两级到 apps/proxy：apps/proxy/data（SQLite：report.db）
const DATA_DIR = resolve(__dirname, '..', '..', 'data');

// 仅装载存在的根 .env；dotenv 不会覆盖已存在于环境中的变量，重复调用幂等安全。
if (existsSync(ROOT_ENV)) {
  dotenv.config({ path: ROOT_ENV });
}

/** 读取可选字符串：未设置或空串视为未设置 */
function opt(name: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === '' ? undefined : v;
}

/** 读取字符串，带默认值 */
function str(name: string, fallback: string): string {
  return opt(name) ?? fallback;
}

/** 读取数字，带默认值（非法值回退默认） */
function num(name: string, fallback: number): number {
  const v = opt(name);
  if (v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** 读取布尔：'1' / 'true'（忽略大小写）为真，其余为假 */
function bool(name: string, fallback = false): boolean {
  const v = opt(name);
  if (v === undefined) return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

/** 目录型：设置了则相对 cwd 解析，否则回退到 apps/proxy/config 下对应子目录 */
function configDir(name: string, sub: string): string {
  const v = opt(name);
  return v ? resolve(cwd, v) : resolve(CONFIG_DIR, sub);
}

export const env = {
  /** 服务监听 */
  server: {
    get port(): number {
      return num('PORT', 3000);
    },
    get host(): string {
      return str('HOST', '0.0.0.0');
    },
    /** CORS 白名单（逗号分隔）；空数组表示回显请求 Origin（本地多 dev 端口联调兼容） */
    get allowedOrigins(): string[] {
      return (process.env.ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    },
  },

  /** 知了窝开放平台 */
  zhiliaowo: {
    get apiBase(): string {
      return str('ZLIW_API_BASE', 'https://open.zhiliaowo.cn/openapi/v12').replace(/\/$/, '');
    },
    get widgetBase(): string {
      return str('ZLIW_WIDGET_BASE', 'https://open.zhiliaowo.cn/v_widget/v11').replace(/\/$/, '');
    },
    /** 按 brand 配置的 appIdEnv 名取 appId（动态 key 不进入静态 env 对象，延伸点） */
    appId(appIdEnv: string): string | undefined {
      return opt(appIdEnv);
    },
  },

  /** 缓存（memory / redis 无缝切换） */
  cache: {
    get driver(): string {
      return str('CACHE_DRIVER', 'memory').toLowerCase();
    },
    get redisUrl(): string | undefined {
      return opt('CACHE_REDIS_URL');
    },
  },

  /** OpenAI 兼容 AI（板块 4 兜底 / 板块 6 小结） */
  ai: {
    get apiKey(): string | undefined {
      return opt('AI_API_KEY');
    },
    get baseUrl(): string {
      return str('AI_BASE_URL', 'https://apihub.agnes-ai.com/v1').replace(/\/$/, '');
    },
    get model(): string {
      return str('AI_MODEL', 'agnes-2.5-flash');
    },
    get timeoutMs(): number {
      return num('AI_TIMEOUT_MS', 60000);
    },
    /** 板块 4 本地零命中文献是否启用 AI 兜底（默认关） */
    get hotspotFallback(): boolean {
      return bool('AI_HOTSPOT_FALLBACK');
    },
    /** 板块 4 AI 兜底上限（默认 200） */
    get hotspotFallbackCap(): number {
      return num('AI_HOTSPOT_FALLBACK_CAP', 200);
    },
    /** 提示词模板目录（缺省 apps/proxy/config/prompts） */
    get promptDir(): string {
      return configDir('AI_PROMPT_DIR', 'prompts');
    },
  },

  /** 6 板块海报报告层 */
  report: {
    /** 本地聚合 SQLite 路径（缺省 apps/proxy/data/report.db） */
    get dbPath(): string {
      const v = opt('REPORT_DB_PATH');
      return v ? resolve(cwd, v) : resolve(DATA_DIR, 'report.db');
    },
    /** 同步时「期望」每页条数（上游有硬上限并静默钳制，仅作参考） */
    get pageSize(): number {
      return num('REPORT_PAGE_SIZE', 1000);
    },
    /** 同步并发原始字符串（留空/0/auto → 由 datasource 自动推导） */
    get syncConcurrencyRaw(): string | undefined {
      return opt('REPORT_SYNC_CONCURRENCY');
    },
  },

  /** 品牌配置目录 / 文件 */
  config: {
    get hotspotDir(): string {
      return configDir('HOTSPOT_DIR', 'hotspots');
    },
    get journalsDir(): string {
      return configDir('JOURNALS_DIR', 'journals');
    },
    get schoolsFile(): string {
      return opt('SCHOOLS_FILE') ?? resolve(CONFIG_DIR, 'schools.json');
    },
  },

  /** 管理接口鉴权 */
  admin: {
    get token(): string | undefined {
      return opt('ADMIN_TOKEN');
    },
  },

  /**
   * 生产库（只读）连接参数 —— 用于对接四站点生产 MySQL 的替代数据源。
   *
   * ⚠️ 四个站点的**账号/密码/库名各不相同**（两品牌站点凭据不同），故本模块**按站点解析**，
   * 字段解析优先级：**站点级 > 品牌级 > 全局默认**：
   *   - 站点级  ：PROD_MYSQL_<SITEKEY>_USER / _PASSWORD / _DATABASE / _HOST / _PORT / _ENABLED
   *   - 品牌级  ：PROD_MYSQL_<BRANDKEY>_USER / _PASSWORD / _DATABASE / _HOST / _PORT / _ENABLED
   *   - 全局默认：PROD_MYSQL_USER / _PASSWORD / _DATABASE / _HOST / _PORT / _ENABLED
   * 例：Procell 中文站 = PROD_MYSQL_PROCELLCN_USER；Procell 品牌共用 = PROD_MYSQL_PROCELL_USER。
   *
   * ⚠️ 只读是**强制约束**：无论本配置如何，下游 datasource 只建立 SELECT 连接，
   * 绝不执行任何写入/DDL/DML（防止误改生产数据）。datasource 据此只发 SELECT。
   *
   * @param siteKey   路由站点 key（elabcn/elabcom/procellcn/pricella，转大写）
   * @param brandKey  品牌 key（elabscience/procell，转大写），用于品牌级回退
   */
  prodMysqlForSite(siteKey: string, brandKey: string): ProdMysqlConn {
    const upSite = (siteKey ?? '').toUpperCase();
    const upBrand = (brandKey ?? '').toUpperCase();
    // 字段解析：站点级优先 → 品牌级回退 → 全局默认（最后可选兜底值）
    const field = (name: string, fallback?: string): string | undefined =>
      opt(`PROD_MYSQL_${upSite}_${name}`) ??
      opt(`PROD_MYSQL_${upBrand}_${name}`) ??
      opt(`PROD_MYSQL_${name}`) ??
      fallback;
    const fieldStr = (name: string, fallback: string): string => field(name) ?? fallback;
    const fieldNum = (name: string, fallback: number): number => {
      const v = field(name);
      if (v === undefined) return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const fieldBool = (name: string, fallback = false): boolean => {
      const v = field(name);
      if (v === undefined) return fallback;
      return v === '1' || v.toLowerCase() === 'true';
    };
    return {
      get enabled(): boolean {
        return fieldBool('ENABLED');
      },
      get host(): string {
        return fieldStr('HOST', '10.30.30.130');
      },
      get port(): number {
        return fieldNum('PORT', 3307);
      },
      get user(): string | undefined {
        return field('USER');
      },
      get password(): string | undefined {
        return field('PASSWORD');
      },
      get database(): string | undefined {
        return field('DATABASE');
      },
      /** 强制只读，datasource 必须据此只发 SELECT */
      readonly: true as const,
    };
  },
};

/** 生产库（只读）单站点连接参数契约 */
export interface ProdMysqlConn {
  enabled: boolean;
  host: string;
  port: number;
  user: string | undefined;
  password: string | undefined;
  database: string | undefined;
  readonly: true;
}

export type Env = typeof env;
