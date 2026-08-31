# zhiliaowo-proxy

知了窝开放平台的 **BFF 代理服务**。把知了窝的开放 API 封装成本项目可控的接口，
对外提供「配置驱动、多 brand、可独立部署、可无限扩展」的文献数据服务。

## 为什么需要这一层

- **鉴权隔离**：知了窝的 `appId` 是纯 API key 且无签名，绝不能进前端；由本服务持有。
- **缓存**：文献数据更新慢，本服务按「brand × 接口」缓存，降低上游压力。
- **裁剪聚合**：只回传前端所需，统一错误与状态码。
- **多 brand 扩展**：新增品牌零业务改动，只改配置 + 环境变量。

## 架构

```
品牌站前端 ──> 本服务 (/api/v1/:site/xxx) ──> 知了窝开放 API
                ├─ 鉴权隔离(appId 仅后端)
                ├─ brand 映射(按 site 选)
                └─ 缓存层(memory / redis 无缝切换)

品牌站前端 ──iframe──> 本服务 (/w/:site/*) ──302──> 知了窝开放组件 v_widget
                └─ appId / brand 由后端注入，前端源码零泄露
```

## 接口列表

| 方法 | 路径 | 对应知了窝 API |
|---|---|---|
| GET | `/api/v1/:site/statistics` | 2.1 品牌文献统计 |
| GET | `/api/v1/:site/cite-stat?sku=` | 2.2 品牌+SPU 引用概况 |
| GET | `/api/v1/:site/paper-sum` | 2.3 历年累计数量 |
| GET | `/api/v1/:site/paper-year` | 2.4 年度数量 |
| GET | `/api/v1/:site/goods-cite-num` | 2.5 产品文献引用数量 |
| GET | `/api/v1/:site/papers` | 2.6 品牌文献列表 |
| GET | `/api/v1/:site/product-papers?sku=` | 2.7 产品文献列表 |

### 开放组件（iframe）302 分发

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/w/:site/*` | 开放组件（iframe）302 分发：`appId` / `brand` 由后端注入，原始 query（`sku` / `lang` 等）透传 |

前端 iframe 只写自家域名（如 `/w/elabscience/brand/statistics`），`appId` 不进入前端源码或构建产物，满足「appId 不落前端」的核心诉求。

## 快速开始

```bash
npm install
cp .env.example .env      # 填入各 brand 的 appId
npm run dev               # tsx watch，默认 :3000
```

健康检查：`GET /health`

环境变量：`PORT` 改端口；`HOST` 改绑定地址（默认 `0.0.0.0`，同时覆盖 `127.0.0.1` / `localhost` / 本机 LAN IP）；`ZLIW_API_BASE` 改开放 API 版本（默认 `v12`）；`ZLIW_WIDGET_BASE` 改开放组件（iframe）基址（默认 `v11`）。

## 接口示例（curl）

下面以 `elabscience` 站点、`http://localhost:3000` 为例（`site` 换成实际站点 key）。

```bash
# 健康检查
curl http://localhost:3000/health

# 2.1 品牌文献统计
curl http://localhost:3000/api/v1/elabscience/statistics

# 2.2 品牌 + SPU 引用概况（sku 可选）
curl "http://localhost:3000/api/v1/elabscience/cite-stat?sku=E-ABcl-0001"

# 2.3 历年累计数量
curl http://localhost:3000/api/v1/elabscience/paper-sum

# 2.4 年度数量
curl http://localhost:3000/api/v1/elabscience/paper-year

# 2.5 产品文献引用数量
curl http://localhost:3000/api/v1/elabscience/goods-cite-num

# 2.6 品牌文献列表
curl http://localhost:3000/api/v1/elabscience/papers

# 2.7 产品文献列表（sku 必填）
curl "http://localhost:3000/api/v1/elabscience/product-papers?sku=E-ABcl-0001"

# 开放组件（iframe）302 分发：直接重定向到知了窝 v_widget
# -I 看 302 Location；前端 iframe 写 /w/elabscience/brand/statistics 即可，appId 由后端注入
curl -I "http://localhost:3000/w/elabscience/brand/statistics"
```

所有接口响应统一为信封结构 `{ "code": number, "message": string, "data": <真实数据 | null> }`：成功 `code=200` 且业务数据在 `data`；失败 `data=null`（或附加上下文），`code` 同时作为 HTTP 状态码（404 未知 site / 500 缺 env / 502 上游异常）。无论成功失败结构一致，真实数据始终在 `data` 中。

## 扩展一个新 brand（零业务改动）

1. `config/brands.ts` 的 `BRANDS` 加一项（key / label / brand / appIdEnv）
2. `.env` 增加对应的 appId 环境变量（名称即该项配置的 `appIdEnv`，如 `ZLIW_ELAB_APPID=<...>`）
3. 完成。路由、缓存、错误处理自动复用。

> `brand` 值需与知了窝「官方校验通过的品牌名称」完全一致，找对接人确认。

## 缓存无缝切换

- 默认 `CACHE_DRIVER=memory`（进程内，零依赖）
- 设 `CACHE_DRIVER=redis` + `CACHE_REDIS_URL=...` 即切到 Redis
- 业务代码只依赖 `Cache` 接口，切换零改动；未装/未配置时自动回退 memory。

## 安全说明

- **CORS**：跨域受 `ALLOWED_ORIGINS` 白名单约束，仅白名单内 Origin 回显 `Access-Control-Allow-Origin`；未配置时回退为回显请求 Origin（仅限本地联调，生产环境务必配置）。
- **同步接口鉴权**：`POST /api/v1/:site/report/refresh` 一旦配置 `ADMIN_TOKEN`，调用方必须携带 `x-admin-token`（或 `Authorization: Bearer`）头，否则返回 401；未配置则放行（dev 便利）。
- **参数校验**：`report` 接口 `startMonth` / `endMonth` 越界（非 1–12）或 `endMonth < startMonth` 直接返回 400，不再静默 clamp。

## 部署

**pm2**（配合宝塔 Windows 面板）：
```bash
npm run build
pm2 start deployments/ecosystem.config.cjs
```

**Docker**：
```bash
docker build -t zhiliaowo-proxy .
docker run -p 3000:3000 --env-file .env zhiliaowo-proxy
```

## 提交规范

约定式提交（commitlint 校验）：`feat:` / `fix:` / `chore:` 等。
`npm run release` 生成 CHANGELOG.md 并打 tag。

---

## 海报数据接口（6 板块 / `report`）

为静态海报页（前端不在本仓库，跑在 18899 端口）提供 6 个板块的数据接口。
数据全部来自「知了窝 2.6 列表聚合 → 落库 `report.db` → 按月预聚合」的本地聚合层，
不再依赖 2.3/2.4 图表接口（详见下方「板块 3 口径说明」）。

### 统一入参

所有 `report` 接口挂在 `/api/v1/:site/report/*`，`path` 上 `:site` = `procell` / `elabscience`，
通用 query：`year`（默认当前年）、`startMonth`（默认 1）、`endMonth`（默认 12）。

> **板块 2 `core` 的累计文案**：5 个同比指标卡片按传入的 `[startMonth, endMonth]` 统计；
> 底部文案「截止至 {year} 年 {endMonth} 月」额外通过 `summary` 字段返回，统计范围为 `1 ~ endMonth`。
>
> **`trend` 额外参数**：`decadeMode=full|sameRange`（默认 `full`），见板块 3 说明。

| 方法 | 路径 | 板块 | 数据源 | 是否需要 AI |
|---|---|---|---|---|
| GET | `/api/v1/:site/report/overview` | 总编排（一次返回 6 块） | 本地聚合 | 结论文案依赖 AI（可空） |
| GET | `/api/v1/:site/report/summary` | 1 研究概述 | 2.6 聚合 | 否 |
| GET | `/api/v1/:site/report/core` | 2 核心数据（含 1~endMonth 累计） | 2.6 聚合 | 否 |
| GET | `/api/v1/:site/report/trend` | 3 十年趋势 + 季度 | 2.4 优先 + 2.6 聚合补全 | 否 |
| GET | `/api/v1/:site/report/hotspots` | 4 研究热点 | 2.6 + 本地关键词 | 兜底可开（默认关） |
| GET | `/api/v1/:site/report/products` | 5 产品引用 | 2.6 `products` 聚合 | 否 |
| GET | `/api/v1/:site/report/conclusion` | 6 小结 | 2.6 聚合 | 是（结论文案） |
| POST | `/api/v1/:site/report/refresh` | 手动触发同步 | 知了窝 2.6 | 否 |
| GET | `/api/v1/:site/report/meta` | 同步状态总览 | `zlw_sync_state` | 否 |

响应统一信封：`{ "code": 200, "message": "success", "data": {...} }`。

### 板块要点（与讨论稿口径一致）

- **板块 1 研究概述**：按 `config/journals/<brandKey>.json` 配置的「重点期刊」名单，对 `journal` 字段忽略大小写精确匹配统计篇数（如 Cell / Nature / STTT）。
- **板块 2 核心数据**：
  - 上方 5 个同比指标卡片：总篇数、总 IF、IF≥10、平均 IF、最高 IF；每个指标返回 `{ value, prevValue, rate }`（同比为去年同区间 `[startMonth, endMonth]`，`prevValue<=0` 时 `rate: null`）。
  - 底部文案累计块 `summary`：统计 `year` 年的 `1 ~ endMonth`，返回 `totalPapers`、`totalIf` 及去年同期 `prevTotalPapers`、`prevTotalIf`，对应海报文案「截止至 {year} 年 {endMonth} 月，全网共计收录引用...的 SCI 文献达 X 篇，总 IF 值达 Y」。
- **板块 3 十年趋势**：数据源优先级为 **2.4 年度新增 → 本地聚合补全 → 缺年补 0**；窗口 = `[year-9, year]`，**以请求的 `year` 为锚点**。每个年份返回 `{ year, count, percent, hasData }`：
  - `percent` = 该年 `count` / 十年中最大 `count`（保留 1 位小数），仅以 `hasData: true` 的年份为基准
  - `hasData: false` 表示该年本地未同步，`count: 0` 是「无数据」而非「真实 0 篇」，前端应据此渲染而非当作 0 篇

  `decadeMode` 控制各年统计口径：

  | 值 | 各年统计范围 | 适用 |
  |---|---|---|
  | `full`（默认） | 全年 1-12 月 | 常规海报 |
  | `sameRange` | `[startMonth, endMonth]` 同区间 | 年初/年中生成，消除未完年的假下滑 |

  > 例：2026 年 8 月生成海报，`full` 下 2026（5538）比 2025 全年（7855）看似下滑 29.5%，
  > 实为年未过完；`sameRange`（1-8 月）下 2026=5538 vs 2025=5193，实为增长 6.6%。

  季度以 `endMonth` 为锚点取最近 4 个完整季度（若 `endMonth` 为当季末月则计入当季，否则从上一季度倒推），每条含 `year`。
- **板块 4 研究热点**：`title` 本地词边界正则匹配 `config/hotspots/<brandKey>.json` 关键词表 → Top10（计数 + 最高 IF + 同比）。
  口径（依据需求文档「研究热点」小节）：**先按当年「出现次数」降序固定选出出现次数最多的 10 个**，再用同样方式统计上一年给这 10 个算同比；**仅保留增长率 ≥ 0（含无基线新品 null）的热点，负增长剔除**（剔除后最终可能不足 10 条）。
  AI 兜底开关 `AI_HOTSPOT_FALLBACK=1` 且已配 `AI_API_KEY` 时，对本地零命中文献限量（默认 200 篇）送 AI 打标，结果合并进聚合；失败仅告警、不影响主流程。
  支持 `sortBy`：`count`（默认，对最终 ≤10 条按引用篇数降序二次排序）/ `growthRate`（按同比增长率降序）；但 **Top10 的选取恒按 count 降序，不受 sortBy 影响**。
- **板块 5 产品引用**：解析 `products[].goodsSpu` 聚合，当前区间按引用篇数取前 `topN`(默认 30，可放宽 50/100) 货号 → 取上一年同区间同批货号算同比增长率 → **先过滤负增长及无基线新品，再按 `sortBy`(默认 count) 降序取前 `outN`(默认 15)**。
  过滤后合格数不足 `outN` 时，自动翻倍候选池重试（≤ `maxPool`=300）尽量凑够 15 条；仍不足则返回实际能凑到的条数（`poolUsed` 反映是否触顶）。
  **仅返回货号（goodsSpu）+ 英文商品名（goodsLabel）**，中文名/分类由前端调网站接口获取。无去年同期基线时（单年部署）跳过增长率过滤、退化为按引用量降序取 Top15，`hasYoY=false`。
- **板块 6 小结**：结构化部分（统计 + Top3 期刊 by IF + Top10 热点）本地确定；`conclusion` 文案需 AI（`AI_API_KEY` 已配时生成，否则 `null`）。
  ⚠️ 原规划的「Top6 通讯作者单位 + AI 译中文校名」因 `corOrg` 等字段 100% 为空暂无法实现。

### 同步工作流

数据落库在 `apps/proxy/data/report.db`（SQLite，运行时由同步脚本生成，不纳入 git）。三张表：`zlw_papers`（原始文献）、`zlw_papers_agg`（按月预聚合）、`zlw_sync_state`（同步状态）。

```bash
# 统一入参（sync / recompute 一致）：
#   --brand           品牌 key（必填，默认 procell）
#   --year            单年（= 该年同步/重算）
#   --fromYear/--toYear  年份区间；--toYear 缺省时默认「当前真实年份」
#   sync 额外支持 --force（强制重新拉取，忽略已同步状态）

# 1) 同步某品牌单年（首次/每周补跑）
pnpm --filter zhiliaowo-proxy sync -- --brand=procell --year=2025 [--force]

# 1a) 同步某品牌一段年份（如补齐历史 2008-2026，--toYear 缺省=当前年）
pnpm --filter zhiliaowo-proxy sync -- --brand=procell --fromYear=2008 [--toYear=2026] [--force]

# 2) 仅从本地 zlw_papers 重算月度聚合（不请求 API，修复口径/补算用）
pnpm --filter zhiliaowo-proxy recompute --brand=procell --year=2025
#   兼容旧位置写法：recompute procell 2025
#   重算某品牌一段年份（--toYear 缺省=当前年）：
pnpm --filter zhiliaowo-proxy recompute --brand=procell --fromYear=2008 [--toYear=2026]
#   全品牌 × 全部已同步年份（改口径后批量重算用）：
pnpm --filter zhiliaowo-proxy recompute --all

# 3) 定时任务：同步全部品牌「当前年 + 上一年」（上一年用于同比）
pnpm --filter zhiliaowo-proxy sync:current
#   → 由 crontab / 宝塔计划任务 / WorkBuddy 定时任务每天 03:10 调用
```

也可用 `POST /api/v1/:site/report/refresh`（`body: {"year":2025,"force":false}`）手动触发；
前端轮询 `GET /api/v1/:site/report/meta` 看同步进度。

### curl 示例

```bash
# 总编排（一次性拿 6 板块）
curl "http://localhost:3000/api/v1/procell/report/overview?year=2025"

# 单板块
curl "http://localhost:3000/api/v1/procell/report/summary?year=2025"
# 板块 2：5 个卡片按 startMonth~endMonth，summary 按 1~endMonth
curl "http://localhost:3000/api/v1/procell/report/core?year=2025&startMonth=3&endMonth=6"
# 板块 3：十年趋势，默认 full
curl "http://localhost:3000/api/v1/procell/report/trend?year=2025"
# 板块 3：各年只统计 1-8 月（消除未完年假下滑）
curl "http://localhost:3000/api/v1/procell/report/trend?year=2026&startMonth=1&endMonth=8&decadeMode=sameRange"
curl "http://localhost:3000/api/v1/procell/report/hotspots?year=2025"
curl "http://localhost:3000/api/v1/procell/report/hotspots?year=2025&sortBy=growthRate"
curl "http://localhost:3000/api/v1/procell/report/products?year=2025"
# 板块 5：按数量取前 15（默认）；放宽候选池到 100 仍按数量排；按增长率排前 15
curl "http://localhost:3000/api/v1/procell/report/products?year=2025&topN=100&sortBy=count"
curl "http://localhost:3000/api/v1/procell/report/products?year=2025&sortBy=growthRate"
curl "http://localhost:3000/api/v1/procell/report/conclusion?year=2025"

# 同步状态 / 手动刷新
curl "http://localhost:3000/api/v1/procell/report/meta"
curl -X POST "http://localhost:3000/api/v1/procell/report/refresh" -H 'Content-Type: application/json' -d '{"year":2025,"force":false}'
```

