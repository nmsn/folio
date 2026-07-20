# folio Project

## 项目概述

folio 是一个基于 AI 的 RSS 阅读器，支持稍后阅读功能。

## 技术栈

- **Monorepo**: pnpm + Turbo
- **前端**: React 19, TanStack Router/Start, Tailwind CSS v4 + shadcn
- **UI 组件**: @folio/ui (shadcn)
- **数据库**: Drizzle ORM + Cloudflare D1 (SQLite)
- **API**: Hono + ORPC on Cloudflare Workers (Alchemy)
- **部署**: Alchemy.run + GitHub Actions（web 仍 Vinxi 自托管）
- **桌面端**: Electron
- **移动端**: Expo
- **浏览器扩展**: WXT

## 应用结构

```
apps/
├── web/       # 主 Web 应用 (Vinxi + TanStack Start)
├── api/       # API 服务
├── desktop/   # 桌面客户端
├── mobile/    # 移动端应用
└── extension/ # 浏览器扩展

packages/
├── ui/        # 共享 UI 组件
├── db/        # 数据库 schema 和工具
├── api-client/# API 客户端
└── shared/    # 共享工具函数
```

## 常用命令

```bash
pnpm dev          # 启动所有应用
pnpm dev:web     # 启动 Web 前端
pnpm dev:api     # 启动 API 服务
pnpm build       # 构建所有应用
pnpm lint        # 代码检查
pnpm db:generate # 生成数据库 schema
pnpm db:migrate  # 执行数据库迁移
```

## 开发规范

- 使用 TypeScript
- 使用 pnpm 作为包管理器
- UI 组件放在 packages/ui 中
- 遵循现有的代码风格

## 项目特定约定

- **`apps/mobile` 暂缓开发**：现阶段不主动开发 Expo 移动端。全局扫描、全仓任务、依赖升级等默认跳过该目录，除非明确要求处理 mobile。详见 `apps/mobile/AGENTS.md`。
