# Folio UI 重构设计

**日期：** 2026-06-07
**状态：** 待用户审阅
**关联：** 设计稿 `index.html`（用户提供的 Folio · Reader 静态稿）

## 目标

将 `apps/web` 从当前三列骨架（粗糙的 Tailwind 主题）改造为 **Folio · Reader** 设计稿的三栏阅读器：

- **画布：** warm paper（低彩度米白色，OKLCH 色彩空间）
- **强调色：** warm terracotta（RSS-orange 致敬）
- **字体：** serif body（Iowan Old Style / Charter / Songti SC 等本地系统字体堆叠）+ sans UI + mono meta
- **三列布局：** Navigation（264px）| Article List（392px）| Reader（1fr，最宽 720px）
- **完整交互：** 智能视图、分类分组、day-sep、item 卡、kicker + byline、AI summary 卡（typewriter）、next-up、键盘快捷键

## 范围

### 范围内

- 主题 tokens（颜色、字体、圆角、列宽、节奏）→ Tailwind theme 扩展 + CSS 变量
- 三列布局（grid 替代 flex）→ `apps/web/src/app.tsx` 改用 `apps/web/index.html` 中的 `.app` 结构
- Sidebar 完整重构：顶栏（品牌 + actions）+ 搜索框 + smart views（5 个） + 分类分组（可折叠） + 底部添加/导入按钮
- ArticleList 重构：head（标题 + 计数） + tabs（全部/未读/已收藏） + day-sep + item 卡（unread 圆点 + 源 + 作者 + 标题 + 摘要 + 时间 + 收藏）
- Reader 重构：toolbar（导航/收藏/已读/AI/稍后读/分享）+ kicker + title + dek + byline + AI summary（可折叠 + typewriter） + body + 进度 + next-up
- 客户端聚合 hooks：`useGroupedFeeds(feeds)`、`useReadState(articleIds)`、`useStarredState(articleIds)`
- 键盘快捷键：j/k（上下篇）、s（收藏）、m（已读）、⌘.（AI 总结切换）
- 底部 keyhint 提示条
- 响应式（≤1100px 隐藏 list，≤720px 仅 reader）

### 范围外

- 真实 `isRead` / `isStarred` 状态同步到后端（本期用 localStorage + 内存）
- 真实 AI 总结（API 端有 AI 模块但本期用 web 端内置 mock 文本）
- OPML 导入/导出 UI
- 添加订阅源表单 UI 改造（保留现有）
- Router 改造（仍直接用 App）
- Web Font 引入（用本地系统字体堆叠）

## 设计 Tokens

### 颜色（OKLCH，CSS 变量定义在 `app.css` 的 `:root`）

| Token | 值 | 用途 |
|---|---|---|
| `--bg` | `oklch(98.5% 0.005 85)` | 主背景（warm paper） |
| `--surface` | `oklch(99.6% 0.002 85)` | 卡片表面 |
| `--surface-2` | `oklch(97.2% 0.006 85)` | hover/active 表面 |
| `--fg` | `oklch(22% 0.012 70)` | 主要文本 |
| `--fg-2` | `oklch(38% 0.012 70)` | 次要文本 |
| `--muted` | `oklch(52% 0.012 70)` | 弱化文本 |
| `--muted-2` | `oklch(65% 0.010 70)` | 极弱文本 |
| `--border` | `oklch(89% 0.008 85)` | 默认边框 |
| `--border-2` | `oklch(82% 0.010 85)` | 强调边框 |
| `--accent` | `oklch(62% 0.16 38)` | 强调色（warm terracotta） |
| `--accent-hover` | `oklch(56% 0.17 35)` | 强调色 hover |
| `--accent-soft` | `oklch(95% 0.035 40)` | 强调色柔背景 |
| `--accent-ink` | `oklch(99% 0.005 85)` | 强调色上的文字 |
| `--read` | `oklch(70% 0.008 70)` | 已读指示 |
| `--star` | `oklch(72% 0.14 75)` | 收藏星标 |

### 字体（本地系统字体堆叠，零网络依赖）

```css
--font-display: 'Iowan Old Style', 'Charter', 'Source Serif Pro', Georgia, 'Songti SC', 'STSong', serif;
--font-ui:      -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif;
--font-mono:    ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
```

### 节奏 & 尺寸

```css
--r-xs: 4px;
--r-sm: 8px;
--r-md: 12px;
--col-nav: 264px;
--col-list: 392px;
--col-read: min(720px, 100%);
```

### Tailwind theme 扩展（`packages/tailwindcss/theme.json`）

- 颜色映射：`bg-paper / bg-surface / bg-surface-2`、`fg / fg-2 / muted / muted-2`、`border / border-2`、`accent / accent-hover / accent-soft / accent-ink`
- 字体族映射：`font-display / font-ui / font-mono`
- 圆角映射：`rounded-xs / sm / md`
- 列宽（spacing）映射：`w-nav / w-list / w-read`

## 布局架构

### 替换 `@folio/ui` 的 `ThreeColumnLayout` 系列

设计稿的三列是**grid 布局**（不是当前 packages/ui 的 flex）。两种选择：
- **A. 在 packages/ui 新增 `FolioThreeColumnLayout`**（继承 ThreeColumnLayout 但用 grid）
- **B. 在 apps/web 内部直接写 grid**，不动 packages/ui

**选择 A**：扩展 packages/ui 的布局组件，新增 `FolioThreeColumnLayout`（grid 264/392/1fr）。

### `apps/web/src/app.tsx` 外层结构（对应设计稿 `.app`）

```tsx
<div className="grid h-screen max-w-[1440px] mx-auto bg-[var(--bg)] border-x border-[var(--border)]"
     style={{ gridTemplateColumns: 'var(--col-nav) var(--col-list) 1fr' }}>
  <FolioSidebar />
  <FolioArticleList />
  <FolioReader />
</div>
```

响应式（媒体查询写在 app.css）：
- `≤1100px`：`grid-template-columns: var(--col-nav) 1fr`，list 列隐藏
- `≤720px`：`grid-template-columns: 1fr`，nav 列隐藏

## Sidebar 组件（设计稿 `.col-nav`）

```
┌─────────────────────┐
│ Topbar（48px）      │  brand: "Folio·" + actions (sync/settings)
├─────────────────────┤
│ Search（搜索框）    │  ⌘K kbd 提示
├─────────────────────┤
│ Smart views（5 个） │  全部文章 / 今天 / 未读 / 已收藏 / 稍后读
├─────────────────────┤
│ 分组：技术（6）     │  可折叠，每组下若干 nav-item
│ 分组：设计（4）     │
│ 分组：新闻（3）     │
│ 分组：...           │
├─────────────────────┤
│ Footer              │  添加订阅源 / 导入 OPML
└─────────────────────┘
```

### 客户端聚合（替代缺失的 API 聚合端点）

**新增 `apps/web/src/hooks/useGroupedFeeds.ts`**：

```ts
// 输入：feeds: Feed[]（来自 useFeeds）
// 输出：{ smartViews, groups }
// smartViews = [
//   { id: 'all', label: '全部文章', count: articles.length, icon: ... },
//   { id: 'today', label: '今天', count: todayCount, icon: ... },
//   { id: 'unread', label: '未读', count: unreadCount, icon: ... },
//   { id: 'starred', label: '已收藏', count: starredCount, icon: ... },
//   { id: 'later', label: '稍后读', count: laterCount, icon: ... },
// ]
// groups = feeds 按 category 字段 group by，自动按 category 字母排序
```

**新增 `apps/web/src/hooks/useArticleState.ts`**：

```ts
// 管理 article 的 read / starred 状态（localStorage + 内存）
// 后续如需同步后端：替换 localStorage 部分即可
//
// useArticleState() 返回 {
//   isRead(articleId): boolean
//   isStarred(articleId): boolean
//   markRead(articleId): void
//   toggleStarred(articleId): void
// }
```

**为什么用 localStorage**：当前 API 端没暴露 read/starred 状态，本期用浏览器 localStorage 持久化用户操作，未来如需同步只需替换 storage 适配器。spec 中已说明"isRead/isStarred UI for now"，本次恢复 UI 但用前端状态。

### Smart views 计数（基于当前 articles）

- `all` = `articles.length`
- `today` = `articles.filter(a => isToday(a.published_at)).length`
- `unread` = `articles.filter(a => !isRead(a.id)).length`
- `starred` = `articles.filter(a => isStarred(a.id)).length`
- `later` = 0（API 无 reading_items 支持，留 0 占位）

**注意**：这些计数仅对**当前选中的订阅源**生效（因为 articles 是按 feed 加载的）。如果选中"全部文章"聚合视图，counts 反映当前 feed；切换 feed 时更新。

## ArticleList 组件（设计稿 `.col-list`）

```
┌─────────────────────┐
│ Head                │  "全部文章" + 计数 sub
│ Tabs                │  全部 / 未读 / 已收藏
├─────────────────────┤
│ Day-sep "今天"      │
│ Item 1（active）    │  unread 圆点 + 源 + 作者 + 标题 + 摘要 + 时间 + 收藏
│ Item 2              │
│ ...                 │
│ Day-sep "昨天"      │
│ ...                 │
└─────────────────────┘
```

### 三种渲染分支

| 触发条件 | 内容 |
|---|---|
| 无 `selectedFeedId` | 提示"请选择订阅源" |
| 加载中 | skeleton / "加载中…" |
| `articles.length === 0` | "暂无文章" + 刷新按钮（保留现状） |
| 有数据 | 按 day-sep + item 列表 |

### Day-sep 客户端分组

新增 `apps/web/src/utils/group-articles-by-day.ts`：

```ts
// 输入：articles: Article[]
// 输出：[ { day: '今天' | '昨天' | '3 天前' | ..., items: [...] }, ... ]
//
// 排序：按 published_at desc
// 分组 key：today / yesterday / this-week / older
```

### Item 卡（设计稿 `.item`）

| 字段 | 渲染 |
|---|---|
| `.unread` | 仅 `!isRead` 时显示 accent 色圆点 |
| `.item-meta` | `源 · 作者`（无作者时只显示源） |
| `.item-title` | 2 行截断 |
| `.item-excerpt` | 2 行截断，灰色 |
| `.item-time` | `formatRelativeTime(published_at)` |
| `.item-star` | 收藏按钮，`is-on` 时填充 |

点击 item 行为：
- 标记为已读（isRead → true）
- 设置 `selectedArticleId`
- 滚动到顶部 + 移除 is-unread 视觉

### Tabs（设计稿 `.list-tab`）

`全部 / 未读 / 已收藏` —— 客户端筛选 articles。
- `unread` = 客户端 `!isRead`
- `starred` = 客户端 `isStarred`

## Reader 组件（设计稿 `.col-content`）

```
┌─────────────────────┐
│ Toolbar（48px）      │  上一/下一 + 收藏 + 已读 + AI + 稍后读 + 分享 + ⋯
├─────────────────────┤
│ Kicker              │  源 · 分类 · 日期
│ Title (h1 serif)    │
│ Dek (serif italic)  │
│ Byline              │  头像首字母 + 作者 + 时间 + 阅读时长
│ AI Summary (可折叠) │  badge + 状态 + 折叠箭头 + typewriter 内容
│ Body                │  衬线字体，drop cap 首字母
│ Foot                │  阅读进度条 + 字数 + 来源
│ Next-up             │  下一篇 + 跳转
└─────────────────────┘
```

### Toolbar

| 按钮 | 行为 |
|---|---|
| ←/→ | 上一/下一篇文章（在 articles 列表中切换 selectedArticleId） |
| ★ 已收藏 | `toggleStarred(selectedArticleId)` |
| ✓ 标记已读 | `markRead(selectedArticleId)` |
| ✦ AI 总结 ⌘. | 切换 AI summary 展开/折叠 |
| 稍后读 | no-op（暂未实现） |
| 分享 | `navigator.clipboard.writeText(articleUrl)` |
| ⋯ | no-op（菜单） |

### AI Summary

**组件：`apps/web/src/components/AiSummary.tsx`**

UI 结构（设计稿 `.ai-summary`）：
- header：badge（"AI 总结"）+ 状态（"点击展开" / "正在总结..." / "由 Folio 摘要生成"）+ chev
- body：tldr（typewriter 渲染） + 要点列表（typewriter） + 复制/重新生成按钮

**Mock 数据**（web 端内置）：

```ts
// apps/web/src/data/mock-ai-summaries.ts
export const MOCK_AI_SUMMARIES: Record<string, { tldr, points, saved, source }> = {
  default: (title, excerpt) => ({...}),
  // 4-5 个预设，对应默认订阅源的热门文章
}
```

**Typewriter 动画**：从设计稿直接移植 `aiTypeText` / `aiTypeList` 函数（封装到 `apps/web/src/utils/ai-typewriter.ts`）。

### Body

保留现有的 `dangerouslySetInnerHTML` 渲染 content/description fallback 逻辑，但用设计稿的 typography：
- 字体 `var(--font-display)` 17px/1.72
- 首段 drop cap（首字母大字，accent 色）
- 段落间距 1.1em
- 链接：accent 色，下划线
- 引用块（如果存在）：accent 左边框 + soft 背景

### Next-up

"下一篇" 卡片，指向 articles 列表中的下一条。如果已是最后一条，提示"已读完"。

## 客户端聚合 Hooks

**新增 `apps/web/src/hooks/useArticleState.ts`**（localStorage backed）：

```ts
const KEY = 'folio.articleState.v1';
// state: { [articleId]: { read: boolean, starred: boolean } }

export function useArticleState() {
  // 从 localStorage 读取 + 提供 markRead / toggleStarred
}
```

**新增 `apps/web/src/hooks/useGroupedFeeds.ts`**（纯计算 hook）：

```ts
export function useGroupedFeeds(feeds: Feed[]) {
  // 返回 { smartViews, groups }
  // groups 按 category 字段 group by，无 category 的归入"未分类"
}
```

**新增 `apps/web/src/utils/group-articles-by-day.ts`**（纯函数）：

```ts
export function groupArticlesByDay(articles: Article[]): Group[]
```

## 键盘交互

`apps/web/src/app.tsx` 或独立 `useKeyboardShortcuts.ts` hook：

| 键 | 行为 |
|---|---|
| `j` / `↓` | 选中下一篇文章 |
| `k` / `↑` | 选中上一篇文章 |
| `s` | toggle 收藏当前文章 |
| `m` | 标记当前文章为已读 |
| `⌘.` / `Ctrl+.` | 切换 AI summary 展开/折叠 |
| `⌘K` / `Ctrl+K` | focus 搜索框（no-op 占位） |

`keyhint` 提示条固定底部居中，显示快捷键。

## 文件改动清单

### 新建

1. `apps/web/src/utils/ai-typewriter.ts` —— typewriter 动画
2. `apps/web/src/utils/group-articles-by-day.ts` —— 文章按日期分组
3. `apps/web/src/hooks/useArticleState.ts` —— localStorage 状态管理
4. `apps/web/src/hooks/useGroupedFeeds.ts` —— 订阅源分类聚合
5. `apps/web/src/hooks/useKeyboardShortcuts.ts` —— 全局快捷键
6. `apps/web/src/data/mock-ai-summaries.ts` —— 内置 AI mock
7. `apps/web/src/components/FolioSidebar.tsx` —— Sidebar 完整 UI
8. `apps/web/src/components/FolioArticleList.tsx` —— ArticleList 完整 UI
9. `apps/web/src/components/FolioReader.tsx` —— Reader 完整 UI
10. `apps/web/src/components/AiSummary.tsx` —— AI summary 卡片

### 修改

11. `apps/web/src/app.css` —— 新增 `:root` 主题 tokens（颜色、字体、列宽）
12. `apps/web/src/app.tsx` —— 用新三列布局 + 三组件
13. `apps/web/tailwind.config.ts` —— 扩展 theme（颜色、字体、列宽）
14. `packages/tailwindcss/theme.json` —— 同上（shared theme）
15. `packages/ui/src/three-column-layout.tsx` —— 新增 `FolioThreeColumnLayout`（grid 264/392/1fr）
16. `packages/ui/src/index.ts` —— export 新组件

### 不修改

- `apps/web/src/main.tsx`
- `apps/web/src/hooks/useFeeds.ts`、`useArticles.ts`（数据层不动）
- `apps/web/src/utils/format-relative-time.ts`
- API 端所有代码

## 验证

### 视觉验证

启动 `pnpm dev:api` + `pnpm dev:web`，对比 `index.html` 设计稿与实际渲染：

- 颜色：warm paper 背景、terracotta 强调色
- 字体：serif body 渲染、sans UI、mono meta
- 三列宽度：264 + 392 + 1fr
- 顶栏：Folio 品牌 + dot
- Sidebar：搜索框、智能视图、分类分组
- ArticleList：head + tabs + day-sep + item 卡
- Reader：toolbar + kicker + title + dek + byline + AI summary（折叠/展开 + typewriter）+ body + next-up

### 功能验证

- [ ] 添加订阅源 → 出现在 Sidebar 对应分类下
- [ ] 选中订阅源 → ArticleList 加载
- [ ] 点击文章 → Reader 显示，标为已读（圆点消失）
- [ ] 点击 star → 收藏状态切换（侧栏对应视图计数 +1）
- [ ] 点击 AI 总结 → typewriter 渲染 TLDR + 要点
- [ ] 复制 AI 总结 → clipboard 写入
- [ ] j/k 切换文章
- [ ] s 切换收藏
- [ ] m 标记已读
- [ ] ⌘. 切换 AI 总结
- [ ] 响应式：≤1100px list 隐藏，≤720px nav 隐藏

### typecheck

`pnpm typecheck`（如已配置）或手测无 console error。

## 风险与回滚

- **风险 1**：CSS 变量 + Tailwind theme 双轨制可能造成样式优先级混乱。**缓解**：Tailwind 颜色用 `bg-[var(--bg)]` 任意值语法，class 只用 utility，组件中关键样式用 inline `style={{ color: 'var(--fg)' }}` 兜底。
- **风险 2**：localStorage 状态在 SSR / 测试环境不可用。**缓解**：初始化时 try/catch，回退到内存 state。
- **风险 3**：AI typewriter 动画在快速点击时可能 race condition。**缓解**：加 `busy` 标志位，单实例运行。
- **回滚**：所有改动集中在 apps/web 和 packages/ui/tailwindcss；git revert 对应 commit 即可。

## 范围外（不做）

- 真实 `isRead`/`isStarred` 后端同步
- 真实 AI 总结（API 调用）
- Web Font 引入
- OPML 导入/导出 UI（spec 中也明确不做）
- 添加订阅源表单 UI 改造
- 路由改造
- 暗色模式（设计稿只有 light theme）
