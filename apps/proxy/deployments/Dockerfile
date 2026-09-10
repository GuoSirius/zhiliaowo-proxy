# syntax=docker/dockerfile:1
# 知了窝代理服务（zhiliaowo-proxy）—— pnpm monorepo 多阶段构建
#
# 部署内容：proxy（Hono 服务，端口 3000）
# 注意：admin 为独立前端，自行构建与部署，本镜像不涵盖。

# ---------- 构建阶段 ----------
FROM node:24-alpine AS build
WORKDIR /app

# 启用 corepack，使用与 packageManager 对齐的 pnpm 版本（pnpm@12.3.4）
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

# 国内构建可改用镜像源（默认走 .npmrc 中的 npmmirror）
ARG PNPM_REGISTRY=https://registry.npmmirror.com
ENV PNPM_REGISTRY=$PNPM_REGISTRY

# 仅复制依赖清单，最大化层缓存
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/proxy/package.json apps/proxy/package.json
RUN pnpm install --frozen-lockfile --registry=$PNPM_REGISTRY

# 复制源码并构建 proxy
COPY . .
RUN pnpm --filter zhiliaowo-proxy build

# ---------- 运行阶段 ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# 复用构建阶段的完整依赖（含 workspace 软链，原生模块已为 linux 二进制）
COPY --from=build /app/node_modules ./node_modules

# 代理服务构建产物
COPY --from=build /app/apps/proxy/package.json ./apps/proxy/package.json
COPY --from=build /app/apps/proxy/dist ./apps/proxy/dist

# Puppeteer 导出依赖 Chromium：镜像内默认不随 npm 下载，按需挂载或下载缓存
# 例：RUN npx puppeteer browsers install chrome
# ENV PUPPETEER_CACHE_DIR=/root/.cache/puppeteer

EXPOSE 3000
CMD ["node", "apps/proxy/dist/index.js"]
