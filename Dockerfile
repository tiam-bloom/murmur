# ============================
# Stage 1: 构建 Client
# ============================
FROM node:22-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 复制 client 源码并构建
COPY client/ ./client/
RUN pnpm build

# ============================
# Stage 2: 运行 Server
# ============================
FROM node:22-slim

RUN npm install -g pnpm

WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# 安装依赖（包含 devDeps，因为需要 tsx 运行 TS）
RUN pnpm install --frozen-lockfile

# 复制 server 源码
COPY server/ ./server/

# 从 builder 阶段复制 client 构建产物
COPY --from=builder /app/client/dist ./client/dist

# 环境变量
ENV NODE_ENV=production
ENV DB_PATH=/app/data/murmur.db

# 持久化数据卷
VOLUME /app/data

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["pnpm", "tsx", "server/index.ts"]
