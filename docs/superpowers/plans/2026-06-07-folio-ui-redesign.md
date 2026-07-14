# Folio UI 重构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `apps/web` 从当前三列骨架改造为 Folio · Reader 设计稿的完整 UI：warm paper 主题、本地 serif 字体、grid 三列布局、智能视图 Sidebar、day-sep ArticleList、AI summary Reader、键盘快捷键、客户端聚合状态。

**Architecture:** 主题层（CSS 变量 + Tailwind theme）→ 布局层（packages/ui 新增 FolioThreeColumnLayout）→ 工具/hooks 层（聚合 + 状态 + 快捷键）→ 组件层（Sidebar / ArticleList / Reader / AiSummary）→ 入口（app.tsx 整合）。每层独立提交，便于 review 和回滚。

**Tech Stack:** React 18, Tailwind CSS 3, TypeScript, 本地系统字体堆叠（OKLCH 色彩变量 + serif/sans/mono 三族），localStorage 状态持久化

---

## 文件结构

### 新建文件（10 个）

| 文件 | 职责 |
|---|---|
| `apps/web/src/utils/ai-typewriter.ts` | typewriter 动画函数（纯函数） |
| `apps/web/src/utils/group-articles-by-day.ts` | 文章按日期分组（纯函数） |
| `apps/web/src/hooks/useArticleState.ts` | localStorage 管理的 read/starred 状态 |
| `apps/web/src/hooks/useGroupedFeeds.ts` | feeds 按 category 聚合 + smart views 计数 |
| `apps/web/src/hooks/useKeyboardShortcuts.ts` | 全局键盘快捷键（j/k/s/m/⌘.） |
| `apps/web/src/data/mock-ai-summaries.ts` | 内置 AI summary mock 数据 |
| `apps/web/src/components/AiSummary.tsx` | AI summary 折叠卡片 |
| `apps/web/src/components/FolioSidebar.tsx` | Sidebar 完整 UI |
| `apps/web/src/components/FolioArticleList.tsx` | ArticleList 完整 UI |
| `apps/web/src/components/FolioReader.tsx` | Reader 完整 UI |

### 修改文件（6 个）

| 文件 | 改动 |
|---|---|
| `apps/web/src/app.css` | 新增 `:root` 主题 tokens |
| `apps/web/src/app.tsx` | 用新三列布局 + 三组件 |
| `apps/web/tailwind.config.ts` | 扩展 theme |
| `packages/tailwindcss/theme.json` | 共享 theme tokens |
| `packages/ui/src/three-column-layout.tsx` | 新增 `FolioThreeColumnLayout` |
| `packages/ui/src/index.ts` | export 新组件 |

---

## 任务 0：前置检查

- [ ] **Step 0.1：确认依赖状态**

```bash
cd /Users/nmsn/Studio/folio
ls apps/web/node_modules/.bin/vinxi 2>&1
git status
```

预期：vinxi 已装，git working tree 仅含 spec/plan 文件改动

- [ ] **Step 0.2：确认 API 与 web 都能起来（dev 链路打通）**

启动三个终端：
- `pnpm docker:dev`（postgres）
- `pnpm db:migrate`
- `cd apps/api && pnpm dev:api`
- `cd apps/web && pnpm dev:web`

打开 `http://localhost:5173/`，确认能看到 4 个默认订阅源。

预期：web 页面正常渲染（仍是当前主题），不再报错。

---

## 任务 1：主题 tokens（CSS 变量）

**Files:**
- Modify: `apps/web/src/app.css`

- [ ] **Step 1.1：编辑 app.css 添加 :root 主题 tokens**

完整替换 `apps/web/src/app.css` 为：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* ============================================================
     Folio — design tokens
     warm paper + warm terracotta accent
     ============================================================ */
  :root {
    /* surfaces */
    --bg:         oklch(98.5% 0.005 85);
    --surface:    oklch(99.6% 0.002 85);
    --surface-2:  oklch(97.2% 0.006 85);
    --fg:         oklch(22% 0.012 70);
    --fg-2:       oklch(38% 0.012 70);
    --muted:      oklch(52% 0.012 70);
    --muted-2:    oklch(65% 0.010 70);
    --border:     oklch(89% 0.008 85);
    --border-2:   oklch(82% 0.010 85);
    /* accent */
    --accent:        oklch(62% 0.16 38);
    --accent-hover:  oklch(56% 0.17 35);
    --accent-soft:   oklch(95% 0.035 40);
    --accent-ink:    oklch(99% 0.005 85);
    /* state */
    --read:       oklch(70% 0.008 70);
    --star:       oklch(72% 0.14 75);
    /* type */
    --font-display: 'Iowan Old Style', 'Charter', 'Source Serif Pro', Georgia, 'Songti SC', 'STSong', serif;
    --font-ui:      -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'Hiragino Sans GB', system-ui, sans-serif;
    --font-mono:    ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
    /* rhythm */
    --r-xs: 4px;
    --r-sm: 8px;
    --r-md: 12px;
    --col-nav: 264px;
    --col-list: 392px;
    --col-read: min(720px, 100%);
  }

  html, body {
    margin: 0; padding: 0;
    background: var(--bg);
    color: var(--fg);
    font: 14px/1.55 var(--font-ui);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  body { min-height: 100vh; }
  button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
  a { color: inherit; text-decoration: none; }
}

@layer components {
  /* ============================================================
     responsive: hide list / nav at narrow widths
     ============================================================ */
  .folio-app {
    display: grid;
    grid-template-columns: var(--col-nav) var(--col-list) 1fr;
    height: 100vh;
    max-width: 1440px;
    margin: 0 auto;
    background: var(--bg);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
  }
  @media (max-width: 1100px) {
    .folio-app { grid-template-columns: var(--col-nav) 1fr; }
    .folio-app > .col-list { display: none; }
  }
  @media (max-width: 720px) {
    .folio-app { grid-template-columns: 1fr; }
    .folio-app > .col-nav { display: none; }
  }
}
```

变更要点：
- `:root` 添加所有 OKLCH 颜色变量、字体堆叠、圆角、列宽
- `html, body` 用本地字体 + warm paper 背景
- `.folio-app` 用 grid 三列布局
- 媒体查询实现响应式

- [ ] **Step 1.2：commit**

```bash
git add apps/web/src/app.css
git commit -m "feat(web): 添加 Folio 主题 CSS 变量（OKLCH 色彩 + 字体堆叠）"
```

---

## 任务 2：Tailwind theme 扩展

**Files:**
- Modify: `packages/tailwindcss/theme.json`
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 2.1：扩展 packages/tailwindcss/theme.json**

完整替换 `packages/tailwindcss/theme.json` 为：

```json
{
  "$schema": "https://tailwindcss.com/docs/theme-configuration",
  "theme": {
    "extend": {
      "colors": {
        "paper":      "var(--bg)",
        "surface":    "var(--surface)",
        "surface-2":  "var(--surface-2)",
        "fg":         "var(--fg)",
        "fg-2":       "var(--fg-2)",
        "muted":      "var(--muted)",
        "muted-2":    "var(--muted-2)",
        "border":     "var(--border)",
        "border-2":   "var(--border-2)",
        "accent":     "var(--accent)",
        "accent-hover":  "var(--accent-hover)",
        "accent-soft":   "var(--accent-soft)",
        "accent-ink":    "var(--accent-ink)",
        "read":       "var(--read)",
        "star":       "var(--star)"
      },
      "borderRadius": {
        "xs": "var(--r-xs)",
        "sm": "var(--r-sm)",
        "md": "var(--r-md)"
      },
      "fontFamily": {
        "display": "var(--font-display)",
        "ui": "var(--font-ui)",
        "mono": "var(--font-mono)"
      },
      "width": {
        "nav":  "var(--col-nav)",
        "list": "var(--col-list)",
        "read": "var(--col-read)"
      }
    }
  }
}
```

- [ ] **Step 2.2：检查 apps/web/tailwind.config.ts 已正确继承**

`apps/web/tailwind.config.ts` 当前内容（确认是 `sharedConfig` 模式）：

```ts
import type { Config } from 'tailwindcss';
import sharedConfig from '@folio/tailwindcss/theme.json';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    ...sharedConfig,
    extend: {
      ...sharedConfig.theme?.extend,
      colors: {
        ...(sharedConfig.theme?.extend?.colors as Record<string, string> | undefined),
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**如果**当前 `tailwind.config.ts` 没有 `extend` 包装，**修改为上面版本**（保留旧的 `background` / `foreground` 兼容类）。

- [ ] **Step 2.3：commit**

```bash
git add packages/tailwindcss/theme.json apps/web/tailwind.config.ts
git commit -m "feat(tailwind): 扩展 theme 增加 Folio 颜色/字体/列宽 tokens"
```

---

## 任务 3：FolioThreeColumnLayout 组件

**Files:**
- Modify: `packages/ui/src/three-column-layout.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 3.1：在 packages/ui 新增 FolioThreeColumnLayout**

编辑 `packages/ui/src/three-column-layout.tsx`，在文件末尾（export 之前）添加：

```tsx
import { cn } from './utils';

/**
 * Folio-specific three-column layout using CSS Grid (264/392/1fr).
 * Uses .folio-app class for responsive behavior (defined in apps/web/src/app.css).
 */
const FolioThreeColumnLayout = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('folio-app', className)} {...props}>
        {children}
      </div>
    );
  }
);
FolioThreeColumnLayout.displayName = 'FolioThreeColumnLayout';
```

并在文件末尾的 export 列表中追加 `'FolioThreeColumnLayout'`。

- [ ] **Step 3.2：在 packages/ui/src/index.ts 导出**

编辑 `packages/ui/src/index.ts`，在 export 列表中追加 `FolioThreeColumnLayout`：

```ts
export {
  ThreeColumnLayout,
  Sidebar,
  ArticleList,
  Reader,
  ClassicThreeColumnLayout,
  CompactThreeColumnLayout,
  WideThreeColumnLayout,
  FolioThreeColumnLayout,
} from './three-column-layout';
```

- [ ] **Step 3.3：commit**

```bash
git add packages/ui/src/three-column-layout.tsx packages/ui/src/index.ts
git commit -m "feat(ui): 新增 FolioThreeColumnLayout（grid 264/392/1fr 三列）"
```

---

## 任务 4：group-articles-by-day 工具（纯函数）

**Files:**
- Create: `apps/web/src/utils/group-articles-by-day.ts`

- [ ] **Step 4.1：创建文件**

完整内容：

```ts
import { formatRelativeTime } from './format-relative-time';

export interface DayGroup<T> {
  label: string;
  items: T[];
}

/**
 * 将文章列表按 published_at 字段分组成 day bucket。
 * 排序：按 published_at 降序。
 * 分组 key：今天 / 昨天 / 早 X 天 / 本周更早 / 更早。
 * 适用于已经按时间倒序排列的列表。
 */
export function groupArticlesByDay<T extends { published_at: string | number | Date }>(
  articles: T[]
): DayGroup<T>[] {
  if (articles.length === 0) return [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400_000;
  const weekStart = todayStart - 7 * 86400_000;

  const groups: Record<string, T[]> = {};
  const order: string[] = [];

  for (const a of articles) {
    const date = a.published_at instanceof Date
      ? a.published_at
      : new Date(a.published_at);
    const t = date.getTime();
    if (Number.isNaN(t)) continue;

    let key: string;
    if (t >= todayStart) key = '今天';
    else if (t >= yesterdayStart) key = '昨天';
    else if (t >= weekStart) {
      const days = Math.floor((todayStart - t) / 86400_000);
      key = `${days} 天前`;
    } else if (t >= weekStart - 30 * 86400_000) {
      key = '本月更早';
    } else {
      key = '更早';
    }

    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(a);
  }

  return order.map((label) => ({ label, items: groups[label] }));
}
```

- [ ] **Step 4.2：commit**

```bash
git add apps/web/src/utils/group-articles-by-day.ts
git commit -m "feat(web): 新增 groupArticlesByDay 工具函数"
```

---

## 任务 5：useArticleState hook（localStorage）

**Files:**
- Create: `apps/web/src/hooks/useArticleState.ts`

- [ ] **Step 5.1：创建文件**

完整内容：

```ts
import { useCallback, useEffect, useState } from 'react';

const KEY = 'folio.articleState.v1';

interface ArticleState {
  read: boolean;
  starred: boolean;
}

type StateMap = Record<string, ArticleState>;

function loadFromStorage(): StateMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StateMap) : {};
  } catch {
    return {};
  }
}

function saveToStorage(state: StateMap) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // localStorage 不可用（隐私模式 / 配额满）—— 静默失败，状态仅保留在内存
  }
}

/**
 * 客户端管理 article 的 read / starred 状态，localStorage 持久化。
 * 未来如需同步后端：替换 saveToStorage 即可。
 */
export function useArticleState() {
  const [state, setState] = useState<StateMap>(loadFromStorage);

  // 跨 tab 同步
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try { setState(JSON.parse(e.newValue) as StateMap); } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isRead = useCallback((id: string) => Boolean(state[id]?.read), [state]);
  const isStarred = useCallback((id: string) => Boolean(state[id]?.starred), [state]);

  const markRead = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, [id]: { ...(prev[id] ?? { read: false, starred: false }), read: true } };
      saveToStorage(next);
      return next;
    });
  }, []);

  const toggleStarred = useCallback((id: string) => {
    setState((prev) => {
      const cur = prev[id] ?? { read: false, starred: false };
      const next = { ...prev, [id]: { ...cur, starred: !cur.starred } };
      saveToStorage(next);
      return next;
    });
  }, []);

  return { isRead, isStarred, markRead, toggleStarred };
}
```

- [ ] **Step 5.2：commit**

```bash
git add apps/web/src/hooks/useArticleState.ts
git commit -m "feat(web): 新增 useArticleState hook（localStorage 管理 read/starred）"
```

---

## 任务 6：useGroupedFeeds hook（订阅源聚合）

**Files:**
- Create: `apps/web/src/hooks/useGroupedFeeds.ts`

- [ ] **Step 6.1：创建文件**

完整内容：

```ts
import { useMemo } from 'react';

export interface Feed {
  id: string;
  name: string;
  url: string;
  category?: string | null;
}

export interface SmartView {
  id: 'all' | 'today' | 'unread' | 'starred' | 'later';
  label: string;
  count: number;
}

export interface FeedGroup {
  category: string;
  feeds: Feed[];
}

/**
 * 将 feeds 列表按 category 字段 group by，并提供 smart views 的基础计数。
 * smart views 计数仅基于 feeds 元数据（articles 计数由 caller 传入以计算 unread/starred）。
 */
export function useGroupedFeeds(
  feeds: Feed[],
  counts?: { unread: number; starred: number; later: number }
) {
  return useMemo(() => {
    const groups: FeedGroup[] = [];
    const groupMap = new Map<string, Feed[]>();
    for (const f of feeds) {
      const cat = (f.category ?? '未分类').trim() || '未分类';
      if (!groupMap.has(cat)) {
        groupMap.set(cat, []);
        groups.push({ category: cat, feeds: groupMap.get(cat)! });
      }
      groupMap.get(cat)!.push(f);
    }
    // 字母排序（中文按 locale-aware 排序）
    groups.sort((a, b) => a.category.localeCompare(b.category, 'zh'));

    const smartViews: SmartView[] = [
      { id: 'all',     label: '全部文章', count: feeds.length },
      { id: 'today',   label: '今天',     count: 0 },
      { id: 'unread',  label: '未读',     count: counts?.unread ?? 0 },
      { id: 'starred', label: '已收藏',   count: counts?.starred ?? 0 },
      { id: 'later',   label: '稍后读',   count: counts?.later ?? 0 },
    ];

    return { smartViews, groups };
  }, [feeds, counts?.unread, counts?.starred, counts?.later]);
}
```

- [ ] **Step 6.2：commit**

```bash
git add apps/web/src/hooks/useGroupedFeeds.ts
git commit -m "feat(web): 新增 useGroupedFeeds hook（按 category 聚合 + smart views）"
```

---

## 任务 7：useKeyboardShortcuts hook

**Files:**
- Create: `apps/web/src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 7.1：创建文件**

完整内容：

```ts
import { useEffect } from 'react';

export interface ShortcutHandlers {
  onNext?: () => void;
  onPrev?: () => void;
  onToggleStar?: () => void;
  onMarkRead?: () => void;
  onToggleAI?: () => void;
}

/**
 * 全局键盘快捷键：j/k 上下篇、s 收藏、m 已读、⌘. AI 切换。
 * 在 input/textarea/contenteditable 焦点时不触发。
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        handlers.onNext?.();
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlers.onPrev?.();
      } else if (e.key === 's') {
        e.preventDefault();
        handlers.onToggleStar?.();
      } else if (e.key === 'm') {
        e.preventDefault();
        handlers.onMarkRead?.();
      } else if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        handlers.onToggleAI?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
```

- [ ] **Step 7.2：commit**

```bash
git add apps/web/src/hooks/useKeyboardShortcuts.ts
git commit -m "feat(web): 新增 useKeyboardShortcuts hook（j/k/s/m/⌘.）"
```

---

## 任务 8：ai-typewriter 工具

**Files:**
- Create: `apps/web/src/utils/ai-typewriter.ts`

- [ ] **Step 8.1：创建文件**

完整内容：

```ts
/**
 * 字符逐个 typewriter 动画。中英文标点自动延长停顿。
 */
export function aiTypeText(el: HTMLElement | null, text: string, speed = 26): Promise<void> {
  return new Promise((resolve) => {
    if (!el) { resolve(); return; }
    el.textContent = '';
    const cur = document.createElement('span');
    cur.className = 'ai-cursor';
    el.appendChild(cur);
    let i = 0;
    const tick = () => {
      if (i >= text.length) {
        if (cur.parentNode) cur.parentNode.removeChild(cur);
        resolve();
        return;
      }
      const ch = text.charAt(i);
      cur.before(document.createTextNode(ch));
      i++;
      let d = speed;
      if ('。.!?！？\n'.indexOf(ch) >= 0) d = speed * 7;
      else if ('，,;；、'.indexOf(ch) >= 0) d = speed * 4;
      setTimeout(tick, d);
    };
    tick();
  });
}

/**
 * 列表逐项 typewriter。每个 li 元素独立 animate。
 */
export function aiTypeList(ul: HTMLElement | null, items: string[], speed = 14): Promise<void> {
  if (!ul) return Promise.resolve();
  return items.reduce<Promise<void>>(
    (p, text, idx) => p.then(() => {
      const li = ul.children[idx] as HTMLElement | undefined;
      if (!li) return;
      return aiTypeText(li, `${idx + 1}. ${text}`, speed);
    }),
    Promise.resolve()
  );
}
```

- [ ] **Step 8.2：commit**

```bash
git add apps/web/src/utils/ai-typewriter.ts
git commit -m "feat(web): 新增 aiTypeText/aiTypeList typewriter 动画工具"
```

---

## 任务 9：mock-ai-summaries 数据

**Files:**
- Create: `apps/web/src/data/mock-ai-summaries.ts`

- [ ] **Step 9.1：创建文件**

完整内容：

```ts
export interface AiSummary {
  tldr: string;
  points: string[];
  saved: number;
  source: string;
}

const DEFAULTS: Record<string, AiSummary> = {
  hacker_news: {
    tldr: 'RSS 并没有失败 —— 它只是换了一种语言。',
    points: [
      'Google Reader 在 2013 年关闭后，RSS 失去了中心化入口，但协议本身仍在驱动所有"按订阅送达"的产品：播客、Substack、YouTube 频道。',
      '新一代阅读器靠"把读这件事做得更安静"胜出，而不是协议本身的胜利。',
      '把"我读过什么"重新变成只属于读者的个人索引，把选择权从算法手里拿回来。'
    ],
    saved: 6,
    source: 'Folio 摘要',
  },
  the_verge: {
    tldr: '算法信息流的尽头，可能是读者主动"反向回退"到 RSS 的减噪体验。',
    points: [
      '当 TikTok 的"看完一个再推一个"也开始被吐槽时，越来越多用户开始把 RSS 当作减噪工具。',
      '消费科技新闻的注意力正在从社交分发回流到订阅分发。',
      '"你订阅什么我看什么"再次成为一种用户主张。'
    ],
    saved: 4,
    source: 'Folio 摘要',
  },
  ars_technica: {
    tldr: '深度技术报道仍然在订阅源里有稳定位置 —— 算法不容易替代。',
    points: [
      '评测与调查类内容对算法推荐的依赖度低，更适合 RSS 长读场景。',
      '技术读者更愿意为"专业策展"付费 / 订阅。',
      'RSS 适合深度，时效性内容更适合推送。'
    ],
    saved: 5,
    source: 'Folio 摘要',
  },
  techcrunch: {
    tldr: '初创公司与产品发布的报道流：RSS 仍然是 PM 与投资人的事实基线。',
    points: [
      '科技商业新闻的密度高、来源分散，订阅源能整合多源。',
      '行业快讯适合用过滤器（关键词、来源）二次筛选。',
      'RSS + 标签 / 智能视图是构建私人信息流的最低成本方式。'
    ],
    saved: 5,
    source: 'Folio 摘要',
  },
};

function fallback(title: string, excerpt: string): AiSummary {
  return {
    tldr: `本篇围绕"${title || '一个核心主张'}"展开 —— ${(excerpt || '文章提出了一个值得反复推敲的判断。').slice(0, 60)}…`,
    points: [
      '观点一：' + (excerpt || '文章提出了一个值得反复推敲的判断。'),
      '观点二：从历史或行业视角看，这个判断有更深的来源。',
      '观点三：对读者来说，可以带走的一个具体动作或提醒。',
    ],
    saved: 4,
    source: 'Folio 摘要',
  };
}

/**
 * 根据文章 url 或 title 关键字返回 mock 摘要。
 * 找不到则用 title + excerpt 派生默认版本。
 */
export function getMockAiSummary(article: {
  id: string;
  title: string;
  url?: string;
  description?: string | null;
}): AiSummary {
  const text = (article.url ?? '') + ' ' + article.title + ' ' + (article.description ?? '');
  for (const [key, summary] of Object.entries(DEFAULTS)) {
    if (text.toLowerCase().includes(key.replace('_', ' '))) return summary;
  }
  return fallback(article.title, article.description ?? '');
}
```

- [ ] **Step 9.2：commit**

```bash
git add apps/web/src/data/mock-ai-summaries.ts
git commit -m "feat(web): 新增 mock AI summaries 数据"
```

---

## 任务 10：AiSummary 组件

**Files:**
- Create: `apps/web/src/components/AiSummary.tsx`

- [ ] **Step 10.1：创建文件**

完整内容：

```tsx
import { useState } from 'react';
import { aiTypeText, aiTypeList } from '../utils/ai-typewriter';
import { getMockAiSummary } from '../data/mock-ai-summaries';

interface AiSummaryProps {
  article: {
    id: string;
    title: string;
    url?: string;
    description?: string | null;
  };
  open: boolean;
  onToggle: () => void;
}

export function AiSummary({ article, open, onToggle }: AiSummaryProps) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [tldr, setTldr] = useState('');
  const [points, setPoints] = useState<string[]>([]);
  const [meta, setMeta] = useState('—');

  async function render() {
    if (busy) return;
    setBusy(true);
    setDone(false);
    setTldr('');
    setPoints([]);
    setMeta('—');
    const s = getMockAiSummary(article);
    setMeta(`${s.source} · 节省 ~${s.saved} 分钟`);
    // 等 350ms 让折叠展开动画播完
    await new Promise((r) => setTimeout(r, 350));
    setDone(true);
    await aiTypeText(tldrRef.current, s.tldr, 26);
    await aiTypeList(pointsRef.current, s.points, 14);
    setBusy(false);
  }

  // 折叠切换时：开 → render；关 → 不做事
  // 用 ref 拿 DOM 元素
  const tldrRef = useState(() => ({ current: null as HTMLElement | null }))[0];
  const pointsRef = useState(() => ({ current: null as HTMLElement | null }))[0];

  if (open && !busy && !done && points.length === 0) {
    // 首次打开
    setTimeout(render, 0);
  }

  return (
    <aside className={`ai-summary ${open ? 'is-open' : ''} ${busy ? 'is-loading' : ''} ${done ? 'is-done' : ''}`} aria-expanded={open}>
      <button className="ai-head" type="button" onClick={onToggle} aria-controls={open ? 'aiBody' : undefined}>
        <span className="ai-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          AI 总结
        </span>
        <span className="ai-status">
          {busy ? '正在总结…' : done ? '由 Folio 摘要生成' : open ? '加载中…' : '点击展开 · 节省 ~6 分钟'}
        </span>
        <span className="ai-chev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div className="ai-body" id="aiBody">
        <div className="ai-body-inner">
          <p className="ai-tldr" ref={(el) => (tldrRef.current = el)}>{tldr}</p>
          <ul className="ai-points" ref={(el) => (pointsRef.current = el)}>
            {points.map((_, i) => <li key={i} />)}
          </ul>
          <div className="ai-foot">
            <span className="ai-meta">{meta}</span>
            <div style={{ flex: 1 }} />
            <button
              className="ai-act"
              type="button"
              onClick={() => {
                const text = [tldr.trim(), ...points].filter(Boolean).join('\n');
                const doneCb = () => { /* 反馈省略 */ };
                if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(doneCb, doneCb);
                else doneCb();
              }}
            >
              复制
            </button>
            <button className="ai-act" type="button" onClick={render}>重新生成</button>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

**重要**：上方代码片段中 `useState(() => ({ current: null }))` 是简化写法。**实际实施时**改用 `useRef`：

```ts
const tldrRef = useRef<HTMLElement | null>(null);
const pointsRef = useRef<HTMLElement | null>(null);
```

且 `tldr` / `points` 用受控 state 即可（不再用 `tldrRef.current` 控制文本，由 state 渲染）。

- [ ] **Step 10.2：commit**

```bash
git add apps/web/src/components/AiSummary.tsx
git commit -m "feat(web): 新增 AiSummary 组件（折叠卡片 + typewriter + 复制/重新生成）"
```

---

## 任务 11：FolioSidebar 组件

**Files:**
- Create: `apps/web/src/components/FolioSidebar.tsx`

- [ ] **Step 11.1：创建文件**

完整内容（设计稿 `.col-nav`）：

```tsx
import { useState } from 'react';
import type { Feed, SmartView, FeedGroup } from '../hooks/useGroupedFeeds';

interface FolioSidebarProps {
  feeds: Feed[];
  grouped: { smartViews: SmartView[]; groups: FeedGroup[] };
  selectedSmartView: string;
  selectedFeedId: string | null;
  onSelectSmartView: (id: string) => void;
  onSelectFeed: (id: string | null) => void;
  onAddFeed: () => void;
}

const ICONS = {
  all: <path d="M3 6h18M3 12h18M3 18h12" />,
  today: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  unread: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" /></>,
  starred: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  later: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
} as const;

function NavItem({
  active, hasUnread, label, count, onClick, icon,
}: {
  active?: boolean;
  hasUnread?: boolean;
  label: string;
  count?: number;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      className={`nav-item ${active ? 'active' : ''} ${hasUnread && count ? 'has-unread' : ''}`}
      onClick={onClick}
    >
      {icon && (
        <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
      )}
      <span className="label">{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </button>
  );
}

export function FolioSidebar({
  feeds, grouped, selectedSmartView, selectedFeedId, onSelectSmartView, onSelectFeed, onAddFeed,
}: FolioSidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  return (
    <aside className="col col-nav">
      {/* Topbar */}
      <div className="topbar">
        <div className="brand">Folio<span className="dot" /></div>
        <div className="spacer" />
        <div className="actions">
          <button className="icon-btn" title="同步">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12a9 9 0 0 1-15.5 6.36L3 16" /><path d="M3 12a9 9 0 0 1 15.5-6.36L21 8" />
              <path d="M21 3v5h-5M3 21v-5h5" />
            </svg>
          </button>
          <button className="icon-btn" title="设置">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 4.27 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 7.04 4.27l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="nav-search">
        <label className="field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input type="text" placeholder="搜索订阅源或文章" />
          <span className="kbd">⌘K</span>
        </label>
      </div>

      {/* Nav scroll */}
      <nav className="nav-scroll">
        {/* Smart views */}
        <div className="nav-section">
          {grouped.smartViews.map((sv) => (
            <NavItem
              key={sv.id}
              active={selectedSmartView === sv.id}
              hasUnread={sv.count > 0}
              label={sv.label}
              count={sv.count}
              icon={ICONS[sv.id]}
              onClick={() => onSelectSmartView(sv.id)}
            />
          ))}
        </div>

        {/* Feed groups */}
        {grouped.groups.map((g) => {
          const isCollapsed = collapsed.has(g.category);
          return (
            <div key={g.category} className={`nav-section nav-group ${isCollapsed ? 'collapsed' : ''}`}>
              <h6>
                <button
                  className="nav-group-toggle"
                  onClick={() => setCollapsed((s) => {
                    const n = new Set(s);
                    n.has(g.category) ? n.delete(g.category) : n.add(g.category);
                    return n;
                  })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {g.category}
                  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <span style={{ fontWeight: 400 }}>{g.feeds.length}</span>
              </h6>
              <div className="nav-children">
                {g.feeds.map((f) => (
                  <NavItem
                    key={f.id}
                    active={selectedFeedId === f.id}
                    label={f.name}
                    onClick={() => { onSelectSmartView('all'); onSelectFeed(f.id); }}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="nav-footer">
          <button className="nav-item" style={{ color: 'var(--muted)' }} onClick={onAddFeed}>
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="label">添加订阅源</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
```

- [ ] **Step 11.2：commit**

```bash
git add apps/web/src/components/FolioSidebar.tsx
git commit -m "feat(web): 新增 FolioSidebar 组件（顶栏+搜索+smart views+分类分组+footer）"
```

---

## 任务 12：FolioArticleList 组件

**Files:**
- Create: `apps/web/src/components/FolioArticleList.tsx`

- [ ] **Step 12.1：创建文件**

完整内容：

```tsx
import { useMemo } from 'react';
import { formatRelativeTime } from '../utils/format-relative-time';
import { groupArticlesByDay, type DayGroup } from '../utils/group-articles-by-day';

export interface ArticleItem {
  id: string;
  source_id?: string;
  title: string;
  author?: string | null;
  published_at: string | number | Date;
  description?: string | null;
}

interface FolioArticleListProps {
  articles: ArticleItem[];
  loading: boolean;
  error: boolean;
  selectedFeedId: string | null;
  selectedArticleId: string | null;
  filter: 'all' | 'unread' | 'starred';
  isRead: (id: string) => boolean;
  isStarred: (id: string) => boolean;
  onFilter: (f: 'all' | 'unread' | 'starred') => void;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function FolioArticleList({
  articles, loading, error, selectedFeedId, selectedArticleId, filter,
  isRead, isStarred, onFilter, onSelect, onToggleStar, onRefresh, refreshing,
}: FolioArticleListProps) {
  const filtered = useMemo(() => articles.filter((a) => {
    if (filter === 'unread' && isRead(a.id)) return false;
    if (filter === 'starred' && !isStarred(a.id)) return false;
    return true;
  }), [articles, filter, isRead, isStarred]);

  const groups: DayGroup<ArticleItem>[] = useMemo(() => groupArticlesByDay(filtered), [filtered]);

  return (
    <section className="col col-list">
      <div className="list-head">
        <h2>全部文章</h2>
        <div className="sub">{filtered.length} 篇 · 来自 {new Set(filtered.map((a) => a.source_id).filter(Boolean)).size} 个源</div>
      </div>
      <div className="list-tabs">
        {(['all', 'unread', 'starred'] as const).map((f) => (
          <button
            key={f}
            className={`list-tab ${filter === f ? 'active' : ''}`}
            onClick={() => onFilter(f)}
          >
            {f === 'all' ? '全部' : f === 'unread' ? '未读' : '已收藏'}
            <span className="num">{f === 'all' ? filtered.length : f === 'unread' ? filtered.filter((a) => !isRead(a.id)).length : filtered.filter((a) => isStarred(a.id)).length}</span>
          </button>
        ))}
      </div>
      <div className="list-scroll">
        {!selectedFeedId ? (
          <p className="p-4 text-sm text-[var(--muted)]">请选择订阅源</p>
        ) : loading ? (
          <p className="p-4 text-sm text-[var(--muted)]">加载中…</p>
        ) : error ? (
          <p className="p-4 text-sm text-red-500">加载文章失败</p>
        ) : filtered.length === 0 ? (
          <div className="p-4 space-y-3">
            <p className="text-sm text-[var(--muted)]">暂无文章</p>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3 py-1.5 text-xs bg-[var(--accent)] text-[var(--accent-ink)] rounded-md disabled:opacity-50"
            >
              {refreshing ? '刷新中…' : '刷新订阅源'}
            </button>
          </div>
        ) : (
          <>
            {groups.map((g) => (
              <div key={g.label}>
                <div className="day-sep">{g.label}</div>
                {g.items.map((a) => {
                  const read = isRead(a.id);
                  const starred = isStarred(a.id);
                  return (
                    <article
                      key={a.id}
                      className={`item ${selectedArticleId === a.id ? 'is-active' : ''} ${read ? 'is-read' : 'is-unread'}`}
                      data-state={read ? 'read' : 'unread'}
                      onClick={() => onSelect(a.id)}
                    >
                      <span className="unread" />
                      <div className="item-body">
                        <div className="item-meta">
                          <span className="src">{feedNameFor(a.source_id)}</span>
                          {a.author && <><span className="dot" /><span>{a.author}</span></>}
                        </div>
                        <h3 className="item-title">{a.title}</h3>
                        {a.description && <p className="item-excerpt">{a.description}</p>}
                      </div>
                      <div className="item-aside">
                        <span className="item-time">{formatRelativeTime(a.published_at)}</span>
                        <button
                          className={`item-star ${starred ? 'is-on' : ''}`}
                          title={starred ? '已收藏' : '收藏'}
                          onClick={(e) => { e.stopPropagation(); onToggleStar(a.id); }}
                        >
                          <svg viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

// 内部辅助：从 caller 注入（避免 ArticleList 直接依赖 feeds）
function feedNameFor(_sourceId?: string): string {
  return 'RSS';  // 实际项目中由 caller 通过 props 注入 feedNameMap
}
```

> **实施注意**：上方 `feedNameFor` 是占位符。**实际实施时**应改成 `props.feedNameMap: Record<string, string>` 由 caller 注入，组件用 `feedNameMap[a.source_id ?? ''] ?? 'Unknown'`。

- [ ] **Step 12.2：commit**

```bash
git add apps/web/src/components/FolioArticleList.tsx
git commit -m "feat(web): 新增 FolioArticleList 组件（head+tabs+day-sep+item）"
```

---

## 任务 13：FolioReader 组件

**Files:**
- Create: `apps/web/src/components/FolioReader.tsx`

- [ ] **Step 13.1：创建文件**

完整内容：

```tsx
import { useState } from 'react';
import { formatRelativeTime } from '../utils/format-relative-time';
import { AiSummary } from './AiSummary';
import type { ArticleItem } from './FolioArticleList';

interface FolioReaderProps {
  article: ArticleItem | null | undefined;
  loading: boolean;
  error: boolean;
  feedName: string | null | undefined;
  isRead: boolean;
  isStarred: boolean;
  onToggleStar: () => void;
  onMarkRead: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  nextTitle?: string;
  nextFeedName?: string;
}

export function FolioReader({
  article, loading, error, feedName,
  isRead, isStarred, onToggleStar, onMarkRead,
  onPrev, onNext, hasPrev, hasNext, nextTitle, nextFeedName,
}: FolioReaderProps) {
  const [aiOpen, setAiOpen] = useState(false);

  if (!article) {
    return (
      <section className="col col-content">
        <p className="p-6 text-sm text-[var(--muted)]">请选择文章</p>
      </section>
    );
  }
  if (loading) {
    return (
      <section className="col col-content">
        <p className="p-6 text-sm text-[var(--muted)]">加载中…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="col col-content">
        <p className="p-6 text-sm text-red-500">加载文章失败</p>
      </section>
    );
  }

  const html = (article.description as string | null | undefined) ?? '';
  const date = new Date(article.published_at as string | number | Date);
  const dateStr = `${date.getFullYear()} / ${String(date.getMonth() + 1).padStart(2, '0')} / ${String(date.getDate()).padStart(2, '0')}`;

  return (
    <section className="col col-content">
      {/* Toolbar */}
      <div className="article-toolbar">
        <button className="tool-btn" title="上一篇" disabled={!hasPrev} onClick={onPrev}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className="tool-btn" title="下一篇" disabled={!hasNext} onClick={onNext}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 6px' }} />
        <button className={`tool-btn ${isStarred ? 'is-on' : ''}`} onClick={onToggleStar} title={isStarred ? '已收藏' : '收藏'}>
          <svg viewBox="0 0 24 24" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {isStarred ? '已收藏' : '收藏'}
        </button>
        <button className={`tool-btn ${isRead ? 'is-on' : ''}`} onClick={onMarkRead} title="标记已读">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isRead ? '已读' : '标记已读'}
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 6px' }} />
        <button className={`tool-btn is-ai ${aiOpen ? 'is-on' : ''}`} onClick={() => setAiOpen((v) => !v)} title="AI 总结 (⌘ + .)">
          <svg className="ai-spark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          AI 总结
          <span className="kbd">⌘.</span>
        </button>
        <div style={{ flex: 1 }} />
        <button className="tool-btn" title="稍后读" onClick={() => { /* no-op */ }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          稍后读
        </button>
        <button className="tool-btn" title="分享" onClick={() => navigator.clipboard?.writeText((article as { url?: string }).url ?? '')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          分享
        </button>
        <button className="tool-btn" title="更多">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      {/* Article scroll */}
      <div className="article-scroll">
        <article className="article">
          <div className="article-kicker">
            <span className="src">{feedName ?? ''}</span>
            <span className="sep">·</span>
            <span>文章</span>
            <span className="sep">·</span>
            <span>{dateStr}</span>
          </div>
          <h1 className="title">{article.title}</h1>

          <div className="byline">
            <div className="avatar">{initials(article.author)}</div>
            <span className="author">{article.author ?? 'Unknown'}</span>
            <span>·</span>
            <span>{formatRelativeTime(article.published_at)}</span>
          </div>

          <AiSummary article={article} open={aiOpen} onToggle={() => setAiOpen((v) => !v)} />

          <div className="body" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="article-foot">
            <div className="progress">
              <span>阅读进度</span>
              <span className="bar"><i style={{ width: '28%' }} /></span>
              <span style={{ color: 'var(--fg-2)' }}>28%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span>全文约 {Math.max(100, html.length)} 字</span>
              <span style={{ color: 'var(--border-2)' }}>·</span>
              <span>来自 {feedName ?? 'RSS'}</span>
            </div>
          </div>

          {nextTitle && (
            <div className="next-up">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="label">下一篇 · 来自 {nextFeedName ?? 'RSS'}</div>
                <div className="next-title">{nextTitle}</div>
              </div>
              <button className="arrow" onClick={onNext} title="下一篇">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function initials(author?: string | null): string {
  if (!author) return '?';
  const parts = author.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return author.slice(0, 2).toUpperCase();
}
```

- [ ] **Step 13.2：commit**

```bash
git add apps/web/src/components/FolioReader.tsx
git commit -m "feat(web): 新增 FolioReader 组件（toolbar+kicker+title+byline+AI+body+next-up）"
```

---

## 任务 14：app.tsx 集成三列

**Files:**
- Modify: `apps/web/src/app.tsx`

- [ ] **Step 14.1：替换 app.tsx 为 Folio 三列布局**

完整替换 `apps/web/src/app.tsx`（保留 mock user / 保留 import / 新增组件 / 新三列布局）：

```tsx
import React, { useMemo, useState } from 'react';
import { FolioThreeColumnLayout } from '@folio/ui';
import { useFeeds, useCreateFeed, useRefreshFeed } from './hooks/useFeeds';
import { useArticles, useArticle } from './hooks/useArticles';
import { formatRelativeTime } from './utils/format-relative-time';
import { useArticleState } from './hooks/useArticleState';
import { useGroupedFeeds, type Feed } from './hooks/useGroupedFeeds';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { FolioSidebar } from './components/FolioSidebar';
import { FolioArticleList, type ArticleItem } from './components/FolioArticleList';
import { FolioReader } from './components/FolioReader';

const MOCK_USER = { id: '1', email: 'test@test.com', name: 'Test User' };

function App() {
  const user = MOCK_USER;

  // data
  const { data: feedsRaw = [], isLoading: feedsLoading, isError: feedsError, refetch: refetchFeeds } = useFeeds();
  const feeds: Feed[] = feedsRaw as Feed[];
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedSmartView, setSelectedSmartView] = useState('all');
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [showAddFeed, setShowAddFeed] = useState(false);

  const { data: articles = [], isLoading: articlesLoading, isError: articlesError, refetch: refetchArticles } =
    useArticles(selectedFeedId ?? undefined);
  const articleList = articles as ArticleItem[];

  const { data: selectedArticleRaw, isLoading: articleLoading, isError: articleError } =
    useArticle(selectedArticleId ?? '');
  const selectedArticle = selectedArticleRaw as ArticleItem | null | undefined;

  // refresh
  const refreshFeed = useRefreshFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const handleRefreshFeed = async () => {
    if (!selectedFeedId) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refreshFeed.mutateAsync(selectedFeedId);
      refetchArticles();
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  // state (read/starred, localStorage)
  const { isRead, isStarred, markRead, toggleStarred } = useArticleState();

  // derived
  const unreadCount = useMemo(() => articleList.filter((a) => !isRead(a.id)).length, [articleList, isRead]);
  const starredCount = useMemo(() => articleList.filter((a) => isStarred(a.id)).length, [articleList, isStarred]);
  const grouped = useGroupedFeeds(feeds, { unread: unreadCount, starred: starredCount, later: 0 });

  const feedNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of feeds) m[f.id] = f.name;
    return m;
  }, [feeds]);
  const currentFeedName = selectedFeedId ? feedNameMap[selectedFeedId] : undefined;

  const sortedArticles = useMemo(() => [...articleList].sort((a, b) => {
    const ta = new Date(a.published_at as string | number | Date).getTime();
    const tb = new Date(b.published_at as string | number | Date).getTime();
    return tb - ta;
  }), [articleList]);

  // selection handlers
  const onSelectArticle = (id: string) => {
    setSelectedArticleId(id);
    if (!isRead(id)) markRead(id);
  };
  const onToggleStar = (id: string) => toggleStarred(id);
  const sortedIdx = useMemo(() => sortedArticles.findIndex((a) => a.id === selectedArticleId), [sortedArticles, selectedArticleId]);
  const onPrev = () => { if (sortedIdx > 0) onSelectArticle(sortedArticles[sortedIdx - 1].id); };
  const onNext = () => { if (sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1) onSelectArticle(sortedArticles[sortedIdx + 1].id); };

  // keyboard
  useKeyboardShortcuts({
    onNext, onPrev,
    onToggleStar: () => selectedArticleId && onToggleStar(selectedArticleId),
    onMarkRead: () => selectedArticleId && !isRead(selectedArticleId) && markRead(selectedArticleId),
    onToggleAI: () => {
      // 通过自定义事件让 Reader 切换 AI 状态 —— 简化：派发键盘事件给当前 toolbar
      const aiBtn = document.querySelector('.tool-btn.is-ai') as HTMLButtonElement | null;
      aiBtn?.click();
    },
  });

  return (
    <FolioThreeColumnLayout>
      <FolioSidebar
        feeds={feeds}
        grouped={grouped}
        selectedSmartView={selectedSmartView}
        selectedFeedId={selectedFeedId}
        onSelectSmartView={setSelectedSmartView}
        onSelectFeed={(id) => { setSelectedFeedId(id); setSelectedArticleId(null); }}
        onAddFeed={() => setShowAddFeed(true)}
      />
      <FolioArticleList
        articles={sortedArticles}
        loading={articlesLoading}
        error={articlesError}
        selectedFeedId={selectedFeedId}
        selectedArticleId={selectedArticleId}
        filter={filter}
        isRead={isRead}
        isStarred={isStarred}
        onFilter={setFilter}
        onSelect={onSelectArticle}
        onToggleStar={onToggleStar}
        onRefresh={handleRefreshFeed}
        refreshing={refreshing}
      />
      <FolioReader
        article={selectedArticle}
        loading={articleLoading}
        error={articleError}
        feedName={currentFeedName}
        isRead={selectedArticle ? isRead(selectedArticle.id) : false}
        isStarred={selectedArticle ? isStarred(selectedArticle.id) : false}
        onToggleStar={() => selectedArticle && onToggleStar(selectedArticle.id)}
        onMarkRead={() => selectedArticle && !isRead(selectedArticle.id) && markRead(selectedArticle.id)}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={sortedIdx > 0}
        hasNext={sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1}
        nextTitle={sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1 ? sortedArticles[sortedIdx + 1]?.title : undefined}
        nextFeedName={sortedIdx >= 0 && sortedIdx < sortedArticles.length - 1 ? feedNameMap[(sortedArticles[sortedIdx + 1] as ArticleItem)?.source_id ?? ''] : undefined}
      />
    </FolioThreeColumnLayout>
  );
}

export default App;
```

- [ ] **Step 14.2：添加 keyhint 提示条到 app.tsx**

在 `</FolioThreeColumnLayout>` 后追加：

```tsx
// ... 现有 return 后面：
    <div className="keyhint" aria-hidden="true">
      <span className="group"><kbd>j</kbd><kbd>k</kbd> 上下篇</span>
      <span className="group"><kbd>s</kbd> 收藏</span>
      <span className="group"><kbd>m</kbd> 标记已读</span>
      <span className="group"><kbd>⌘</kbd><kbd>.</kbd> AI 总结</span>
      <span className="group"><kbd>⌘</kbd><kbd>K</kbd> 搜索</span>
    </div>
```

并在 `<header>` 之前添加用户信息（如果需要保留）。**简化方案**：移除旧 header，整个 return 只剩 FolioThreeColumnLayout + keyhint。

- [ ] **Step 14.3：commit**

```bash
git add apps/web/src/app.tsx
git commit -m "refactor(web): 整合 Folio 三列布局与各组件"
```

---

## 任务 15：扩展 app.css 添加设计稿的所有 UI 类

**Files:**
- Modify: `apps/web/src/app.css`

- [ ] **Step 15.1：把设计稿的所有 CSS 类添加到 app.css**

在 `@layer components` 中追加（Task 1 之后）：

```css
@layer components {
  /* topbar */
  .topbar { display: flex; align-items: center; height: 48px; flex: 0 0 48px; padding: 0 16px 0 20px; border-bottom: 1px solid var(--border); background: var(--bg); }
  .topbar .brand { font-family: var(--font-display); font-size: 18px; font-weight: 600; letter-spacing: -0.01em; color: var(--fg); }
  .topbar .brand .dot { display: inline-block; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; margin-left: 2px; margin-right: 6px; transform: translateY(-3px); }
  .topbar .spacer { flex: 1; }
  .topbar .actions { display: flex; align-items: center; gap: 4px; }
  .icon-btn { width: 32px; height: 32px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--muted); transition: background .12s, color .12s; }
  .icon-btn:hover { background: var(--surface-2); color: var(--fg); }
  .icon-btn svg { width: 18px; height: 18px; stroke-width: 1.6; }

  /* nav */
  .col { height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
  .col + .col { border-left: 1px solid var(--border); }
  .nav-search { padding: 12px 14px 8px; border-bottom: 1px solid var(--border); }
  .nav-search .field { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 10px; background: var(--surface-2); border: 1px solid transparent; border-radius: var(--r-sm); color: var(--muted); }
  .nav-search .field:focus-within { background: var(--surface); border-color: var(--border-2); color: var(--fg); }
  .nav-search .field svg { width: 14px; height: 14px; flex: 0 0 14px; }
  .nav-search input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; font: 13px/1 var(--font-ui); color: var(--fg); }
  .nav-search input::placeholder { color: var(--muted-2); }
  .nav-search .kbd { font: 10px/1 var(--font-mono); color: var(--muted-2); padding: 3px 5px; border: 1px solid var(--border-2); border-radius: 3px; background: var(--bg); }
  .nav-scroll { flex: 1; overflow-y: auto; padding: 8px 0 12px; }
  .nav-scroll::-webkit-scrollbar { width: 8px; }
  .nav-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
  .nav-scroll:hover::-webkit-scrollbar-thumb { background: var(--border-2); }
  .nav-section { padding: 10px 0 4px; }
  .nav-section h6 { display: flex; align-items: center; justify-content: space-between; margin: 0 14px 4px; padding: 0 4px; font: 10px/1 var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted-2); }
  .nav-section h6 .chev { width: 12px; height: 12px; transition: transform .15s; }
  .nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 14px; color: var(--fg-2); font-size: 13px; position: relative; transition: background .1s, color .1s; }
  .nav-item:hover { background: var(--surface-2); color: var(--fg); }
  .nav-item .icon { width: 16px; height: 16px; flex: 0 0 16px; color: var(--muted); }
  .nav-item .label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-item .count { font: 11px/1 var(--font-mono); color: var(--muted); padding: 2px 6px; border-radius: 999px; min-width: 18px; text-align: center; }
  .nav-item.has-unread .count { background: var(--accent-soft); color: var(--accent-hover); font-weight: 600; }
  .nav-item.active { background: var(--accent-soft); color: var(--accent-hover); font-weight: 600; }
  .nav-item.active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 2px; background: var(--accent); border-radius: 1px; }
  .nav-item.active .icon { color: var(--accent); }
  .nav-group.collapsed .nav-children { display: none; }
  .nav-footer { border-top: 1px solid var(--border); padding: 10px 8px 12px; }

  /* list */
  .list-head { flex: 0 0 auto; padding: 14px 20px 8px; }
  .list-head h2 { margin: 0; font: 600 18px/1.2 var(--font-ui); letter-spacing: -0.01em; }
  .list-head .sub { margin-top: 2px; font: 12px/1 var(--font-mono); color: var(--muted); letter-spacing: 0.02em; }
  .list-tabs { display: flex; gap: 2px; padding: 8px 12px 0; border-bottom: 1px solid var(--border); }
  .list-tab { padding: 8px 10px; font: 12px/1 var(--font-ui); color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .12s, border-color .12s; }
  .list-tab:hover { color: var(--fg); }
  .list-tab.active { color: var(--fg); font-weight: 600; border-bottom-color: var(--accent); }
  .list-tab .num { font: 10px/1 var(--font-mono); color: var(--muted-2); margin-left: 4px; }
  .list-tab.active .num { color: var(--muted); }
  .list-scroll { flex: 1; overflow-y: auto; }
  .list-scroll::-webkit-scrollbar { width: 8px; }
  .list-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
  .list-scroll:hover::-webkit-scrollbar-thumb { background: var(--border-2); }
  .day-sep { display: flex; align-items: center; gap: 8px; padding: 14px 20px 6px; font: 10px/1 var(--font-mono); color: var(--muted-2); letter-spacing: 0.14em; text-transform: uppercase; }
  .day-sep::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .item { display: grid; grid-template-columns: 14px 1fr auto; gap: 10px; padding: 12px 20px 14px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background .1s; position: relative; }
  .item:hover { background: var(--surface-2); }
  .item.is-active { background: var(--surface); }
  .item.is-active::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--accent); }
  .unread { width: 6px; height: 6px; margin-top: 7px; border-radius: 50%; background: transparent; flex: 0 0 6px; }
  .item.is-unread .unread { background: var(--accent); }
  .item.is-active.is-unread .unread { background: var(--accent); }
  .item.is-read .unread { background: var(--border-2); }
  .item-body { min-width: 0; }
  .item-meta { display: flex; align-items: center; gap: 8px; font: 11px/1 var(--font-mono); color: var(--muted); margin-bottom: 5px; letter-spacing: 0.02em; }
  .item-meta .src { color: var(--fg-2); font-weight: 500; letter-spacing: 0.01em; font-family: var(--font-ui); }
  .item-meta .dot { width: 2px; height: 2px; background: var(--muted-2); border-radius: 50%; }
  .item-title { font: 600 14px/1.35 var(--font-ui); color: var(--fg); letter-spacing: -0.005em; margin: 0 0 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .item.is-read .item-title { color: var(--muted); font-weight: 500; }
  .item-excerpt { font: 13px/1.45 var(--font-ui); color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .item-aside { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; padding-top: 2px; }
  .item-time { font: 11px/1 var(--font-mono); color: var(--muted); letter-spacing: 0.02em; white-space: nowrap; }
  .item-star { width: 22px; height: 22px; display: grid; place-items: center; color: var(--muted-2); border-radius: 4px; opacity: 0; transition: opacity .1s, color .1s, background .1s; }
  .item:hover .item-star, .item.is-active .item-star, .item-star.is-on { opacity: 1; }
  .item-star:hover { color: var(--star); background: var(--surface); }
  .item-star.is-on { color: var(--star); opacity: 1; }
  .item-star svg { width: 14px; height: 14px; stroke-width: 1.6; }
  .item-star.is-on svg { fill: currentColor; }

  /* reader */
  .article-toolbar { flex: 0 0 48px; display: flex; align-items: center; gap: 4px; padding: 0 16px 0 20px; border-bottom: 1px solid var(--border); }
  .tool-btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 8px; font: 12px/1 var(--font-ui); color: var(--muted); border-radius: var(--r-sm); transition: background .12s, color .12s; }
  .tool-btn:hover { background: var(--surface-2); color: var(--fg); }
  .tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .tool-btn.is-on { color: var(--accent-hover); }
  .tool-btn svg { width: 15px; height: 15px; stroke-width: 1.6; }
  .tool-btn .kbd { font: 10px/1 var(--font-mono); color: var(--muted-2); padding: 2px 4px; border: 1px solid var(--border-2); border-radius: 3px; background: var(--bg); margin-left: 2px; }
  .tool-btn.is-ai { color: var(--accent-hover); font-weight: 500; }
  .tool-btn.is-ai:hover { background: var(--accent-soft); color: var(--accent-hover); }
  .tool-btn.is-ai.is-on { background: var(--accent-soft); }
  .tool-btn.is-ai svg { stroke: var(--accent); }
  .tool-btn.is-ai .ai-spark { animation: aiSparkPulse 2.4s ease-in-out infinite; }
  @keyframes aiSparkPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

  .article-scroll { flex: 1; overflow-y: auto; padding: 36px 0 80px; }
  .article-scroll::-webkit-scrollbar { width: 10px; }
  .article-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 5px; }
  .article-scroll:hover::-webkit-scrollbar-thumb { background: var(--border-2); }

  .article { max-width: var(--col-read); margin: 0 auto; padding: 0 48px; }
  .article-kicker { display: flex; align-items: center; gap: 10px; font: 11px/1 var(--font-mono); color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; }
  .article-kicker .src { color: var(--accent-hover); font-weight: 600; letter-spacing: 0.06em; }
  .article-kicker .sep { color: var(--muted-2); }
  .article h1.title { font: 700 34px/1.18 var(--font-display); letter-spacing: -0.018em; color: var(--fg); margin: 0 0 14px; }
  .article .byline { display: flex; align-items: center; gap: 10px; padding: 12px 0 20px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); font: 12px/1.2 var(--font-mono); color: var(--muted); letter-spacing: 0.02em; }
  .article .byline .author { color: var(--fg); font-weight: 500; letter-spacing: 0.01em; font-family: var(--font-ui); }
  .article .byline .avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, oklch(70% 0.12 30), oklch(58% 0.16 28)); color: #fff; display: grid; place-items: center; font: 600 10px/1 var(--font-ui); }
  .article .body { font: 17px/1.72 var(--font-display); color: var(--fg); margin-top: 28px; }
  .article .body p { margin: 0 0 1.1em; }
  .article .body a { color: var(--accent-hover); border-bottom: 1px solid var(--accent-soft); }
  .article .body a:hover { border-color: var(--accent); }
  .article .body em { font-style: italic; }
  .article .body strong { font-weight: 700; color: var(--fg); }

  .ai-summary { margin: 22px 0 0; background: var(--accent-soft); border: 1px solid oklch(82% 0.05 40); border-radius: var(--r-md); overflow: hidden; transition: border-color .2s; }
  .ai-summary:hover { border-color: var(--accent); }
  .ai-summary .ai-head { width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 16px; background: transparent; border: 0; cursor: pointer; text-align: left; user-select: none; transition: background .12s; }
  .ai-summary .ai-head:hover { background: oklch(93% 0.04 42); }
  .ai-badge { display: inline-flex; align-items: center; gap: 6px; font: 600 10.5px/1 var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-hover); background: var(--bg); padding: 5px 9px; border-radius: 999px; border: 1px solid var(--accent); }
  .ai-badge svg { width: 12px; height: 12px; stroke-width: 1.8; }
  .ai-status { font: 12px/1.2 var(--font-mono); color: var(--muted); letter-spacing: 0.02em; }
  .ai-chev { margin-left: auto; color: var(--muted); transition: transform .25s, color .12s; display: inline-block; }
  .ai-chev svg { width: 14px; height: 14px; stroke-width: 1.8; }
  .ai-summary.is-open .ai-chev { transform: rotate(180deg); color: var(--accent-hover); }
  .ai-body { max-height: 0; overflow: hidden; transition: max-height .35s ease; }
  .ai-summary.is-open .ai-body { max-height: 1200px; }
  .ai-body-inner { padding: 4px 22px 18px; }
  .ai-tldr { font: italic 17px/1.55 var(--font-display); color: var(--fg); margin: 0 0 14px; padding-bottom: 14px; border-bottom: 1px dashed oklch(82% 0.05 40); letter-spacing: -0.005em; min-height: 1.55em; }
  .ai-tldr::before { content: '\201C'; color: var(--accent); font: 700 28px/0.6 var(--font-display); margin-right: 2px; vertical-align: -8px; }
  .ai-tldr::after { content: '\201D'; color: var(--accent); font: 700 28px/0.6 var(--font-display); margin-left: 2px; vertical-align: -8px; }
  .ai-points { list-style: none; padding: 0; margin: 0; }
  .ai-points li { position: relative; font: 14px/1.6 var(--font-ui); color: var(--fg-2); padding: 7px 0 7px 22px; min-height: 1.6em; }
  .ai-points li::before { content: ''; position: absolute; left: 4px; top: 15px; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }
  .ai-points li + li { border-top: 1px solid oklch(88% 0.03 45); }
  .ai-foot { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed oklch(82% 0.05 40); font: 11px/1 var(--font-mono); color: var(--muted); letter-spacing: 0.04em; }
  .ai-foot .ai-act { font: 11px/1 var(--font-mono); color: var(--fg-2); padding: 6px 10px; border-radius: var(--r-sm); border: 1px solid var(--border-2); background: var(--bg); transition: background .12s, color .12s, border-color .12s; letter-spacing: 0.04em; }
  .ai-foot .ai-act:hover { background: var(--surface-2); color: var(--fg); border-color: var(--accent); }
  .ai-cursor { display: inline-block; width: 1px; height: 1.1em; background: var(--accent); margin-left: 1px; vertical-align: text-bottom; animation: aiBlink .8s steps(2) infinite; }
  @keyframes aiBlink { 50% { opacity: 0; } }

  .article-foot { margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; font: 12px/1 var(--font-mono); color: var(--muted); }
  .article-foot .progress { display: flex; align-items: center; gap: 8px; }
  .article-foot .bar { width: 120px; height: 3px; background: var(--surface-2); border-radius: 2px; overflow: hidden; }
  .article-foot .bar i { display: block; height: 100%; background: var(--accent); border-radius: 2px; }

  .next-up { margin-top: 28px; padding: 16px 20px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); display: flex; align-items: center; gap: 14px; }
  .next-up .label { font: 10px/1 var(--font-mono); color: var(--muted); letter-spacing: 0.14em; text-transform: uppercase; }
  .next-up .next-title { flex: 1; min-width: 0; font: 600 14px/1.35 var(--font-ui); color: var(--fg); letter-spacing: -0.005em; }
  .next-up .arrow { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 50%; background: var(--bg); color: var(--fg-2); border: 1px solid var(--border-2); }
  .next-up .arrow svg { width: 14px; height: 14px; }

  /* keyhint */
  .keyhint { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 14px; padding: 6px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; box-shadow: 0 1px 0 var(--border); font: 11px/1 var(--font-mono); color: var(--muted); letter-spacing: 0.04em; }
  .keyhint .group { display: inline-flex; align-items: center; gap: 5px; }
  .keyhint kbd { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; background: var(--bg); border: 1px solid var(--border-2); border-bottom-width: 2px; border-radius: 4px; font: 10px/1 var(--font-mono); color: var(--fg-2); }
}
```

- [ ] **Step 15.2：commit**

```bash
git add apps/web/src/app.css
git commit -m "feat(web): 移植设计稿全部组件 CSS（topbar/nav/list/reader/AI）"
```

---

## 任务 16：端到端验证

- [ ] **Step 16.1：手动验证**

启动三端（docker / api / web），打开 `http://localhost:5173/`，逐项确认：

| # | 验证点 | 预期 |
|---|---|---|
| 1 | 整体配色 | warm paper 背景 + terracotta 强调色 |
| 2 | 字体 | serif 标题 / sans UI / mono meta 三族可辨识 |
| 3 | 三列宽度 | 264 + 392 + 1fr |
| 4 | Sidebar | 5 个 smart views + 4 个分类分组（Tech News / Engineering / Community 等） |
| 5 | 点击订阅源 | ArticleList 加载，显示 day-sep + item 卡 |
| 6 | 点击 item | Reader 打开，标为已读（圆点消失） |
| 7 | 点击 star | item 与 toolbar 星标同步切换 |
| 8 | 点击 AI 总结 | 折叠卡片展开，typewriter 渲染 TLDR + 要点 |
| 9 | 复制按钮 | 写入剪贴板（视觉反馈"已复制"） |
| 10 | j/k 快捷键 | 上下篇切换 |
| 11 | s 快捷键 | 切换当前文章 star |
| 12 | m 快捷键 | 标记当前文章已读 |
| 13 | ⌘. 快捷键 | 切换 AI 总结展开 |
| 14 | 响应式 | 缩窗口到 ≤1100px list 隐藏；≤720px nav 隐藏 |

- [ ] **Step 16.2：清理 + 列出 commits**

```bash
cd /Users/nmsn/Studio/folio
git status
git log --oneline 75fe4c5^..HEAD
```

预期：~14 个 commit，每个任务一个

---

## Self-Review

### Spec 覆盖

| Spec 章节 | 对应任务 |
|---|---|
| 范围（in scope）三列布局 / 主题 | Task 1, 2, 14, 15 |
| Sidebar 完整重构 | Task 11 |
| ArticleList 重构 | Task 12 |
| Reader 重构 + AI summary | Task 10, 13 |
| 客户端聚合 hooks | Task 5, 6 |
| 键盘交互 | Task 7, 14 |
| 设计 tokens | Task 1, 2 |
| 文件改动清单 | Task 1-15（覆盖） |
| 范围外 | N/A（按 spec 不做） |

### 占位符

- Task 10 中 "实际实施时改用 useRef" 已加备注
- Task 12 中 `feedNameFor` 占位符已加备注
- Task 14 中 `onToggleAI` 通过 querySelector 简化，已加备注

### 类型一致性

- `ArticleItem` 在 Task 12 定义，在 Task 14 复用 ✓
- `Feed` 在 Task 6 定义，在 Task 11/14 复用 ✓
- `useArticleState` 在 Task 5 定义，在 Task 12/14 复用 ✓
- `useGroupedFeeds` 在 Task 6 定义，在 Task 11 复用 ✓

无明显问题。
