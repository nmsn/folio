# 首页 RSS 数据接入设计

**日期：** 2026-06-06
**状态：** 待用户审阅
**关联：** `http://localhost:5173/`（开发期 web 端口，API 后端位于 `http://localhost:3000/`）

## 目标

将 `apps/web/src/app.tsx` 中硬编码的三组 mock 数据（feeds / articles / reader content）替换为来自 RSS 后端 API 的真实数据，让首页能够展示用户订阅源中通过 RSS 抓取并入库的真实文章。

## 范围

### 范围内

- 侧边栏订阅源列表接入 `GET /feeds`
- 文章列表接入 `GET /articles/source/:sourceId`
- 阅读面板接入 `GET /articles/:id`
- "无文章"时的"刷新订阅源"按钮（调用 `POST /feeds/:id/refresh`）
- Vite 代理 `/api` → `http://localhost:3000`，修复 api-client 的 base URL
- 加载中 / 空 / 错误三种状态

### 范围外（本次不做）

- 真实鉴权（继续使用 `MOCK_USER`）
- `isRead` / `isStarred` 状态（数据库无对应字段，需要 join `reading_items`，后续单独实现）
- `unreadCount`（同上）
- "全部文章"聚合视图（需要新增 `GET /articles` 端点）
- 无限滚动、虚拟列表
- OPML 导入/导出 UI
- TanStack Router 路由改造（`routes/_index.tsx` 仍不使用）

## 架构与数据流

```
┌────────────────────────────────────────────────────────────────┐
│  apps/web (Vinxi + React + TanStack Query, port 5173)          │
│                                                                │
│  app.tsx                                                       │
│    ├── useFeeds() ────────────────┐                            │
│    ├── useArticles(selectedId) ───┤──→ /api/*  ──┐             │
│    ├── useArticle(articleId) ─────┘              │             │
│    ├── useCreateFeed()                           │  Vite proxy │
│    └── useRefreshFeed()                          │             │
└──────────────────────────────────────────────────│─────────────┘
                                                   │
                                       ┌───────────▼──────────┐
                                       │  apps/api (NestJS,    │
                                       │  port 3000)           │
                                       │  /feeds, /articles    │
                                       └───────────┬──────────┘
                                                   │
                                       ┌──────────────────────┐
                                       │  PostgreSQL 16         │
                                       │  docker: postgres:    │
                                       │  16-alpine, :5432     │
                                       │  users, sessions,     │
                                       │  rss_sources,         │
                                       │  articles,            │
                                       │  reading_items,       │
                                       │  ai_annotations       │
                                       └──────────────────────┘
```

页面内三列的渲染分支：

| 区域 | 触发条件 | 数据来源 | 空状态 |
|------|---------|---------|--------|
| Sidebar 列表 | 始终 | `useFeeds()` | "暂无订阅源，请添加" |
| Article list | `selectedFeedId === null` | — | "请选择订阅源" |
| Article list | `selectedFeedId !== null` | `useArticles(selectedFeedId)` | "暂无文章" + 刷新按钮 |
| Reader | `selectedArticleId === null` | — | "请选择文章" |
| Reader | `selectedArticleId !== null` | `useArticle(selectedArticleId)` | — |

## 字段映射（DB → UI）

`rss_sources` 与 `articles` 表使用 snake_case，前端组件属性使用 camelCase。映射表：

| UI 字段 | 数据源 | 转换 |
|---------|--------|------|
| Feed `id` | `rss_sources.id` | — |
| Feed `name` | `rss_sources.name` | — |
| Feed `url` | `rss_sources.url` | — |
| Feed `unreadCount` | — | **删除**（本期不做） |
| Article `id` | `articles.id` | — |
| Article `title` | `articles.title` | — |
| Article `author` | `articles.author` | — |
| Article `publishedAt` (string) | `articles.published_at` (Date) | `formatRelativeTime()` |
| Article `preview` | `articles.description` | rename |
| Article `readTime` | — | **删除**（本期不做） |
| Article `isRead` | — | **删除**（本期不做） |
| Article `isStarred` | — | **删除**（本期不做） |
| Reader `title` | `articles.title` | — |
| Reader `author` | `articles.author` | — |
| Reader `publishedAt` | `articles.published_at` | `formatRelativeTime()` |
| Reader `feedTitle` | 查找 `feeds.find(f => f.id === article.source_id)?.name` | — |
| Reader `content` | `articles.content` | `dangerouslySetInnerHTML`（沿用现有做法） |

由于 `published_at` 来自数据库，类型为 `Date`/`number`（timestamp 模式），需要新增一个轻量级格式化函数：

```ts
function formatRelativeTime(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date * 1000) : date;
  // ... 类似 dayjs / date-fns 的"X 分钟前"实现；
  //     若依赖超出范围，则使用 `Intl.RelativeTimeFormat`
}
```

优先用 `Intl.RelativeTimeFormat`，避免引入新依赖。

## 状态机

每个数据区域独立管理 `loading` / `empty` / `error` 三态：

| 区域 | loading | empty | error |
|------|---------|-------|-------|
| Feeds | "加载中…" | "暂无订阅源，请添加" | "加载失败" |
| Articles（无 feed） | — | "请选择订阅源" | — |
| Articles（有 feed） | "加载中…" | "暂无文章" + 刷新按钮 | "加载失败" |
| Reader（无 article） | — | "请选择文章" | — |
| Reader（有 article） | "加载中…" | — | "加载失败" |

错误通过 React Query 的 `isError` 暴露；mutation 错误沿用现有 `AddFeedForm` 的本地 `error` 状态做法。

## 文件改动清单

1. **`apps/web/vite.config.ts`**
   - 增加 `server.proxy`：将 `/api` 转发到 `http://localhost:3000`

2. **`packages/api-client/src/client.ts`**
   - 将默认 `API_BASE` 从 `http://localhost:3000` 改为 `/api`
   - 移除错误的 `process.env.NEXT_PUBLIC_API_URL` 引用（这是 Next.js 的 env 名，Vinxi 不会注入；并且其值会变成 `undefined`，不会按预期工作）
   - 保留对 `import.meta.env.VITE_API_URL` 的可选支持（如有需要，后续可加）

3. **`packages/api-client`** 需重新构建
   - `pnpm --filter @folio/api-client build`
   - 原因：`main` 字段指向 `./dist/index.js`，web 端 import 的是构建产物

4. **`apps/web/src/app.tsx`** —— 主要改动
   - 删除 `mockFeeds`、`mockArticles`、`mockReaderContent`
   - 删除 `displayFeeds = feeds.length > 0 ? feeds : mockFeeds` 的回退逻辑
   - 引入 `useArticles`、`useArticle`、`useRefreshFeed`
   - 引入 `formatRelativeTime` 与字段映射辅助函数
   - 渲染上述状态机的五种分支
   - 在文章列表为空时显示"刷新订阅源"按钮
   - 在阅读面板中根据当前 article 的 `source_id` 从 `feeds` 列表查找 `feedTitle`

5. **`turbo.json`**：增加 `web#dev` 对 `api-client#build` 的依赖，确保 api-client dist 在 web 启动前已构建
6. **不改动**：`apps/web/src/hooks/*`（hooks 已有）、`apps/web/src/routes/*`（未启用）、`apps/web/src/main.tsx`

## 错误处理

- **查询错误**：`isError` 来自 React Query，每个面板渲染一个简短的错误提示
- **变更错误**：
  - `useCreateFeed`：沿用 `AddFeedForm` 现有的 try/catch + 本地 `error` state
  - `useRefreshFeed`：新增 try/catch，失败时给按钮旁一个简短提示；成功后让 React Query 重新拉取 `feeds` 与 `articles`（hook 已自动 invalidate）
- **网络错误**：由 api-client 的 `request` 统一抛错，不做特殊处理

## 验证

### 手动验证步骤

1. 启动 API：`pnpm dev:api`
2. 启动 web：`pnpm dev:web`
3. 浏览器打开 `http://localhost:5173/`
4. 验证：
   - 侧边栏显示"暂无订阅源，请添加"
   - 输入合法 RSS URL，添加成功，列表刷新出新订阅源
   - 点击订阅源 → 右侧文章列表出现"暂无文章" + 刷新按钮
   - 点击刷新 → 列表显示该订阅源的文章
   - 点击文章 → 阅读面板渲染标题、作者、相对时间、HTML 内容
   - 切换不同订阅源，文章列表与阅读面板正确切换

### 自动化

- 现有 `apps/web/src/__tests__/useUrlState.spec.ts` 不应受影响（本次未改动 `useUrlState`）
- 现有 `apps/api` 测试不受影响
- 可选：新增 `formatRelativeTime` 的小型单元测试

## 风险与回滚

- **风险 1**：api-client 改动未重新构建 → web 端继续用旧 dist。**缓解**：开发者本地明确运行 `pnpm --filter @folio/api-client build`；`turbo.json` 中追加 `web#dev` 对 `api-client#build` 的依赖（作为本期改动的一部分，会同时修改 `turbo.json`）。
- **风险 2**：Vite 代理配置后，`/api` 在生产构建中不存在。**缓解**：本期仅限开发期；生产部署时由反向代理或绝对 URL 处理，不在本期范围。
- **风险 3**：`articles.content` 为 null 时 `dangerouslySetInnerHTML` 渲染空字符串。**缓解**：fallback 到 `description`，再 fallback 到空。
- **回滚**：所有改动集中在 `app.tsx`、`vite.config.ts`、`client.ts` 三个文件，git revert 即可。

## 后续

完成本期后，可以独立推进：

1. `isRead` / `isStarred` —— 新增 `GET /articles/source/:id/with-status`，join `reading_items`
2. `unreadCount` —— 新增 `GET /feeds/with-counts`，join `reading_items` 按 status 统计
3. 真实鉴权 —— 替换 `MOCK_USER`，接入 `/auth/session`
4. "全部文章"视图 —— 新增 `GET /articles`（无 source 过滤）+ 游标分页
5. 路由改造 —— 启用 `routes/_index.tsx`，把 `app.tsx` 的内容拆成路由组件
