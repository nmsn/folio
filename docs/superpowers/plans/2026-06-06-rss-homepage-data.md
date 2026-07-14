# 首页 RSS 数据接入实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `apps/web/src/app.tsx` 中的三组 mock 数据（feeds / articles / reader）替换为来自本地 RSS API 的真实数据，并配置 Vite 代理使 web 应用能够访问 API。

**Architecture:** 保持现有"内联替换"方式 —— 在 `app.tsx` 中直接使用已有的 `useFeeds` / `useArticles` / `useArticle` / `useRefreshFeed` hooks。Vite 在开发期将 `/api/*` 代理到 `http://localhost:3000`，api-client 的 base URL 改为相对路径 `/api`。新增一个 `formatRelativeTime` 工具函数处理时间戳展示。

**Tech Stack:** React 18, TanStack Query, Vinxi, Vite, NestJS (后端), Drizzle ORM + PostgreSQL 16 (docker), `Intl.RelativeTimeFormat`（内置 API，不引入新依赖）

---

## 文件结构

| 文件 | 角色 | 操作 |
|---|---|---|
| `apps/web/vite.config.ts` | Vite 配置（含 dev 代理） | 修改 |
| `packages/api-client/src/client.ts` | API 客户端 base URL | 修改 |
| `packages/api-client/dist/*` | api-client 构建产物 | 由 `pnpm build` 重新生成 |
| `turbo.json` | turbo 任务依赖 | 修改 |
| `apps/web/src/utils/format-relative-time.ts` | 新工具：时间戳 → 相对时间 | 新建 |
| `apps/web/src/app.tsx` | 首页组件 | 修改（核心改动） |
| `docs/superpowers/specs/2026-06-06-rss-homepage-data-design.md` | 设计 spec | 已存在，不动 |

---

## 任务 0：前置检查

- [ ] **Step 0.1：确认本地 docker 可用**

运行：`docker --version`
预期：输出版本信息（例如 `Docker version 24.x.x`）

- [ ] **Step 0.2：确认项目根有 `.env` 或能注入 `DATABASE_URL`**

运行：`ls -la .env* 2>/dev/null || echo "no .env files"`
预期：可能没有 .env 文件，OK；`apps/api` 通过默认 `postgresql://postgres:password@localhost:5432/folio` 即可连接

---

## 任务 1：创建 Vinxi app.config.ts（devProxy + port）

> **背景纠正**：原 plan 假设修改 `apps/web/vite.config.ts` 的 `server.proxy` 即可。但 Vinxi 在构造 Vite dev server 时硬编码 `configFile: false`（见 `node_modules/vinxi/lib/dev-server.js:64`），整个 `vite.config.ts` 在 `pnpm dev:web` 期间被完全忽略。Vinxi 自己的入口是 `app.config.ts`，代理应通过 Nitro 的 `devProxy` 配置。

**Files:**
- Create: `apps/web/app.config.ts`
- Modify: `apps/web/src/app.tsx`（不要修改——保留原样）

- [ ] **Step 1.1：创建 `apps/web/app.config.ts`**

文件内容：

```ts
import { createApp } from 'vinxi';

export default createApp({
  server: {
    devProxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // API 没有 /api 全局前缀，剥离 web 端的 /api 前缀
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  routers: [
    {
      name: 'public',
      type: 'static',
      dir: './public',
    },
    {
      name: 'client',
      type: 'spa',
      handler: './index.html',
      target: 'browser',
    },
  ],
});
```

关键点：
- **Vinxi 0.4.3 没有 `defineConfig` 导出**，使用 `createApp`（来自 `vinxi` 包）
- **`server.port: 5173` 在 Vinxi 0.4.3 dev server 不生效**（createApp 的 `server` 配置只影响 Nitro，不影响 dev 监听端口）。dev server 端口由 `process.env.PORT` 或 `--port` 决定；本计划在 Task 3（dev 脚本改造）中通过 `PORT=5173` 注入
- `devProxy['/api']` 是 Vinxi 通过 Nitro 注册的代理（见 `node_modules/vinxi/lib/nitro-dev.js:165-176`）
- `rewrite` 剥掉 `/api`，让 `/api/feeds` 转发到 `http://localhost:3000/feeds`（API 实际路径）
- `routers` 是 Vinxi 必需的路由器声明；静态 public + SPA client

- [ ] **Step 1.2：验证代理生效（需要 API 先启动）**

启动顺序：
1. 终端 A：`pnpm docker:dev`（postgres）
2. 终端 B：`pnpm db:migrate`
3. 终端 C：`pnpm dev:api`（NestJS 3000 端口）
4. 终端 D：`cd apps/web && pnpm dev`（Vinxi 应监听 5173）

预期终端 D 输出：`http://localhost:5173/`

验证代理：
```bash
curl -i http://localhost:5173/api/feeds
```
预期：HTTP 401 或 200（说明请求从 web 端口被代理到了 API 端口 3000）。
- 如果收到 401：auth 中间件拒绝了 mock user 请求，**代理工作正常**
- 如果收到 404 / `Cannot GET /api/feeds`：代理或 rewrite 失败
- 如果 connection refused：API 未启动

- [ ] **Step 1.3：commit**

```bash
git add apps/web/app.config.ts
git commit -m "feat(web): 创建 Vinxi app.config.ts 配置 devProxy(/api -> :3000) 与端口 5173"
```

---

## 任务 1.5：API 端启用 CORS（仅开发期）

> **为什么需要**：devProxy 在服务端转发，浏览器无跨域问题。但 api-client 用 `credentials: 'include'`，且未来若切到绝对 URL 也需要 CORS。配置在 dev 期允许 `http://localhost:5173`。

**Files:**
- Modify: `apps/api/src/bootstrap.ts`

- [ ] **Step 1.5.1：编辑 bootstrap.ts 启用 CORS**

完整替换为：

```ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 开发期 CORS：允许 web 端 localhost:5173
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });
  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  console.log(`API running on port ${port}`);
}

export { bootstrap };
```

变更要点：在 `NestFactory.create` 之后、`app.listen` 之前增加 `app.enableCors({ origin: 'http://localhost:5173', credentials: true })`。

- [ ] **Step 1.5.2：commit**

```bash
git add apps/api/src/bootstrap.ts
git commit -m "feat(api): 启用开发期 CORS（允许 localhost:5173 + credentials）"
```

---

## 任务 2：修复 api-client base URL

**Files:**
- Modify: `packages/api-client/src/client.ts`

- [ ] **Step 2.1：编辑 client.ts**

完整替换为：

```ts
const API_BASE = '/api';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE;
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json() as T;
  }

  get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

变更要点：
- 移除 `const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';`
- 改为 `const API_BASE = '/api';`

- [ ] **Step 2.2：重新构建 api-client**

运行：`pnpm --filter @folio/api-client build`
预期：tsup 构建成功，`packages/api-client/dist/index.js` 文件被更新（`git status` 可见 `dist/` 改动或产物已是最新的 —— 视项目 `.gitignore` 而定）

- [ ] **Step 2.3：commit**

```bash
git add packages/api-client/src/client.ts
# 如果 dist 被跟踪:
git add packages/api-client/dist/
git commit -m "fix(api-client): base URL 由 http://localhost:3000 改为 /api（相对路径，配合 Vite 代理）"
```

如果 `dist/` 在 `.gitignore` 中被忽略（很可能），commit 只含 `src/client.ts` 一处变更。

## 任务 3：turbo.json + dev 端口 + Nitro compatibilityDate

**Files:**
- Modify: `turbo.json`
- Modify: `apps/web/package.json`
- Modify: `apps/web/app.config.ts`

- [ ] **Step 3.1：编辑 turbo.json**

完整替换为：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env/**"],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "dependsOn": ["^build"]
    },
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

变更要点：给 `dev` 任务增加 `"dependsOn": ["^build"]`，确保 `apps/web` 的 `dev` 在启动前先构建 `@folio/api-client` 等依赖包。

- [ ] **Step 3.2：编辑 `apps/web/package.json` 让 dev 脚本注入 PORT=5173**

修改 `apps/web/package.json`：

```diff
   "scripts": {
-    "dev": "vinxi dev",
+    "dev": "PORT=5173 vinxi dev",
     "build": "vinxi build",
     "typecheck": "tsc --noEmit"
   },
```

变更要点：Vinxi 0.4.3 的 dev server 端口由 `process.env.PORT` 或 `--port` 决定（`server.port` 在 createApp 中只影响 Nitro，不影响 dev 监听）。注入 `PORT=5173` 避免与 API 端口 3000 冲突。

- [ ] **Step 3.3：编辑 `apps/web/app.config.ts` 加 Nitro compatibilityDate**

修改 `apps/web/app.config.ts`，在 createApp 顶层加 `compatibilityDate`：

```diff
 import { createApp } from 'vinxi';

 export default createApp({
+  compatibilityDate: '2026-06-06',
   server: {
     devProxy: {
       '/api': {
         target: 'http://localhost:3000',
         changeOrigin: true,
         // API 没有 /api 全局前缀，剥离 web 端的 /api 前缀
         rewrite: (path) => path.replace(/^\/api/, ''),
       },
     },
   },
   routers: [ ... ],
 });
```

变更要点：消除 Nitro 启动警告 `WARN Please add compatibilityDate...`。

- [ ] **Step 3.4：commit**

```bash
git add turbo.json apps/web/package.json apps/web/app.config.ts
git commit -m "chore(monorepo): turbo dev ^build 依赖 + web dev 端口 5173 + Nitro compatibilityDate"
```

---

## 任务 4：新建 `formatRelativeTime` 工具

**Files:**
- Create: `apps/web/src/utils/format-relative-time.ts`

> 备注：spec 标注"可选：新增 `formatRelativeTime` 的小型单元测试"。检查发现 `apps/web` 未安装 vitest（`package.json` 无 vitest 依赖），且本任务的核心是 UI 数据接入，单测收益小。本计划跳过单测，改为在端到端验证中观察输出。

- [ ] **Step 4.1：创建文件**

`apps/web/src/utils/format-relative-time.ts`：

```ts
/**
 * 将时间戳格式化为"X 分钟前 / X 小时前 / X 天前"等相对时间。
 * 支持 Date 对象或秒级/毫秒级数字时间戳。
 * 不引入新依赖，使用浏览器内置的 Intl.RelativeTimeFormat。
 */
export function formatRelativeTime(input: Date | number | string | null | undefined): string {
  if (input == null) return '';

  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return '';

  // 数据库返回的可能是秒级时间戳（drizzle integer mode='timestamp' 默认是秒）
  // 通过数值大小判断：> 1e12 视为毫秒，否则视为秒
  const ts = date.getTime();
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const now = Date.now();
  const diffSec = Math.round((ms - now) / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });

  if (absSec < 60) return rtf.format(diffSec, 'second');
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (absSec < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (absSec < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86400 * 365)), 'year');
}
```

- [ ] **Step 4.2：commit**

```bash
git add apps/web/src/utils/format-relative-time.ts
git commit -m "feat(web): 新增 formatRelativeTime 工具函数"
```

---

## 任务 5：改造 `app.tsx` —— 接入真实数据

**Files:**
- Modify: `apps/web/src/app.tsx`

本任务是核心改动，按子步骤分多次 commit，便于 review。

### 子任务 5.1：删除 mock 数据，引入 useArticles/useArticle

- [ ] **Step 5.1.1：替换 app.tsx 顶部 import**

将文件第 1-8 行：

```tsx
import React, { useState } from 'react';
import {
  ClassicThreeColumnLayout,
  Sidebar,
  ArticleList,
  Reader,
} from '@folio/ui';
import { useFeeds, useCreateFeed } from './hooks/useFeeds';
```

改为：

```tsx
import React, { useState } from 'react';
import {
  ClassicThreeColumnLayout,
  Sidebar,
  ArticleList,
  Reader,
} from '@folio/ui';
import { useFeeds, useCreateFeed, useRefreshFeed } from './hooks/useFeeds';
import { useArticles, useArticle } from './hooks/useArticles';
import { formatRelativeTime } from './utils/format-relative-time';
```

- [ ] **Step 5.1.2：删除 mock 数据常量**

删除 `app.tsx` 第 10-92 行整段 `mockFeeds`、`mockArticles`、`mockReaderContent`（共 83 行）。

- [ ] **Step 5.1.3：commit**

```bash
git add apps/web/src/app.tsx
git commit -m "refactor(web): 删除 app.tsx 中硬编码的 mock 数据"
```

### 子任务 5.2：改造 App 组件的 hooks 与状态

- [ ] **Step 5.2.1：替换 App 组件内的 hooks 与状态**

将第 146-164 行（`function App() {` 起始到 `filteredArticles` 变量）替换为：

```tsx
function App() {
  // Bypass auth for testing - always use mock user
  const user = MOCK_USER;

  const { data: feeds = [], isLoading: feedsLoading, isError: feedsError, refetch: refetchFeeds } = useFeeds();
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'unread' | 'starred'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [showAddFeed, setShowAddFeed] = useState(false);

  // 选中订阅源时才拉取文章列表
  const {
    data: articles = [],
    isLoading: articlesLoading,
    isError: articlesError,
    refetch: refetchArticles,
  } = useArticles(selectedFeedId ?? undefined);

  // 选中文章时才拉取详情
  const {
    data: selectedArticle,
    isLoading: articleLoading,
    isError: articleError,
  } = useArticle(selectedArticleId ?? '');

  // 刷新当前选中订阅源
  const refreshFeed = useRefreshFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefreshFeed = async () => {
    if (!selectedFeedId) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refreshFeed.mutateAsync(selectedFeedId);
      // 成功后让文章列表立即重新拉取（hook 自身也会 invalidate，但显式调用更可控）
      refetchArticles();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 当前选中订阅源的名称（用于阅读面板的 feedTitle）
  const currentFeedName = selectedFeedId
    ? feeds.find((f: { id: string }) => f.id === selectedFeedId)?.name
    : undefined;

  // 文章按时间排序（newest 优先）
  const sortedArticles = [...articles].sort((a, b) => {
    const ta = new Date(a.published_at as string | number | Date).getTime();
    const tb = new Date(b.published_at as string | number | Date).getTime();
    return sort === 'newest' ? tb - ta : ta - tb;
  });
```

- [ ] **Step 5.2.2：commit**

```bash
git add apps/web/src/app.tsx
git commit -m "refactor(web): App 组件接入 useArticles/useArticle/useRefreshFeed"
```

### 子任务 5.3：改造 Sidebar 列表渲染

- [ ] **Step 5.3.1：替换 Sidebar 列表渲染**

将原第 195-213 行（`feedsLoading` 三元判断至 `</ul>` 闭合）替换为：

```tsx
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Feeds
            </h2>
            {feedsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : feedsError ? (
              <div className="space-y-2">
                <p className="text-sm text-red-500">加载订阅源失败</p>
                <button
                  onClick={() => refetchFeeds()}
                  className="text-xs text-primary hover:underline"
                >
                  重试
                </button>
              </div>
            ) : feeds.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无订阅源，请添加</p>
            ) : (
              <ul className="space-y-1">
                {feeds.map((feed: { id: string; name: string }) => (
                  <li key={feed.id}>
                    <button
                      onClick={() => {
                        setSelectedFeedId(feed.id);
                        setSelectedArticleId(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between ${
                        selectedFeedId === feed.id ? 'bg-accent' : 'hover:bg-accent'
                      }`}
                    >
                      <span className="truncate">{feed.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
```

变更要点：
- 移除 `displayFeeds` 兜底逻辑
- 增加 `feedsError` 错误分支
- 增加"暂无订阅源"空状态
- feed 点击时同时清空 `selectedArticleId`

- [ ] **Step 5.3.2：commit**

```bash
git add apps/web/src/app.tsx
git commit -m "feat(web): Sidebar 订阅源列表接入 loading/error/empty 三态"
```

### 子任务 5.4：改造 Article List 渲染

- [ ] **Step 5.4.1：替换 ArticleList 渲染**

将原第 259-292 行（`<ArticleList>` 到 `</ArticleList>` 闭合）替换为：

```tsx
        {/* Article list */}
        <ArticleList className="p-0">
          <div className="p-3 border-b">
            <h2 className="text-sm font-semibold">Articles</h2>
          </div>
          {!selectedFeedId ? (
            <p className="p-4 text-sm text-muted-foreground">请选择订阅源</p>
          ) : articlesLoading ? (
            <p className="p-4 text-sm text-muted-foreground">加载中…</p>
          ) : articlesError ? (
            <p className="p-4 text-sm text-red-500">加载文章失败</p>
          ) : sortedArticles.length === 0 ? (
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">暂无文章</p>
              <button
                onClick={handleRefreshFeed}
                disabled={refreshing}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md disabled:opacity-50"
              >
                {refreshing ? '刷新中…' : '刷新订阅源'}
              </button>
              {refreshError && (
                <p className="text-xs text-red-500">{refreshError}</p>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {sortedArticles.map((article: {
                id: string;
                title: string;
                author?: string | null;
                published_at: string | number | Date;
                description?: string | null;
              }) => (
                <li key={article.id}>
                  <button
                    onClick={() => setSelectedArticleId(article.id)}
                    className={`w-full text-left p-3 hover:bg-accent transition-colors ${
                      selectedArticleId === article.id ? 'bg-accent' : ''
                    }`}
                  >
                    <h3 className="text-sm line-clamp-2 mb-1">{article.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {article.author && <span>{article.author}</span>}
                      {article.author && <span>·</span>}
                      <span>{formatRelativeTime(article.published_at)}</span>
                    </div>
                    {article.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ArticleList>
```

变更要点：
- 三种触发条件分支：`!selectedFeedId` / 加载中 / 错误 / 空（带刷新按钮）/ 有数据
- 使用 `formatRelativeTime` 替代 mock 字符串
- 移除 `isRead` / `isStarred` 视觉判断
- 移除 `readTime`

- [ ] **Step 5.4.2：commit**

```bash
git add apps/web/src/app.tsx
git commit -m "feat(web): ArticleList 接入 useArticles 数据，添加空/错/加载态和刷新按钮"
```

### 子任务 5.5：改造 Reader 渲染

- [ ] **Step 5.5.1：替换 Reader 渲染**

将原第 294-315 行（`<Reader>` 到 `</Reader>` 闭合）替换为：

```tsx
        {/* Reader */}
        <Reader className="p-6">
          {!selectedArticleId ? (
            <p className="text-sm text-muted-foreground">请选择文章</p>
          ) : articleLoading ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : articleError || !selectedArticle ? (
            <p className="text-sm text-red-500">加载文章失败</p>
          ) : (
            <article className="max-w-2xl mx-auto">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">
                  {currentFeedName ?? ''}
                </p>
                <h1 className="text-3xl font-bold mb-4">{selectedArticle.title}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {selectedArticle.author && <span>By {selectedArticle.author}</span>}
                  {selectedArticle.author && <span>·</span>}
                  <span>{formatRelativeTime(selectedArticle.published_at)}</span>
                </div>
              </div>
              <div
                className="prose prose-neutral dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    (selectedArticle.content as string | null | undefined) ??
                    (selectedArticle.description as string | null | undefined) ??
                    '',
                }}
              />
            </article>
          )}
        </Reader>
```

变更要点：
- 三种状态分支：无选择 / 加载中 / 错误或缺失 / 有数据
- `feedTitle` 通过 `currentFeedName`（从 `feeds` 列表查找）
- `content` fallback 到 `description` 再 fallback 到空串
- 使用 `formatRelativeTime` 替代 mock 字符串

- [ ] **Step 5.5.2：commit**

```bash
git add apps/web/src/app.tsx
git commit -m "feat(web): Reader 接入 useArticle 数据，添加空/错/加载态"
```

### 子任务 5.6：`view` 状态保留

> 备注：原 `view` 状态（'all' | 'unread' | 'starred'）的 `unread` / `starred` 选项已无数据源支持。本期最小改动：**保留 `view` / `sort` 状态变量与按钮**（mock 时代码完整保留），`sort` 通过客户端 `sortedArticles` 实际生效；`view` 当前仅 `'all'` 路径有效。`unread` / `starred` 选项的 UI 移除或对接 `reading_items` 留作后续 issue。

- [ ] **Step 5.6.1：（无需代码改动）确认保留决定**

确认本任务无需代码改动；如要清理可在后续 PR 中处理。

---

## 任务 6：端到端验证

- [ ] **Step 6.1：启动 PostgreSQL（docker）**

运行：`pnpm docker:dev`（后台运行或新终端）
预期：postgres 容器启动，`localhost:5432` 可连接，db `folio` 存在

- [ ] **Step 6.2：执行数据库迁移**

运行：`pnpm db:migrate`
预期：迁移成功，数据库中有 `users`、`rss_sources`、`articles` 等表

- [ ] **Step 6.3：启动 API**

运行：`pnpm dev:api`（后台或新终端）
预期：终端输出 `API running on port 3000`

- [ ] **Step 6.4：启动 Web**

运行：`pnpm dev:web`（后台或新终端）
预期：终端输出 `Local: http://localhost:5173/`

- [ ] **Step 6.5：浏览器手动验证清单**

打开 `http://localhost:5173/`，逐项确认：

| # | 操作 | 预期结果 |
|---|------|---------|
| 1 | 初次加载 | Sidebar 显示"暂无订阅源，请添加"；文章列表显示"请选择订阅源"；阅读面板显示"请选择文章" |
| 2 | 点击"+ Add Feed"，输入合法 RSS URL（例如 `https://hnrss.org/frontpage`），提交 | 新订阅源出现在 Sidebar 列表中 |
| 3 | 点击新增的订阅源 | 文章列表显示"加载中…"，随后变为"暂无文章" + "刷新订阅源"按钮 |
| 4 | 点击"刷新订阅源" | 按钮变为"刷新中…"，数秒后文章列表出现若干文章，每行包含标题、作者（或无）、相对时间、描述预览 |
| 5 | 点击某篇文章 | 阅读面板显示该文章的标题、作者、相对时间、所属订阅源名、HTML 内容（`dangerouslySetInnerHTML`） |
| 6 | 切换到另一个订阅源 | 文章列表重新加载；阅读面板保持上一篇文章（不切换）或清空（按实现）|
| 7 | 浏览器 console 检查 | 无 React Query 警告、无未捕获错误 |

- [ ] **Step 6.6：（可选）typecheck 验证**

运行：`pnpm typecheck`
预期：所有包通过 `tsc --noEmit`，没有新增类型错误

- [ ] **Step 6.7：（可选）回归既有测试**

运行：`cd apps/web && pnpm vitest` 之前的 `useUrlState.spec.ts`（**注**：vitest 在 web 包未安装，会失败 —— 这是已知遗留问题，与本任务无关）

---

## 任务 7：清理

- [ ] **Step 7.1：检查 git status**

运行：`git status`
预期：工作区干净，所有改动已 commit

- [ ] **Step 7.2：列出本次 PR 涉及的所有 commit**

运行：`git log --oneline HEAD~10..HEAD`（或合适范围）
预期：包含以下 commit（按时间顺序）：
- `docs: 修正 CLAUDE.md 数据库描述...`
- `docs(spec): 修正架构图 - 数据库由 Turso(SQLite) 改为 PostgreSQL(docker)...`
- `docs(spec): 自我审阅修订...`
- `docs(spec): 首页 RSS 数据接入设计`
- `feat(web): 配置 Vite 代理...`
- `fix(api-client): base URL...`
- `chore(turbo): dev 任务增加 ^build 依赖...`
- `feat(web): 新增 formatRelativeTime...`
- `refactor(web): 删除 app.tsx 中硬编码的 mock 数据`
- `refactor(web): App 组件接入...`
- `feat(web): Sidebar 订阅源列表接入...`
- `feat(web): ArticleList 接入...`
- `feat(web): Reader 接入...`

---

## 风险与回滚

- **风险 A：API 端点的字段命名与代码假设不符** —— 实际 API 返回 `source_id` 而非 `feedId`，类型 `Date` 而非 string。如果字段名拼写错误，TypeScript 会立即报错（`tsc --noEmit`），但运行时类型（如 `published_at` 是字符串还是 Date）需要端到端验证。
- **风险 B：`articles.content` 为 null** —— 已在 Reader 渲染中加入 fallback 到 `description`，再 fallback 到空串。
- **风险 C：Vite 代理在生产构建无效** —— 本期仅限开发期，符合 spec 范围。
- **回滚**：所有改动集中在 4 个文件（`apps/web/vite.config.ts`、`packages/api-client/src/client.ts`、`turbo.json`、`apps/web/src/app.tsx`）和 1 个新文件（`apps/web/src/utils/format-relative-time.ts`），每个子任务独立 commit。`git revert` 对应 commit 即可回滚。

---

## 范围外（不做）

- 真实鉴权、isRead/isStarred、unreadCount、"全部文章"视图、无限滚动、OPML UI、路由改造 —— 详见 spec "范围外" 一节
- `view` 状态中 `'unread' | 'starred'` 选项的 UI 清理 —— 留作后续
- `formatRelativeTime` 的单元测试 —— `apps/web` 未安装 vitest，留作后续测试基础设施工作
