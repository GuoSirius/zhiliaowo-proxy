# zhiliaowo-proxy 代码评审报告

> 评审范围：`apps/proxy/src`（核心 Hono + TS + SQLite 代理服务）、`apps/proxy/src/scripts`（同步 CLI）、`config/*`、`packages/core`、`apps/admin`。
> 评审人：火眼眼（Code Review Expert）｜日期：2026-09-10
> 整体结论：**架构质量高、分层清晰、踩坑记录到位**；发现 1 个 🔴 阻断级功能缺陷（缓存完全失效）与若干安全/可维护性建议。

---

## 一、整体印象

代码库已达到「可维护的生产级」水准：分层（datasources / services / routes / shared / models）职责清晰，env 中心收口所有环境变量，缓存抽象支持 memory/redis 无缝切换，软删除对账用临时表规避 SQLite 999 变量上限（很专业的细节），同步流程具备重试、补拉、幂等跳过的完整工程化处理，统一响应信封与统一错误边界到位，入参校验集中在 `params.ts`。

**主要短板集中在两处**：① `ZhiliaowoClient.request` 的缓存键把易变的 `timestamp` 也编进了 key，导致整个缓存层形同虚设；② 触发同步的写接口与 CORS 在「未配置环境变量」时默认放宽，生产部署存在隐患。

---

## 二、🔴 阻断级（必须修复）

### 1. 缓存键包含每请求 `timestamp`，缓存 100% 失效
**位置**：`apps/proxy/src/datasources/zhiliaowo.ts:39` 与 `:44`

```ts
url.searchParams.set('timestamp', String(Date.now()));   // 每次调用都重新生成（毫秒级）
// ...
const cacheKey = `zlw:${brand.key}:${path}:${url.searchParams.toString()}`; // 包含 timestamp
const cached = await this.cache.get<T>(cacheKey);
if (cached !== undefined) return cached;
```

**根因**：`timestamp` 是知了窝鉴权所需的实时字段，放进 fetch URL 是对的；但它同时也被拼进了 `cacheKey`。`Date.now()` 是毫秒级，两次请求几乎不可能撞同一毫秒，**缓存读取永远 miss**，随后又用这个唯一 key 回写。

**后果**：
- 缓存层完全无收益：本应被缓存的读取型接口（`statistics` / `paperYear` 等，被 `report/core`、`report/trend`、`report/overview` 频繁调用）每次都打上游。
- `MemoryCache` 按唯一 key 堆积（TTL=3600s），一小时内内存随不同请求 URL 增长，纯浪费。
- 上游有并发/限流约束（代码注释已明确警告），无意义的重复请求放大限流与 502 风险。

**修复**：缓存键只由业务参数构成，`timestamp` 仅在 fetch URL 内使用。

```ts
const cacheKey = `zlw:${brand.key}:${path}?` + new URLSearchParams(query).toString();
// 随后再 set timestamp 到 fetch URL
url.searchParams.set('timestamp', String(Date.now()));
```

建议补一条集成测试断言「相同业务参数的两次调用只打一次上游」，可直接暴露此 bug。

---

## 三、🟡 建议修复（Should Fix）

### 2. `/report/refresh` 写/触发接口默认无鉴权
**位置**：`apps/proxy/src/routes/report/refresh.ts:35-41` + `index.ts:73`

```ts
const adminToken = env.admin.token;
if (adminToken) { /* 校验 */ }   // 未配置 ADMIN_TOKEN 时直接放行
```

该接口会触发**昂贵的全量上游同步 + SQLite 落库 + 重算聚合**，未配置 `ADMIN_TOKEN` 时任意人均可触发，存在资源耗尽 / 打爆上游 / 污染本地库的实质风险（DoS 面）。

**建议**：生产环境强制要求 `ADMIN_TOKEN`；或默认改为「未配置即拒绝 503/401，并显式日志提示」。`.env.example` 已注明「生产务必配置」，但代码层面应是 fail-closed 而非 fail-open。

### 3. CORS 未配置时反射任意 Origin
**位置**：`index.ts:39-49`

```ts
const allow = ALLOWED_ORIGINS.length === 0 || (origin && ALLOWED_ORIGINS.includes(origin));
if (origin && allow) { c.header('Access-Control-Allow-Origin', origin); ... }
```

`ALLOWED_ORIGINS` 为空时回显请求方的任意 `Origin`——这是为本地多 dev 端口联调留的便利，但**生产环境若忘记配置，等于对任意站点开放跨域读取报告数据**。`.env.example` 已提示「生产务必配置」，建议：
- 启动时若 `ALLOWED_ORIGINS` 为空且 `NODE_ENV=production`，打印告警；
- 或保持回显逻辑但仅在非 production 生效。

### 4. `migrateReportDb()` 重复执行 + 模块加载副作用
**位置**：`report-db.ts:183`（模块顶层）、`index.ts:106`、`scripts/sync.ts:53`、`scripts/sync-current.ts:21`

`report-db.ts` 在**模块 import 时**就打开 SQLite + 迁移（`:183`），而 `index.ts` 启动时又调一次，CLI 脚本再调一次。迁移本身幂等，无正确性问题，但：
- 模块顶层副作用（开库 + DDL）不利于单测与可预测初始化顺序；
- 重复迁移是冗余工作。

**建议**：将 `migrateReportDb()` 的 import 时调用移除，统一由 `initClient`/启动入口/CLI `main` 显式调用一次（当前已如此），避免「隐式 + 显式」双触发。

### 5. `prod-mysql` 空数组注射隐患 & 不可达代码
**位置**：`apps/proxy/src/datasources/prod-mysql.ts:74-89`

- `WHERE p.cat IN (?)` 传入数组时由 mysql2 展开为 `IN (?, ?, ...)`；**当前 `enrichProductsWithMeta` 在 `items.length === 0` 时早返回**（products.ts:166），故不会以空数组触发 `IN ()` 语法错误。但若未来有人移除该守卫，空数组会导致 `IN ()` 直接报 SQL 语法错。**建议**在 `db.query` 包装内对数组参数做空数组守卫（抛明确错误），防御更稳。
- 重试循环 `for (attempt=0; attempt<2; attempt++)` 在循环体内 `throw e`，末尾 `throw lastErr`（`:88`）**永远不可达**，属死代码，可删。

### 6. 板块 5 产品计数排除 `month=0` 哨兵桶，与热点/期刊口径不一致
**位置**：`products.ts:57-59` vs `agg.ts:46`（getRangeAgg 全年区间含 `month=0`）

`getRangeAgg`（热点、期刊分布）在全年区间（`startMonth<=1 && endMonth>=12`）会纳入 `month=0`（pubTime 无法解析月份的兜底桶），而 `getRangeProductCounts` 用 `month BETWEEN ? AND ?` **永远排除** `month=0`。这意味着「pubTime 异常月」的文献会被计入热点/期刊，却**不被计入产品引用**——同一张 `zlw_papers` 表在两处统计口径不同。

**建议**：若 `month=0` 文献是否该算入产品是有意取舍，请在 `products.ts` 注释里显式说明；否则对齐为同样包含 `month=0`（尤其全年区间）。

### 7. `fail()` 状态联合类型过窄（类型撒谎）
**位置**：`shared/response.ts:32`

```ts
return c.json<ApiEnvelope>({...}, status as 400 | 404 | 500 | 502);
```

运行期 `fail(c, 401, ...)`（refresh.ts 鉴权失败）能正确返回 401，但 TS 联合类型不含 401，是「运行正确、类型错误」的谎言。一旦新增 403 等状态码，类型不会报错却误导读者。

**建议**：改为 `status as number`（或补全会用到的状态码集合），消除误导。

### 8. `renderTemplate` 占位符仅支持 `\w+`
**位置**：`shared/prompts.ts:29-34`

```ts
return tpl.replace(/\{\{(\w+)\}\}/g, ...);
```

若某模板变量含连字符（如 `{{brand-key}}`）不会被替换，会原样残留 `{{brand-key}}`。当前 conclusion 模板变量均为简单词（brand/year/total…），暂未触发；属潜在 bug。

**建议**：放宽正则 `/\{\{([\w-]+)\}\}/g` 或明确文档约定变量命名。

---

## 四、💭 细节 / 可优化（Nice to Have）

- **ai.ts:72** `e instanceof DOMException` 判断超时：Node 下 `AbortError` 确为 `DOMException`，但用 `e.name === 'AbortError'` 更稳健（避免某些运行时不暴露全局 `DOMException`）。
- **env.ts:43-48** `num()`：`Number('0x10')`→16、`Number('1e3')`→1000 会被接受为合法数字（如 `PORT=0x10` 解析为 16）。边缘无害，但若想严格可加白名单校验。
- **params.ts:39-45** `parseReportCtx` 内联构造 `ResolvedBrand`，与 `resolveBrand(site)` 逻辑重复，可复用后者投影。
- **widget.ts:20-31** 302 分发目标 host 固定（无 SSRF/开放跳转风险，安全），但 `rest` 取自 `c.req.path` 未做「必须以 `/` 开头且不含编码穿越」的规范化校验；建议加一道防御性断言（虽当前 `new URL` 不会解码 `%2e%2e` 造成越界）。
- **routes/report/conclusion.ts:72** AI 小结每次请求实时调用、无缓存；若并发高且 `AI_HOTSPOT_FALLBACK`/`aiEnabled` 开启，成本与上游依赖需注意（可考虑按 brand+year+range 缓存结论）。

---

## 五、安全专项

| 项 | 结论 |
|---|---|
| 密钥入库 | ✅ `.env` 已被 `.gitignore` 忽略，未入库（已核对 `git ls-files`） |
| AI_API_KEY | ✅ 仅服务端读取，不落前端 |
| SQL 注入 | ✅ 所有用户可控输入均参数化（`IN (?)` 用数组参数；表名/列名来自可信 config，非用户输入） |
| 生产库只读 | ✅ `readonly:true` + 仅 SELECT + `multipleStatements:false`；靠代码纪律保证，建议在 DB 侧用只读账号兜底 |
| `/report/refresh` 鉴权 | 🟡 默认 fail-open（见 §2） |
| CORS | 🟡 空白名单反射任意 Origin（见 §3） |
| 302 跳转 | ✅ 目标 host 固定，无开放重定向/SSRF |
| 路径穿越 | ✅ 路由 `:site` 经 `resolveSite` 白名单校验，未知 site 抛 404 |

---

## 六、测试覆盖

**已有（质量良好）**：`cache.test.ts`（TTL/隔离）、`agg.test.ts`（mergeCounts/mergeMax）、`calc.test.ts`（round/pct 边界）、`hotspots.test.ts`（classifyHotspot 多命中/大小写/空值）。纯函数覆盖扎实。

**缺失（建议补）**：
- ❗ **`ZhiliaowoClient.request` 缓存键逻辑**——正是 §1 的 bug，却无任何测试，导致缺陷长期潜伏。
- ❌ 同步流程 `syncYear`（分页、去重、软删除对账 `softDeleteOrphans`、完整性校验）。
- ❌ `buildTopProducts`（候选池翻倍/负增长过滤边界）、`params.ts` 校验（越界/非整数/year 默认）。
- ❌ 路由集成测试（含 refresh 鉴权分支、CORS 头）。

**建议**：优先补一条 `ZhiliaowoClient` 的「同业务参数两次调用只 fetch 一次上游」集成测试（用 mock fetch），可直接锁住 §1 的修复。

---

## 七、架构亮点（值得保持）

- **env 中心**（`shared/env.ts`）：惰性 getter + 单一事实源 + 站点/品牌/全局三级解析，业务代码零散落 `process.env.*`。
- **缓存抽象**（`shared/cache.ts`）：`Cache` 接口 + memory/redis 工厂，调用方零感知切换。
- **软删除对账**（`sync/persist.ts:softDeleteOrphans`）：用临时表承载 fetchedIds 规避 SQLite 999 变量上限，空集合守卫防止误清空整年，复活由 upsert 自动清标记——设计严谨。
- **同步健壮性**（`sync/index.ts`）：并发自动推导 + 钳制、失败页串行补拉、id 去重、缺口显式告警、幂等跳过，工程化到位。
- **口径踩坑记录**：`month=0` 哨兵桶、`UPSTREAM_MAX_PAGE_SIZE=15` 静默钳制、2.4 窗口锚定当前年等，均在注释与实现中固化，避免复发。
- **统一契约**：响应信封 `{code,message,data}`、`ApiError`→HTTP 状态码、入参校验集中 `params.ts`。

---

## 八、优先级修复清单

| 优先级 | 项 | 文件 |
|---|---|---|
| 🔴 P0 | 缓存键排除 timestamp（§1） | `datasources/zhiliaowo.ts` |
| 🟡 P1 | `/report/refresh` 默认 fail-closed（§2） | `routes/report/refresh.ts` |
| 🟡 P1 | 生产强制 CORS 白名单（§3） | `index.ts` |
| 🟡 P2 | 移除模块加载期 `migrateReportDb` 双触发（§4） | `datasources/report-db.ts` |
| 🟡 P2 | `prod-mysql` 空数组守卫 + 删死代码（§5） | `datasources/prod-mysql.ts` |
| 🟡 P2 | 板块 5 与热点/期刊统计口径对齐（§6） | `services/report/products.ts` |
| 💭 P3 | `fail()` 类型放宽（§7） | `shared/response.ts` |
| 💭 P3 | `renderTemplate` 占位符正则放宽（§8） | `shared/prompts.ts` |
| 🧪 | 补 `ZhiliaowoClient` 缓存键集成测试 | `src/test/` |

> 一句话总结：**先把 §1 的缓存键修掉（一行级改动，收益最大），再把 §2/§3 两个生产默认放宽为 fail-closed，其余按优先级推进即可。**
