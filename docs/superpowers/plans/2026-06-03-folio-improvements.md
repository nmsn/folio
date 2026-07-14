# folio Improvement Tasks

> **Status:** Active
> **Created:** 2026-06-03
> **Related Project:** RSS Reader comparison analysis

## Background

Analyzed three RSS-related projects for improvement opportunities:
- **FeedFuse** - Next.js + PostgreSQL, AI features (translation, digest), OPML, Fever API
- **garss** - Python + React, parallel fetching, markdown-based README generation
- **papr** - Tauri + React, desktop-focused

Current folio uses: NestJS + SQLite/Drizzle + Tanstack Start + Turborepo

---

## Priority 1: High Priority

### 1.1 OPML Import/Export

**Why needed:** Basic RSS reader functionality, users expect to migrate subscriptions

**Tech stack approach (NestJS + Drizzle):**
```typescript
// packages/shared/src/schemas/opml.schema.ts
import { z } from 'zod'

export const opmlSchema = z.object({
  opml: z.object({
    head: z.object({
      title: z.string(),
      dateCreated: z.string().optional(),
    }),
    body: z.array(z.object({
      text: z.string(),
      xmlUrl: z.string(),
      type: z.string().optional(),
      htmlUrl: z.string().optional(),
      category: z.string().optional(),
    }))
  })
})

export type OPMLFeed = z.infer<typeof opmlSchema>['opml']['body'][number]
```

**Files to create/modify:**
- `packages/shared/src/schemas/opml.schema.ts`
- `apps/api/src/feeds/feeds.service.ts` - add `exportToOPML()`, `importFromOPML()`
- `apps/api/src/feeds/feeds.controller.ts` - add endpoints

**Test cases:**
- `apps/api/src/feeds/__tests__/opml.export.spec.ts`
- `apps/api/src/feeds/__tests__/opml.import.spec.ts`

---

### 1.2 URL State Sync

**Why needed:** Shareable links, browser back/forward support, bookmarkable views

**Tech stack approach (Tanstack Router):**
```typescript
// apps/web/src/routes.ts - add route params
'/feeds/:feedId'
'/articles/:articleId'
'/categories/:categoryId'

// apps/web/src/hooks/useUrlState.ts
export function useUrlState() {
  const searchParams = useSearch({
    from: '/_index',
  })
  // Sync: view mode, unread filter, sort order
  return {
    view: searchParams.view ?? 'list',
    unreadOnly: searchParams.unread === 'true',
    sortBy: searchParams.sort ?? 'publishedAt',
  }
}
```

**Files to create/modify:**
- `apps/web/src/hooks/useUrlState.ts`
- `apps/web/src/routes.ts` - add route params
- Update article list, feed list components

**Test cases:**
- `apps/web/src/__tests__/useUrlState.spec.ts`

---

## Priority 2: Medium Priority

### 2.1 Three Column Layout

**Why needed:** Classic RSS reader UX pattern, better content organization

**Tech stack approach (React + Tailwind + Radix):**
```typescript
// packages/ui/src/components/three-column-layout.tsx
import { Slot } from '@radix-ui/react-slot'

export function ThreeColumnLayout({
  sidebar,
  articleList,
  reader,
}: {
  sidebar: React.ReactNode
  articleList: React.ReactNode
  reader: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[280px_320px_1fr] h-screen">
      <aside className="border-r">{sidebar}</aside>
      <div className="border-r">{articleList}</div>
      <main>{reader}</main>
    </div>
  )
}
```

**Files to create/modify:**
- `packages/ui/src/components/three-column-layout.tsx`
- `packages/ui/src/index.ts` - export component

**Test cases:**
- `packages/ui/src/__tests__/three-column-layout.spec.tsx`

---

### 2.2 Repository + Service Layer Refactor

**Why needed:** Better separation of concerns, testability, cleaner architecture

**Current structure (per domain modules):**
```
apps/api/src/
├── feeds/
├── articles/
├── reading/
├── rss/
├── ai/
```

**Proposed structure (per domain with repo + service):**
```
apps/api/src/
├── feeds/
│   ├── feeds.module.ts
│   ├── feeds.controller.ts
│   ├── dto/
│   ├── services/
│   │   └── feeds.service.ts
│   └── repositories/
│       └── feeds.repository.ts
├── articles/
│   ├── articles.module.ts
│   ├── articles.controller.ts
│   ├── services/
│   │   └── articles.service.ts
│   └── repositories/
│       └── articles.repository.ts
```

**Files to refactor:**
- `apps/api/src/feeds/` - add repository
- `apps/api/src/articles/` - add repository
- `apps/api/src/reading/` - add repository

**Test cases:**
- `apps/api/src/__tests__/repositories/feeds.repository.spec.ts`

---

### 2.3 Cursor-based Pagination

**Why needed:** Better performance with large article lists, consistent ordering

**Tech stack approach (NestJS + Drizzle):**
```typescript
// packages/shared/src/schemas/pagination.schema.ts
export const cursorPaginationSchema = z.object({
  cursor: z.object({
    id: z.string(),
    publishedAt: z.string(),
  }).optional(),
  limit: z.number().min(1).max(100).default(20),
})

// apps/api/src/articles/articles.service.ts
async getArticles(cursor?: { id: string; publishedAt: Date }, limit = 20) {
  return this.db.query.articles.findMany({
    where: cursor
      ? and(
          lt(articles.publishedAt, cursor.publishedAt),
          lt(articles.id, cursor.id)
        )
      : undefined,
    orderBy: [desc(articles.publishedAt), desc(articles.id)],
    limit,
  })
}
```

**Files to modify:**
- `packages/shared/src/schemas/pagination.schema.ts`
- `apps/api/src/articles/articles.service.ts`
- `apps/api/src/articles/articles.controller.ts`

**Test cases:**
- `apps/api/src/articles/__tests__/cursor-pagination.spec.ts`

---

## Priority 3: Lower Priority (Differentiators)

### 3.1 AI Translation

**Why needed:** Immersive reading for non-native content

**Tech stack approach (Claude API streaming):**
```typescript
// apps/api/src/ai/ai.service.ts
async translateArticle(articleId: string, targetLang: string) {
  const article = await this.articlesRepo.findById(articleId)
  
  const prompt = `Translate to ${targetLang}:
Title: ${article.title}
Content: ${article.content || article.description}`

  return this.claude.messages.stream({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 4096,
    stream: true,
  })
}
```

---

### 3.2 AI Digest

**Why needed:** Cross-feed summarization for daily briefings

```typescript
async generateDailyDigest(userId: string) {
  const feeds = await this.feedsRepo.findByUser(userId)
  const articles = await this.articlesRepo.getRecentArticles(feeds, '24h')
  
  const prompt = `Summarize these ${articles.length} articles into a digest...`
  
  return this.claude.messages.create({...})
}
```

---

## Tech Stack Considerations

| Feature | FeedFuse (Next.js) | folio (NestJS + Turborepo) |
|---------|-------------------|--------------------------------|
| OPML | Raw SQL | Drizzle ORM |
| URL State | URL searchParams | Tanstack Router |
| AI | OpenAI streaming | Claude API streaming |
| Database | PostgreSQL | SQLite/Turso |
| Background Jobs | pg-boss | pg-boss (same) |
| Auth | Custom | Better Auth |

**Key difference:** folio's multi-package monorepo means shared schemas in `packages/shared` are used across all apps (web, mobile, desktop, extension).

---

## File Change Summary

| File | Action |
|------|--------|
| `docs/superpowers/plans/2026-06-03-folio-improvements.md` | Create (this file) |
| `packages/shared/src/schemas/opml.schema.ts` | Create |
| `packages/shared/src/schemas/pagination.schema.ts` | Create |
| `apps/api/src/feeds/feeds.service.ts` | Modify - add OPML methods |
| `apps/api/src/feeds/feeds.controller.ts` | Modify - add OPML endpoints |
| `apps/api/src/feeds/__tests__/opml.export.spec.ts` | Create |
| `apps/api/src/feeds/__tests__/opml.import.spec.ts` | Create |
| `apps/web/src/hooks/useUrlState.ts` | Create |
| `apps/web/src/routes.ts` | Modify - add route params |
| `packages/ui/src/components/three-column-layout.tsx` | Create |
| `packages/ui/src/__tests__/three-column-layout.spec.tsx` | Create |