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

- **CORS**：跨域受 `ALLOWED_ORIGINS` 白名单约束，仅白名单内 Origin 回显 `Access-Control-Allow-Origin`；未配置时回退为回显请求 Origin（仅限本地联调，生产环境务必配置）。白名单每项支持三种写法：精确串 `https://admin.example.com`、通配符 `*.example.com`（`*` 匹配任意字符，含子域）、正则 `/^https:\/\/.*\.example\.com$/`（自动整串锚定）。例如 `ALLOWED_ORIGINS=https://admin.example.com,*.elabscience.com` 即放行指定源与整个 elabscience 子域。
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
数据主要来自「知了窝 2.6 列表聚合 → 落库 `report.db` → 按月预聚合」的本地聚合层；两类例外：
- **板块 2 累计文案**通过 **2.1 品牌文献统计**接口取全历史累计，再扣减本地聚合中 endMonth 之后到最新的数据；
- **板块 3 十年趋势**优先用 **2.4 年度数量**接口，缺失年份才回退本地聚合。

### 统一入参

所有 `report` 接口挂在 `/api/v1/:site/report/*`，`path` 上 `:site` = `procell` / `elabscience`，
通用 query：`year`（默认当前年）、`startMonth`（默认 1）、`endMonth`（默认 12）。

| 方法 | 路径 | 板块 | 数据源 | 是否需要 AI |
|---|---|---|---|---|
| GET | `/api/v1/:site/report/overview` | 总编排（一次返回 6 块） | 本地聚合 | 结论文案依赖 AI（可空） |
| GET | `/api/v1/:site/report/summary` | 1 研究概述 | 2.6 聚合 | 否 |
| GET | `/api/v1/:site/report/core` | 2 核心数据（卡片 2.6 聚合；累计文案走 2.1） | 2.6 聚合 + 2.1 累计 | 否 |
| GET | `/api/v1/:site/report/trend` | 3 十年趋势 + 季度 | 2.4 优先 + 2.6 聚合补全 | 否 |
| GET | `/api/v1/:site/report/hotspots` | 4 研究热点 | 2.6 + 本地关键词 | 兜底可开（默认关） |
| GET | `/api/v1/:site/report/products` | 5 产品引用 | 2.6 `products` 聚合 | 否 |
| GET | `/api/v1/:site/report/conclusion` | 6 小结 | 2.6 聚合 | 是（结论文案） |
| POST | `/api/v1/:site/report/refresh` | 手动触发同步 | 知了窝 2.6 | 否 |
| GET | `/api/v1/:site/report/meta` | 同步状态总览 | `zlw_sync_state` | 否 |

### 板块要点（与讨论稿口径一致）

- **板块 1 研究概述**：按 `config/journals/<brandKey>.json` 配置的「重点期刊」名单，对 `journal` 字段忽略大小写精确匹配统计篇数（如 Cell / Nature / STTT）。
- **板块 2 核心数据**：
  - 上方 5 个同比指标卡片：总篇数、总 IF、IF≥10、平均 IF、最高 IF；每个指标返回 `{ value, prevValue, rate }`（同比为去年同区间 `[startMonth, endMonth]`，`prevValue<=0` 时 `rate: null`）。
  - 底部文案累计块 `summary`（`range` 形如 `{year, startMonth:1, endMonth}`，但数值口径**非**本地 1~endMonth 聚合）：通过 **2.1 接口**取全历史累计，扣减「year 年 endMonth 之后」的本地聚合，得到「截止至 {year} 年 {endMonth} 月」累计；返回 `totalPapers`、`totalIf`、`maxIf`、`avgIf` 及去年同期 `prevTotalPapers`、`prevTotalIf`（去年同期为本地聚合的去年 1~endMonth），对应海报文案「截止至 {year} 年 {endMonth} 月，全网共计收录引用...的 SCI 文献达 X 篇，总 IF 值达 Y」。
- **板块 3 十年趋势**：数据源优先级为 **2.4 年度新增 → 本地聚合补全 → 缺年补 0**；窗口 = `[year-9, year]`，**以请求的 `year` 为锚点**。每个年份返回 `{ year, count, percent, hasData }`：
  - `percent` = 该年 `count` / 十年中最大 `count`（保留 1 位小数），仅以 `hasData: true` 的年份为基准
  - `hasData: false` 表示该年本地未同步，`count: 0` 是「无数据」而非「真实 0 篇」，前端应据此渲染而非当作 0 篇

  **十年每一年按 `decadeMode` 分两种口径**：

  - **`sameRange` 模式**：十年每一年（含指定 year）都按 `[startMonth, endMonth]` 区间统计本地聚合，忽略 2.4 的「年度新增」全年量——严格同区间对齐。
  - **`full` 模式（默认）**：
    - 倒推 9 年（year-9 ~ year-1）：2.4 全年量优先 → 本地全年 1-12 月补全 → 缺年补 0
    - 指定 year（海报年）：固定 = 本地 1~endMonth 聚合（不再用 2.4 全年量），与海报累计文案「截止至 {year} 年 {endMonth} 月」一致——未完年按截止月截断，避免与往年全年量直接对比时出现明显假下滑

  | 值 | 倒推 9 年口径 | 指定 year（海报年）口径 | 适用 |
  |---|---|---|---|
  | `full`（默认） | 全年 1-12 月（2.4 优先 → 本地补全 → 缺年补 0） | 本地 1~endMonth（截止月截断） | 常规海报（未完年避免与往年全年量假对比）|
  | `sameRange` | 本地 `[startMonth, endMonth]`（忽略 2.4） | 本地 `[startMonth, endMonth]`（与倒推 9 年同区间） | 年初/年中生成时希望所有年份同区间对比 |

  > 例：2026 年 8 月生成海报，`full` 下 2026（截止 8 月 = 5538）vs 2025（全年 = 7855）看似下滑 29.5%；
  > `sameRange`（1-8 月）下 2026=5538 vs 2025(1-8)=5193，实为增长 6.6%——十年每一年都用同一区间对比。

  季度以 `endMonth` 所在季度为锚点，但**起点是否包含该季度由两道闸门判断**——① `endMonth` 必须是该季度的末月（3/6/9/12）；② 该季度须已完整过完（按真实日期）。两道闸门都通过才把该季度作为起点往前推 4 个；任一不满足则起点退到上一季度（往前推 4 个、不包含 `endMonth` 所在的季度），避免 `endMonth=11/4` 等中间月份被误归入 Q4/Q2 这种尚未走完的季度。每条含 `year`。
- **板块 4 研究热点**：`title` 本地词边界正则匹配 `config/hotspots/<brandKey>.json` 关键词表 → Top10（计数 + 最高 IF + 同比）。
  口径（依据需求文档「研究热点」小节 + 用户口径修正）：**排序键 = 关键词频率次数**（即 `count` = 该关键词在指定年区间命中的去重文献篇数，见 `getHotspotRangeStats` 读取 `zlw_papers_agg.hotspot_counts`）。
  **先过滤负增长**（保留增长率 ≥ 0，含无基线新品 null），**再按关键词频率次数（出现次数）降序取前 10，尽可能满足 10 条**；上一年用同样方式（getHotspotRangeStats）统计给当年热点算同比。
  AI 兜底开关 `AI_HOTSPOT_FALLBACK=1` 且已配 `AI_API_KEY` 时，对本地零命中文献限量（默认 200 篇）送 AI 打标，结果合并进聚合；失败仅告警、不影响主流程。
  支持 `sortBy`：`count`（默认，按关键词频率次数降序）/ `growthRate`（按同比增长率降序二次排序）。
- **板块 5 产品引用**：解析 `products[].goodsSpu` 聚合，当前区间按引用篇数取前 `topN`(默认 30，可放宽 50/100) 货号 → 取上一年同区间同批货号算同比增长率 → **先过滤负增长及无基线新品，再按 `sortBy`(默认 count) 降序取前 `outN`(默认 15)**。
  过滤后合格数不足 `outN` 时，自动翻倍候选池重试（≤ `maxPool`=300）尽量凑够 15 条；仍不足则返回实际能凑到的条数（`poolUsed` 反映是否触顶）。
  **仅返回货号（goodsSpu）+ 英文商品名（goodsLabel）**，中文名/分类由前端调网站接口获取。无去年同期基线时（单年部署）跳过增长率过滤、退化为按引用量降序取 Top15，`hasYoY=false`。
- **板块 6 小结**：响应返回 `topJournals`（Top3 期刊 by IF）+ `institutions`（机构展示，每次 6 所）+ `conclusion`（AI 文案，需 `AI_API_KEY`，否则 `null`）。统计与 Top10 热点仅在服务端本地计算、作为 AI 提示词输入，不随响应返回（避免与板块 2/4 重复）。
  - **机构（`institutions`，每次 6 所）**：采用「AI 真实优先、Excel 兜底」。实测知了窝 API 的 `zlw_papers` 表**根本没有 `corOrg`/`org` 等机构字段**（作者字段也只有姓名、不含单位），故真实路径恒为空，实际由 `config/schools.json`（由 `docs/学校.xlsx` 经 `scripts/gen-schools.py` 预生成）**每次随机抽取 6 所**展示，`source: "excel-fallback"` 即兜底标记。若上游未来开放机构字段，在 `lib/report/schools.ts` 的 `getRealInstitutions()` 接入 AI 提取即可自动切换为真实数据。
  - 重新生成清单：`python scripts/gen-schools.py`（Excel 更新后执行）。可用 `SCHOOLS_FILE` 环境变量覆盖清单路径。

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

