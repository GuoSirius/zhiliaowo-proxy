# src/h5/export — 服务端导出

四种形态的实现入口（详见《区块库 API 规范》第 7 节）：

- `png` — Puppeteer 渲染 H5 路由截图（scale 2）；前端 `html2canvas` 作降级
- `html` — 渲染后 CSS inline（复用 `juice-cli` 思路）输出自包含 .html
- `mh5` — 将 H5 构建为静态页托管，返回分享链接 `/h5/:id`
- `vue` — 由 `zhiliaowo-template/apps/h5` 标准 build 产物

所有形态来自同一套区块组件（@zhiliaowo/core + blocks），仅打包入口不同。
