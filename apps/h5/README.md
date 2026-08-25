# @zhiliaowo/h5 — H5 展示页

H5 移动端展示页（Vue 3 + Vite + UnoCSS），运行于 `zhiliaowo-template` monorepo 的 `apps/h5`。

## 职责

- `src/blocks/` — 与 admin 共享的区块定义（同一套区块组件）
- `src/render/` — 渲染 + 截图（前端 `html2canvas` 降级；服务端 Puppeteer 由 proxy 负责）

## 部署

- `npm run build:h5` 产物可由 `zhiliaowo-proxy` 经 `/h5/:id` 托管，或独立静态托管。
- `base: './'` 保证相对路径可移植。

## 开发

```bash
npm run dev:h5   # 或 npm -w @zhiliaowo/h5 dev
```
