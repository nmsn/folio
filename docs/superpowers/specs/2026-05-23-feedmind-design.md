# folio Design Specification

**Date:** 2026-05-23
**Status:** Draft

## Overview

**folio** is a multi-end RSS reader + AI assistance + read-later tool designed for independent developers and power users who want full control over their data.

**Core Features:**
- RSS subscription management with intelligent content aggregation
- AI assistance: summarization, smart filtering/ranking, Q&A on articles
- Read later + bookmarks with reading progress sync across devices
- User accounts with multi-device synchronization

**Target:** Web-first, with future expansion to mobile, browser extension, and desktop.

---

## Architecture

### Tech Stack

| Module | Technology |
|--------|------------|
| Web | Tanstack Start + Tailwind CSS |
| Mobile | Expo React Native |
| Browser Extension | WXT |
| Desktop | Electron-vite |
| Backend | NestJS |
| Database | PostgreSQL 16 + Drizzle ORM |
| Authentication | Better Auth |
| AI | Claude API (primary), OpenAI (future) |
| Task Queue | pg-boss (PostgreSQL-based) |
| Deployment | Self-hosted (Docker) |

### Component Reuse Strategy

**From FeedFuse (reference project) learned patterns:**

1. **RSS Parsing** — `rss-parser` + custom fetch with SSRF protection (validate URLs)
2. **Fulltext Extraction** — `@mozilla/readability` + `jsdom`
3. **Task Queue** — pg-boss (PostgreSQL-based), same as FeedFuse. Background job processing for RSS fetching, AI tasks, feed refresh
4. **AI Tasks Config Fingerprint** — Capture config at queue time, validate before write

### Monorepo Structure

```
folio/
├── apps/
│   ├── web/           # Tanstack Start frontend
│   ├── mobile/        # Expo React Native
│   ├── extension/     # WXT browser extension
│   ├── desktop/       # Electron-vite desktop app
│   └── api/           # NestJS backend
├── packages/
│   ├── shared/        # Shared types, Zod schemas, utilities
│   ├── ui/            # Shared UI components (Radix UI + Tailwind CN)
│   ├── config/        # Shared config (ESLint, TypeScript, Tailwind)
│   ├── tailwindcss/   # Tailwind theme, design tokens
│   └── db/            # Drizzle ORM schema and migrations
├── drizzle/           # Database migrations
├── docs/              # Design documents
└── docker/            # Self-hosted deployment config
```

### Component Reuse Strategy

1. **packages/ui** — Cross-end UI component library using Tailwind CN approach with Radix UI primitives. Components are mostly headless to allow styling flexibility.
2. **packages/config** — Unified ESLint/TypeScript/Tailwind configurations that each app extends.
3. **packages/tailwindcss** — Design tokens (colors, spacing, typography) to maintain consistent visual language across all endpoints.
4. **packages/shared** — Zod schemas as API contracts. Types are shared between frontend and backend.

### API Design (Method C — Unified Contract)

- OpenAPI 3.0 specification as source of truth
- RESTful routes organized by resource
- Zod schemas in `packages/shared` define request/response types
- Frontend and backend share the same type definitions

---

## Database Schema

### Entity Relationship

```
users (1) ─────< sessions
  │
  └────< rss_sources (1) ─────< articles (1) ─────< reading_items ─────< ai_annotations
           │
           └────< user reading_items
```

### Tables

**users** — id, email, name, avatarUrl, passwordHash, createdAt, updatedAt

**sessions** — id, userId, expiresAt, createdAt

**rss_sources** — id, userId, name, url, description, iconUrl, category, isActive, lastFetchedAt, createdAt, updatedAt

**articles** — id, sourceId, title, url, author, description, content, imageUrl, publishedAt, createdAt, updatedAt

**reading_items** — id, userId, articleId, status (unread|reading|read|saved), progress, aiSummary, createdAt, updatedAt

**ai_annotations** — id, readingItemId, type (summary|highlight|question|answer), content, createdAt

---

## API Routes

### Authentication
- `POST /auth/signup` — Create account
- `POST /auth/signin` — Sign in
- `POST /auth/signout` — Sign out
- `GET /auth/session` — Get current session

### RSS Sources
- `GET /sources` — List user's RSS sources
- `POST /sources` — Add RSS source
- `GET /sources/:id` — Get source details
- `PATCH /sources/:id` — Update source
- `DELETE /sources/:id` — Delete source
- `POST /sources/:id/refresh` — Force refresh

### Articles
- `GET /articles` — List articles (cursor pagination)
- `GET /articles/:id` — Get article details
- `GET /sources/:sourceId/articles` — Articles from specific source

### Reading Items
- `GET /reading` — List user's reading items
- `POST /reading` — Add article to reading list
- `PATCH /reading/:id` — Update reading status/progress
- `DELETE /reading/:id` — Remove from reading list

### AI Assistance
- `POST /ai/summarize` — Generate article summary
- `POST /ai/filter` — AI-powered content filtering
- `POST /ai/answer` — Ask question about article

---

## Implementation Priority

### Phase 1 — Foundation
1. Set up NestJS backend with Better Auth
2. Implement authentication flows
3. Set up database with Drizzle ORM
4. Create Web app shell with Tanstack Start

### Phase 2 — RSS Core
1. RSS feed subscription management
2. Feed parsing and article extraction
3. Article listing and reading view

### Phase 3 — Read Later
1. Reading items CRUD
2. Progress tracking
3. Basic sync across sessions

### Phase 4 — AI Features
1. Claude API integration
2. Article summarization
3. Smart filtering
4. Q&A on articles

### Phase 5 — Expansion
1. Expo React Native mobile app
2. WXT browser extension
3. Electron desktop app

---

## Open Questions

- [ ] RSS parser library choice (rss-parser, feedparser, custom)?
- [ ] AI prompt templates and behavior guidelines
- [ ] Rate limiting strategy for AI API calls
- [ ] Background feed refresh mechanism (cron vs webhook)?
- [ ] Offline support strategy for mobile/desktop