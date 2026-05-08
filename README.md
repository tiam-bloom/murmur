# Murmur

> 低语随风，只存于记忆

Murmur 是一个匿名低语论坛。所有内容只存在 24 小时，一切信息只在记忆中停留。

## 功能

- **匿名发帖** — 无需注册，浏览器指纹自动生成匿名身份
- **回复与 @提及** — 支持回复特定用户，类似评论回复
- **实时私信** — WebSocket 实时推送，无需刷新
- **24 小时自动清理** — 所有帖子和回复过期自动删除
- **实时推送** — 新帖子、新回复、新私信均通过 WebSocket 即时送达

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + Vite + TypeScript |
| 后端 | Hono + better-sqlite3 |
| 实时通信 | WebSocket (ws) |
| 身份 | FingerprintJS (浏览器指纹) |
| 包管理 | pnpm monorepo |

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发环境（server + client 同时运行）
pnpm dev
```

- **Server** → `http://localhost:3000`
- **Client** → `http://localhost:5173`

## 命令

```bash
pnpm dev      # 启动开发环境
pnpm build    # 构建前端
```

## 项目结构

```
murmur/
├── server/
│   ├── index.ts          # Hono 入口
│   ├── db.ts             # SQLite 数据库初始化
│   ├── ws.ts             # WebSocket 连接管理
│   ├── cleanup.ts        # 24小时自动清理
│   └── routes/
│       ├── posts.ts      # 帖子 API
│       ├── replies.ts    # 回复 API
│       └── messages.ts   # 私信 API
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── api.ts        # API 客户端
│       ├── fingerprint.ts # 浏览器指纹
│       ├── hooks/
│       │   └── useWebSocket.tsx  # WebSocket React hook
│       ├── pages/
│       │   ├── Home.tsx      # 帖子列表
│       │   ├── Post.tsx      # 帖子详情 + 回复
│       │   └── Messages.tsx  # 私信
│       └── components/
│           ├── Layout.tsx
│           ├── PostCard.tsx
│           ├── NewPostModal.tsx
│           ├── ReplyForm.tsx
│           └── MessageForm.tsx
└── package.json
```
