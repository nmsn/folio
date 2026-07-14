# folio

Multi-end RSS reader + AI assistance + read-later tool.

## Tech Stack

| Module | Technology |
|--------|------------|
| Web | Tanstack Start + Tailwind |
| Mobile | Expo React Native |
| Extension | WXT |
| Desktop | Electron-vite |
| Backend | NestJS |
| Database | SQLite + Turso + Drizzle ORM |
| Auth | Better Auth |
| AI | Claude API (primary), OpenAI (future) |

## Project Structure

```
folio/
├── apps/
│   ├── web/          # Tanstack Start frontend
│   ├── mobile/       # Expo React Native
│   ├── extension/    # WXT browser extension
│   ├── desktop/      # Electron-vite desktop app
│   └── api/          # NestJS backend
├── packages/
│   ├── shared/       # Shared types, Zod schemas, utilities
│   ├── ui/           # Shared UI components (Radix UI + Tailwind)
│   ├── config/       # Shared config (ESLint, TypeScript, Tailwind)
│   ├── tailwindcss/  # Tailwind theme, design tokens
│   └── db/           # Drizzle ORM schema and migrations
├── drizzle/          # Database migrations
├── docs/             # Design documents
└── docker/           # Self-hosted deployment config
```

## Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start all apps in dev mode
pnpm build          # Build all apps
pnpm db:studio       # Open Drizzle Studio
```