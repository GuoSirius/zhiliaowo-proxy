# @zhiliaowo/admin — 管理后台

管理 proxy 海报数据服务的后台前端（Vue 3 + Vite + UnoCSS + Pinia + vue-router），位于 monorepo 的 `apps/admin`。

> 2026-09 起原 H5 生成子系统（含 `@zhiliaowo/core` 共享层）已整体移除，本后台改造为管理 proxy 的海报数据 / 同步 / 品牌配置，不再依赖已删除的 `/api/h5`。

## 布局

后台管理标准三段式：

- **顶部通栏**（`layouts/AdminLayout.vue`）：项目标题 + 全局筛选（站点 / 年份 / 截止月）。筛选状态存于 Pinia，各页面共享。
- **左侧菜单**：`RouterLink` 三项 — 海报数据 / 同步 / 品牌配置。
- **右侧内容区**：`<RouterView />` 渲染当前路由组件。

## 状态管理

`stores/app.ts` 持有：

- `sites` / `brands` — 启动时 `GET /api/v1/config/sites` 拉取的只读配置；
- `site` / `year` / `endMonth` — 顶部通栏筛选条件（默认当前年、截止月 12）；
- `loadConfig()` — 幂等加载，加载失败写 `loadError`。

各页面用 `storeToRefs(useAppStore())` 直接读，无需逐层透传 props。

## 与 proxy 的连接

`api/client.ts` 以 `import.meta.env.VITE_PROXY_BASE`（默认 `http://localhost:3000`）**直连** proxy，**不走 Vite 代理**：

- 统一信封 `{ code, message, data }`：HTTP 非 2xx 或 `body.code >= 400` 抛 `ApiError`；
- 同步类接口（`POST /report/refresh`）走 `x-admin-token` 头，值来自 proxy 的 `ADMIN_TOKEN`。

> dev 态 proxy 未配 `ALLOWED_ORIGINS` 时回显请求 Origin，跨域天然可用；**生产必须把 admin 源加进 proxy 的 `ALLOWED_ORIGINS`**（支持精确串 / 通配符 / 正则三种写法，见 `apps/proxy/README.md` 安全说明）。

## 页面与接口

| 页面 | 路由 | 调用接口 | 说明 |
| --- | --- | --- | --- |
| 海报数据 | `/poster` | `GET /api/v1/:site/report/overview?year&startMonth=1&endMonth` | 一次性返回 6 板块；按通栏筛选的站点/年份/截止月 |
| 同步 | `/sync` | `GET /api/v1/:site/report/meta`；`POST /api/v1/:site/report/refresh` | 进度总览；手动触发（带 `x-admin-token`） |
| 品牌配置 | `/config` | `GET /api/v1/config/sites` | 只读快照；appId 仅回显 `appIdConfigured`，不返回明文 |

## 开发

```bash
pnpm dev:admin              # Vite dev，默认 :5173（端口由根 .env 的 DEV_PORT_ADMIN 控制）
```

环境变量：根 `.env` 的 `VITE_PROXY_BASE` 指定 proxy 基址（默认 `http://localhost:3000`）。
