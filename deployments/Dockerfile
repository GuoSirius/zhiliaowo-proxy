# 多阶段构建：Node 24 精简镜像
# 构建阶段
FROM node:24-alpine AS build
WORKDIR /app

# 国内构建可改用 npmmirror：在 build 阶段传入 --build-arg REGISTRY=https://registry.npmmirror.com
ARG REGISTRY=https://registry.npmjs.org
COPY package.json package-lock.json* ./
RUN npm install --registry=$REGISTRY
COPY . .
RUN npm run build

# 运行阶段
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --registry=https://registry.npmjs.org
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
