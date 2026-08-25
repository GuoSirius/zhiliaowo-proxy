# 区块库 API 规范（Block Library & Service API Spec）

> 用途：定义 H5 生成器的**区块协议、H5 文档模型、多品牌主题、管理后台 API、服务端模块 API、四种导出实现与整体目录架构**。
> 上游依赖：《知了窝 H5 数据契约》。本文件为设计/对接规范，**不含实现代码**。

---

## 1. 整体架构与目录规划（回答"项目放哪"）

**结论：工作区顶层三个并列仓库 `zhiliaowo-proxy`（后端）/ `zhiliaowo-template`（前端）/ `zhiliaowo-core`（共享），均带 `zhiliaowo-` 前缀、统一远端。proxy = 后端（API/持久化/导出/开放平台代理）；template = 前端（UI/区块库/渲染）；core = 共享（类型+zod+区块注册表），前后端都 `install` 它，三者互不依赖、只共同依赖 core。**

```
知了窝/
├── docs/                                           # 现有：H5 示例图 + 对接文档 PDF + 提取文本
├── zhiliaowo-proxy/                                # 【后端】zhiliaowo-proxy（Hono + Node24 + ioredis）
│   └── src/
│       ├── ...（现有 BFF 代理业务）
│       └── h5/                                     # 【新增】H5 生成器服务端模块
│           ├── index.ts                            # 路由（/api/h5/*、/h5/:id 分享链接）
│           ├── store/                              # SQLite 持久层（better-sqlite3）
│           │   ├── db.ts                           # 连接 + 建表迁移
│           │   ├── h5.repo.ts                      # H5 草稿 CRUD
│           │   ├── brand.repo.ts                   # 品牌主题 CRUD
│           │   └── template.repo.ts               # 模板 CRUD
│           ├── cache/                              # 复用 proxy 现成的内存/Redis 抽象（CACHE_DRIVER 切换）
│           ├── proxy/                              # 代理开放平台 API（套缓存）
│           ├── export/                             # 服务端导出（Puppeteer 长图 / 静态 HTML）
│           └── schemas/                            # zod 校验（复用 @zhiliaowo/core）
├── zhiliaowo-template/                             # 【前端】zhiliaowo-template（Vue3 + Vite + UnoCSS + Pinia）
│   ├── apps/
│   │   ├── admin/                                  # 管理后台
│   │   │   └── src/
│   │   │       ├── blocks/                         # 区块组件库（.vue）
│   │   │       ├── stores/                         # Pinia：草稿 / 主题 / 模板
│   │   │       ├── views/                          # 列表 / 编辑器 / 预览 / 导出
│   │   │       └── api/                            # 调 zhiliaowo-proxy /api/h5
│   │   └── h5/                                     # H5 展示页（移动端分享链接 / 导出渲染）
│   │       └── src/
│   │           ├── blocks/                         # 与 admin 共享区块定义
│   │           └── render/                         # 渲染 + 截图（前端 html2canvas 降级）
│   └── package.json                                # monorepo 根（workspaces: apps/*）
└── zhiliaowo-core/                                 # 【共享】zhiliaowo-core（@zhiliaowo/core）
    ├── src/
    │   ├── types.ts                                # BlockNode / H5Doc / BrandTheme
    │   ├── validate.ts                             # zod 校验
    │   └── blocks.ts                               # 区块元信息注册表
    ├── specs/                                      # 本目录：规范文档
    │   ├── 知了窝H5数据契约.md
    │   └── 区块库API规范.md
    └── package.json
```

### 1.1 边界说明
- **后端（zhiliaowo-proxy）**：API、SQLite 持久化、内存/Redis 缓存、开放平台代理、服务端 Puppeteer 截图与静态 HTML 输出、分享链接托管（`/h5/:id`）。
- **前端（zhiliaowo-template）**：管理后台 UI、区块组件库、H5 展示渲染、Pinia 状态、调 `/api/h5`。
- **共享（zhiliaowo-core）**：顶层独立仓库 `@zhiliaowo/core`，含类型、zod 校验、区块注册表；proxy 与 template 都 `install` 它，三者互不依赖。
- **部署**：proxy 独立部署（Node 服务）；template 的 `admin` 与 `h5` 各自 build，`h5` 产物可由 proxy `/h5/:id` 托管或独立静态托管；core 作为依赖被两者安装。

---

## 2. 区块协议（Block Protocol）

### 2.1 通用区块接口

```ts
interface BlockNode<T = unknown> {
  type: BlockType;          // 区块类型枚举
  id: string;               // 区块实例唯一 id
  props: T;                 // 区块数据（结构见 2.3）
  visible?: boolean;        // 是否渲染（默认 true）
}

type BlockType =
  | 'BrandHeader'      // 品牌头（Logo + slogan）
  | 'TitleBar'         // 大标题
  | 'StatCardGroup'    // 核心数据卡（带趋势箭头）
  | 'BarChart'         // 柱状图
  | 'QuarterGrid'      // 季度/分类数据 2x2
  | 'SummaryList'      // 小结列表（图标+文字）
  | 'PaperListBlock'   // 文献列表（多篇）
  | 'ArticleBlock'     // 文献解析（单篇深度）
  | 'KeywordTags'      // 关键词标签
  | 'ProductCard'      // 产品推荐
  | 'BrandFooter';     // 联系方式 + 二维码
```

### 2.2 区块 props 类型（字段对齐《数据契约》）

```ts
interface BrandHeaderProps   { logoUrl: string; slogan: string; }
interface TitleBarProps      { title: string; subtitle?: string; }
interface StatCardGroupProps { cards: { label: string; value: number; unit?: string; trend?: number }[]; }
interface BarChartProps      { title: string; points: SeriesPoint[]; cumulative?: boolean; }
interface QuarterGridProps   { items: { label: string; value: number }[]; }   // 2x2 / 1x4
interface SummaryListProps   { items: { icon: string; text: string }[]; }
interface PaperListBlockProps{ papers: PaperItem[]; max?: number; }
interface ArticleBlockProps  { paper: PaperItem; abstract?: string; }          // abstract 允许手动补
interface KeywordTagsProps   { tags: string[]; }                              // 取 PaperItem.cnFields
interface ProductCardProps    { products: PaperProduct[]; }
interface BrandFooterProps   { contact: BrandContact; qrUrl: string; }
```

### 2.3 区块注册表（h5-core/blocks.ts）

每个区块声明：`type`、显示名、默认 props、是否支持主题色、对应数据源（来自《数据契约》哪张表）。管理后台据此动态渲染录入表单。

---

## 3. H5 文档模型（H5 Schema）

```ts
interface H5Doc {
  id: string;                  // uuid
  title: string;              // H5 标题（内部管理用）
  templateId: string;          // 引用模板（可空，空=自由编排）
  brandId: string;             // 关联 BrandTheme
  status: 'draft' | 'published';
  blocks: BlockNode[];         // 区块有序数组（渲染顺序）
  theme: BrandTheme;           // 渲染时合并品牌主题
  meta: { period?: string; author?: string; };  // 如 "2026-05 月度"
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. 多品牌主题（BrandTheme）

新增品牌 = 仅加一段配置，**零代码**。

```ts
interface BrandTheme {
  brandKey: string;            // 必须 = 开放平台 brand 标准名
  name: string;                // 展示名，如 "普诺赛"
  logoUrl: string;
  primary: string;             // 主色（CSS 变量 --brand-primary）
  primaryDark: string;
  gradient: string;            // 头图渐变
  slogan: string;
  contact: BrandContact;       // 电话/邮箱/微信
  qrUrl: string;               // 底部二维码
  fontFamily?: string;
}
interface BrandContact { phone?: string; email?: string; wechat?: string; address?: string; }
```

实现：UnoCSS theme token + CSS 变量，组件内只用 `var(--brand-primary)`，不写死颜色。内置 `procell`（青）、`elabscience`（蓝）两个，其余品牌按需追加。

---

## 5. 管理后台 API（前端 ↔ 服务端）

基址：`/api/h5`

| Method | Path | 说明 |
|---|---|---|
| GET | `/h5` | H5 列表（支持 `status`/`brandId`/`keyword` 筛选、分页） |
| POST | `/h5` | 新建 H5（body: `H5Doc` 除 id/时间戳） |
| GET | `/h5/:id` | 读取草稿详情 |
| PUT | `/h5/:id` | 更新草稿 |
| DELETE | `/h5/:id` | 删除 |
| POST | `/h5/:id/publish` | 发布（status → published，写入缓存） |
| GET | `/templates` / `POST` `/templates` | 模板 CRUD |
| GET | `/brands` / `POST` `/brands` | 品牌主题 CRUD |
| POST | `/h5/:id/export` | 触发导出，`{ format: 'png'\|'html'\|'mh5' }` |
| GET | `/proxy/brand/statistics?brand=&...` | 代理开放平台 API（套缓存） |

---

## 6. 服务端模块 API（zhiliaowo-proxy/src/h5）

- **持久层**：SQLite（`better-sqlite3`），表：`h5_docs` / `h5_brands` / `h5_templates`，启动时自动迁移。
- **缓存**：复用 proxy 现有「内存 / Redis 无缝切换」抽象（`CACHE_DRIVER=mem|redis` 环境变量控制）。命中优先返回，TTL 可配。
- **导出触发**：
  - `png`：服务端 Puppeteer 渲染 H5 路由截图（scale 2）；前端也可走 `html2canvas` 降级。
  - `html`：`renderToString` + CSS inline（复用 `juice-cli` 的 CSS 内联思路）输出自包含 .html。
  - `mh5`：将 H5 构建为静态页托管，返回分享链接 `/h5/:id`。
- **分享链接**：`GET /h5/:id` 返回该 H5 的移动端渲染页（与后台预览同源组件）。

---

## 7. 四种导出实现

| 形态 | 实现路径 | 用途 |
|---|---|---|
| Vue 应用 | Vite dev/build 标准产物 | 开发预览、本地调试 |
| 纯静态 HTML | 渲染后 CSS inline（juice-cli 同款） | 一键复制到公众号编辑器 |
| PNG 长图 | 浏览器 `html2canvas(scale:2)` 或 服务端 Puppeteer | 公众号图文、印刷 |
| H5 链接 | Vue 路由 `/h5/:id` 部署托管 | 朋友圈分享、可交互 |

> 单一事实源：所有形态都来自同一套区块组件（h5-core + blocks），仅打包入口不同。

---

## 8. 技术栈与约定

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + Vite + UnoCSS + Pinia |
| 服务端 | Hono（复用 zhiliaowo-proxy）+ better-sqlite3 + ioredis（缓存）+ Puppeteer（截图） |
| 共享 | `zhiliaowo-core`（@zhiliaowo/core，独立仓库；前后端都 install，单一事实源） |
| 校验 | zod，前后端共用 schema |
| 提交 | 遵循现有约定：改动即 commit + push；小步增量提交 |

---

## 9. 落地顺序（BC 全实现）

1. **B 阶段**：P0 区块库 + 1 份 Procell 月度盘点（手动数据→预览→PNG）；P1 管理后台 + 多品牌主题 + 4 种导出；P2 接入 proxy 持久化（SQLite）+ 开放平台代理。
2. **C 阶段**：服务端 Puppeteer 长图、分享链接托管、定时任务（每月自动拉数据预填草稿）。
