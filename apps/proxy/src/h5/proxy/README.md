# src/h5/proxy — 开放平台 API 代理

代理知了窝开放平台的 7 个开放 API（详见《知了窝 H5 数据契约》）：

- `brand/statistics` — 文献统计
- `brand/chart/paper_sum` / `paper_year` — 历年/年度柱状图
- `list/brand/paper` / `list/product/paper` — 文献列表
- `brand/goods/cite_stat` / `cite_num` — 引用概况/引用数量

统一套用缓存抽象，向管理后台提供 `GET /api/h5/proxy/...` 透传接口。
