# folio Phase 3: Read Later Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement "read later" functionality — add articles to reading list, track reading status and progress, and manage AI summaries/annotations.

**Architecture:** Reading items are user-specific records that link to articles. Each user can have one reading item per article. Status transitions: unread → reading → read/saved. Progress is stored as a 0-1 float.

**Tech Stack:** NestJS, PostgreSQL, Drizzle ORM

---

## File Structure

```
apps/api/src/reading/
├── reading.module.ts
├── reading.controller.ts
├── reading.service.ts
├── reading.repository.ts
└── dto/
    ├── create-reading-item.dto.ts
    └── update-reading-item.dto.ts

apps/api/src/annotations/
├── annotations.module.ts
├── annotations.service.ts
└── annotations.repository.ts
```

---

## Task 1: Reading Items Repository and CRUD

**Files:**
- Create: `apps/api/src/reading/dto/create-reading-item.dto.ts`
- Create: `apps/api/src/reading/dto/update-reading-item.dto.ts`
- Create: `apps/api/src/reading/reading.repository.ts`
- Create: `apps/api/src/reading/reading.service.ts`
- Create: `apps/api/src/reading/reading.controller.ts`
- Create: `apps/api/src/reading/reading.module.ts`

- [ ] **Step 1: Create create-reading-item.dto.ts**

```typescript
import { z } from 'zod';

export const CreateReadingItemSchema = z.object({
  articleId: z.string(),
});

export type CreateReadingItemInput = z.infer<typeof CreateReadingItemSchema>;
```

- [ ] **Step 2: Create update-reading-item.dto.ts**

```typescript
import { z } from 'zod';

export const UpdateReadingItemSchema = z.object({
  status: z.enum(['unread', 'reading', 'read', 'saved']).optional(),
  progress: z.number().min(0).max(1).optional(),
});

export type UpdateReadingItemInput = z.infer<typeof UpdateReadingItemSchema>;
```

- [ ] **Step 3: Create reading.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ReadingRepository {
  constructor(private db: DatabaseService) {}

  async findByUserId(userId: string, limit = 50, offset = 0) {
    return this.db.query(
      `SELECT ri.*, a.title, a.url, a.description, a.image_url, a.published_at
       FROM reading_items ri
       JOIN articles a ON a.id = ri.article_id
       WHERE ri.user_id = $1
       ORDER BY ri.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM reading_items WHERE id = $1', [id]);
  }

  async findByUserAndArticle(userId: string, articleId: string) {
    return this.db.queryOne(
      'SELECT * FROM reading_items WHERE user_id = $1 AND article_id = $2',
      [userId, articleId]
    );
  }

  async create(item: { id: string; userId: string; articleId: string; status: string }) {
    const now = new Date();
    await this.db.query(
      `INSERT INTO reading_items (id, user_id, article_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item.id, item.userId, item.articleId, item.status, now, now]
    );
    return this.findById(item.id);
  }

  async update(id: string, input: { status?: string; progress?: number }) {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (input.status !== undefined) {
      sets.push(`status = $${i++}`);
      params.push(input.status);
    }
    if (input.progress !== undefined) {
      sets.push(`progress = $${i++}`);
      params.push(Math.floor(input.progress * 100)); // Store as integer 0-100
    }

    if (sets.length === 0) return this.findById(id);

    sets.push(`updated_at = $${i++}`);
    params.push(new Date());
    params.push(id);

    await this.db.query(`UPDATE reading_items SET ${sets.join(', ')} WHERE id = $${i}`, params);
    return this.findById(id);
  }

  async delete(id: string) {
    await this.db.query('DELETE FROM reading_items WHERE id = $1', [id]);
  }
}
```

- [ ] **Step 4: Create reading.service.ts**

```typescript
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ReadingRepository } from './reading.repository';
import { ArticlesRepository } from '../articles/articles.repository';
import { CreateReadingItemInput, UpdateReadingItemInput } from './dto/create-reading-item.dto';

@Injectable()
export class ReadingService {
  constructor(
    private reading: ReadingRepository,
    private articles: ArticlesRepository
  ) {}

  async findAll(userId: string, limit = 50, offset = 0) {
    return this.reading.findByUserId(userId, limit, offset);
  }

  async findOne(id: string, userId: string) {
    const item = await this.reading.findById(id);
    if (!item) throw new NotFoundException('Reading item not found');
    if ((item as { user_id: string }).user_id !== userId) throw new ForbiddenException();
    return item;
  }

  async create(userId: string, input: CreateReadingItemInput) {
    // Check if article exists
    const article = await this.articles.findById(input.articleId);
    if (!article) throw new NotFoundException('Article not found');

    // Check if already in reading list
    const existing = await this.reading.findByUserAndArticle(userId, input.articleId);
    if (existing) throw new ConflictException('Article already in reading list');

    const id = crypto.randomUUID();
    return this.reading.create({
      id,
      userId,
      articleId: input.articleId,
      status: 'unread',
    });
  }

  async update(id: string, userId: string, input: UpdateReadingItemInput) {
    await this.findOne(id, userId); // validates ownership
    return this.reading.update(id, input);
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.reading.delete(id);
  }

  async markAsRead(id: string, userId: string) {
    return this.update(id, userId, { status: 'read', progress: 1 });
  }

  async markAsSaved(id: string, userId: string) {
    return this.update(id, userId, { status: 'saved' });
  }
}
```

- [ ] **Step 5: Create reading.controller.ts**

```typescript
import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Query } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { CreateReadingItemSchema, UpdateReadingItemSchema } from './dto/create-reading-item.dto';
import type { Request } from 'express';

@Controller('reading')
export class ReadingController {
  constructor(private reading: ReadingService) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.reading.findAll(userId, parseInt(limit || '50'), parseInt(offset || '0'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.reading.findOne(id, userId);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateReadingItemSchema.parse(body);
    const userId = (req as { user: { id: string } }).user?.id;
    return this.reading.create(userId, input);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateReadingItemSchema.parse(body);
    const userId = (req as { user: { id: string } }).user?.id;
    return this.reading.update(id, userId, input);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.reading.delete(id, userId);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.reading.markAsRead(id, userId);
  }

  @Post(':id/save')
  async markAsSaved(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as { user: { id: string } }).user?.id;
    return this.reading.markAsSaved(id, userId);
  }
}
```

- [ ] **Step 6: Create reading.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';
import { ReadingRepository } from './reading.repository';
import { ArticlesModule } from '../articles/articles.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ArticlesModule],
  controllers: [ReadingController],
  providers: [ReadingService, ReadingRepository],
})
export class ReadingModule {}
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/reading/
git commit -m "feat(api): add reading items CRUD module"
```

---

## Task 2: AI Annotations Repository and Service

**Files:**
- Create: `apps/api/src/annotations/annotations.repository.ts`
- Create: `apps/api/src/annotations/annotations.service.ts`
- Create: `apps/api/src/annotations/annotations.module.ts`

- [ ] **Step 1: Create annotations.repository.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnnotationsRepository {
  constructor(private db: DatabaseService) {}

  async findByReadingItemId(readingItemId: string) {
    return this.db.query(
      'SELECT * FROM ai_annotations WHERE reading_item_id = $1 ORDER BY created_at ASC',
      [readingItemId]
    );
  }

  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM ai_annotations WHERE id = $1', [id]);
  }

  async create(annotation: { id: string; readingItemId: string; type: string; content: string }) {
    const now = new Date();
    await this.db.query(
      `INSERT INTO ai_annotations (id, reading_item_id, type, content, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [annotation.id, annotation.readingItemId, annotation.type, annotation.content, now]
    );
    return this.findById(annotation.id);
  }

  async delete(id: string) {
    await this.db.query('DELETE FROM ai_annotations WHERE id = $1', [id]);
  }
}
```

- [ ] **Step 2: Create annotations.service.ts**

```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnnotationsRepository } from './annotations.repository';
import { ReadingRepository } from '../reading/reading.repository';

@Injectable()
export class AnnotationsService {
  constructor(
    private annotations: AnnotationsRepository,
    private reading: ReadingRepository
  ) {}

  async findByReadingItem(readingItemId: string, userId: string) {
    // Verify ownership
    const readingItem = await this.reading.findById(readingItemId);
    if (!readingItem) throw new NotFoundException('Reading item not found');
    if ((readingItem as { user_id: string }).user_id !== userId) throw new ForbiddenException();

    return this.annotations.findByReadingItemId(readingItemId);
  }

  async create(userId: string, readingItemId: string, type: 'summary' | 'highlight' | 'question' | 'answer', content: string) {
    const readingItem = await this.reading.findById(readingItemId);
    if (!readingItem) throw new NotFoundException('Reading item not found');
    if ((readingItem as { user_id: string }).user_id !== userId) throw new ForbiddenException();

    const id = crypto.randomUUID();
    return this.annotations.create({ id, readingItemId, type, content });
  }

  async delete(id: string, userId: string) {
    const annotation = await this.annotations.findById(id);
    if (!annotation) throw new NotFoundException('Annotation not found');

    const readingItem = await this.reading.findById((annotation as { reading_item_id: string }).reading_item_id);
    if (!readingItem) throw new NotFoundException('Reading item not found');
    if ((readingItem as { user_id: string }).user_id !== userId) throw new ForbiddenException();

    return this.annotations.delete(id);
  }
}
```

- [ ] **Step 3: Create annotations.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { AnnotationsRepository } from './annotations.repository';
import { ReadingModule } from '../reading/reading.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ReadingModule],
  providers: [AnnotationsService, AnnotationsRepository],
  exports: [AnnotationsService],
})
export class AnnotationsModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/annotations/
git commit -m "feat(api): add AI annotations module"
```

---

## Task 3: Integrate Modules into App Module

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Update app.module.ts**

Add ReadingModule and AnnotationsModule to imports:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { FeedsModule } from './feeds/feeds.module';
import { ArticlesModule } from './articles/articles.module';
import { RssModule } from './rss/rss.module';
import { ReadingModule } from './reading/reading.module';
import { AnnotationsModule } from './annotations/annotations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    FeedsModule,
    ArticlesModule,
    RssModule,
    ReadingModule,
    AnnotationsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): integrate reading and annotations modules"
```

---

## Task 4: Add Reading List Query with Filters

**Files:**
- Modify: `apps/api/src/reading/reading.repository.ts`
- Modify: `apps/api/src/reading/reading.service.ts`
- Modify: `apps/api/src/reading/reading.controller.ts`

- [ ] **Step 1: Add filter query to reading.repository.ts**

Add a new method:

```typescript
async findByUserAndStatus(userId: string, status: string, limit = 50, offset = 0) {
  return this.db.query(
    `SELECT ri.*, a.title, a.url, a.description, a.image_url, a.published_at
     FROM reading_items ri
     JOIN articles a ON a.id = ri.article_id
     WHERE ri.user_id = $1 AND ri.status = $2
     ORDER BY ri.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, status, limit, offset]
  );
}
```

- [ ] **Step 2: Add filter method to reading.service.ts**

```typescript
async findByStatus(userId: string, status: string, limit = 50, offset = 0) {
  return this.reading.findByUserAndStatus(userId, status, limit, offset);
}
```

- [ ] **Step 3: Add status filter endpoint to reading.controller.ts**

Add a new endpoint:

```typescript
@Get('status/:status')
async findByStatus(
  @Param('status') status: string,
  @Req() req: Request,
  @Query('limit') limit?: string,
  @Query('offset') offset?: string
) {
  const userId = (req as { user: { id: string } }).user?.id;
  return this.reading.findByStatus(userId, status, parseInt(limit || '50'), parseInt(offset || '0'));
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/reading/
git commit -m "feat(api): add reading list status filter"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Reading items CRUD ✓ (Task 1)
   - Progress tracking ✓ (Task 1)
   - AI annotations ✓ (Task 2)
   - Status filtering ✓ (Task 4)

2. **Placeholder scan:** No placeholders found.

3. **Type consistency:** All repository methods use consistent signatures with PostgreSQL $1, $2 placeholders.

---

**Plan saved to `docs/superpowers/plans/2026-05-23-folio-phase3-read-later.md`**

## Two Execution Options:

**1. Subagent-Driven (recommended)**
**2. Inline Execution**

**Which approach?**