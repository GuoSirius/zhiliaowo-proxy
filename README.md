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

前端 iframe 只写自家域名（如 `/w/elab/brand/statistics`），`appId` 不进入前端源码或构建产物，满足「appId 不落前端」的核心诉求。

## 快速开始

```bash
npm install
cp .env.example .env      # 填入各 brand 的 appId
npm run dev               # tsx watch，默认 :3000
```

健康检查：`GET /health`

环境变量：`PORT` 改端口；`HOST` 改绑定地址（默认 `0.0.0.0`，同时覆盖 `127.0.0.1` / `localhost` / 本机 LAN IP）；`ZLIW_API_BASE` 改开放 API 版本（默认 `v12`）；`ZLIW_WIDGET_BASE` 改开放组件（iframe）基址（默认 `v11`）。

## 接口示例（curl）

下面以 `elab` 站点、`http://localhost:3000` 为例（`site` 换成实际站点 key）。

```bash
# 健康检查
curl http://localhost:3000/health

# 2.1 品牌文献统计
curl http://localhost:3000/api/v1/elab/statistics

# 2.2 品牌 + SPU 引用概况（sku 可选）
curl "http://localhost:3000/api/v1/elab/cite-stat?sku=E-ABcl-0001"

# 2.3 历年累计数量
curl http://localhost:3000/api/v1/elab/paper-sum

# 2.4 年度数量
curl http://localhost:3000/api/v1/elab/paper-year

# 2.5 产品文献引用数量
curl http://localhost:3000/api/v1/elab/goods-cite-num

# 2.6 品牌文献列表
curl http://localhost:3000/api/v1/elab/papers

# 2.7 产品文献列表（sku 必填）
curl "http://localhost:3000/api/v1/elab/product-papers?sku=E-ABcl-0001"

# 开放组件（iframe）302 分发：直接重定向到知了窝 v_widget
# -I 看 302 Location；前端 iframe 写 /w/elab/brand/statistics 即可，appId 由后端注入
curl -I "http://localhost:3000/w/elab/brand/statistics"
```

成功响应统一为 JSON（如 `{ "ok": true }` 或对应数据）；失败返回 `{ "error": "..." }` 与对应状态码（404 未知 site / 500 缺 env / 502 上游异常）。

## 扩展一个新 brand（零业务改动）

1. `src/config/brands.ts` 的 `BRANDS` 加一项（key / label / brand / appIdEnv）
2. `.env` 增加对应的 appId 环境变量（名称即该项配置的 `appIdEnv`，如 `ZLIW_ELAB_APPID=<...>`）
3. 完成。路由、缓存、错误处理自动复用。

> `brand` 值需与知了窝「官方校验通过的品牌名称」完全一致，找对接人确认。

## 缓存无缝切换

- 默认 `CACHE_DRIVER=memory`（进程内，零依赖）
- 设 `CACHE_DRIVER=redis` + `CACHE_REDIS_URL=...` 即切到 Redis
- 业务代码只依赖 `Cache` 接口，切换零改动；未装/未配置时自动回退 memory。

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
