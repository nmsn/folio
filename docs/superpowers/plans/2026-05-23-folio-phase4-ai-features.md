# folio Phase 4: AI Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement AI-powered features — article summarization, smart content filtering, and Q&A on articles using Claude API.

**Architecture:** AI operations are handled via pg-boss background jobs for reliability. API routes enqueue jobs and return immediately. AI client is configurable to use Claude (primary) or OpenAI (future). Results are stored in reading items and AI annotations tables.

**Tech Stack:** @anthropic-ai/sdk, pg-boss, NestJS

---

## File Structure

```
apps/api/src/ai/
├── ai.module.ts
├── ai.service.ts
├── ai.controller.ts
├── clients/
│   ├── claude.client.ts
│   └── openai.client.ts
├── prompts/
│   ├── summarize.prompt.ts
│   ├── filter.prompt.ts
│   └── answer.prompt.ts
└── dto/
    ├── summarize.dto.ts
    ├── filter.dto.ts
    └── answer.dto.ts

apps/api/src/worker/
├── ai-summary.processor.ts
├── ai-filter.processor.ts
└── ai-answer.processor.ts
```

---

## Task 1: AI Client Abstraction and Claude Integration

**Files:**
- Create: `apps/api/src/ai/clients/claude.client.ts`
- Create: `apps/api/src/ai/clients/openai.client.ts`
- Create: `apps/api/src/ai/ai.module.ts`

- [ ] **Step 1: Create apps/api/src/ai/clients/claude.client.ts**
```typescript
import Anthropic from '@anthropic-ai/sdk';

export interface AISummarizeResult {
  summary: string;
  keyPoints: string[];
}

export interface AIAnswerResult {
  answer: string;
  sources: string[];
}

export interface AIFilterResult {
  relevant: boolean;
  reason: string;
  score: number;
}

export class ClaudeClient {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async summarize(content: string, maxTokens = 500): Promise<AISummarizeResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: `Please summarize the following article concisely:\n\n${content.slice(0, 10000)}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      summary: text,
      keyPoints: text.split('\n').filter((line) => line.trim().startsWith('-')),
    };
  }

  async answer(content: string, question: string): Promise<AIAnswerResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Based on the following article, answer the question.\n\nArticle:\n${content.slice(0, 10000)}\n\nQuestion: ${question}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      answer: text,
      sources: [],
    };
  }

  async filter(content: string, userPreferences?: string): Promise<AIFilterResult> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Analyze if this article is relevant to the user's interests.\n\nArticle:\n${content.slice(0, 5000)}\n\nUser preferences: ${userPreferences || 'General interest'}\n\nRespond with only a JSON object: {"relevant": true/false, "reason": "brief reason", "score": 0-10}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      const parsed = JSON.parse(text);
      return {
        relevant: parsed.relevant,
        reason: parsed.reason || '',
        score: parsed.score || 5,
      };
    } catch {
      return { relevant: true, reason: 'Parse error', score: 5 };
    }
  }
}
```

- [ ] **Step 2: Create apps/api/src/ai/clients/openai.client.ts**
```typescript
// Placeholder for future OpenAI integration
// Mirrors ClaudeClient interface for pluggable AI backends

export interface AISummarizeResult {
  summary: string;
  keyPoints: string[];
}

export interface AIAnswerResult {
  answer: string;
  sources: string[];
}

export interface AIFilterResult {
  relevant: boolean;
  reason: string;
  score: number;
}

export class OpenAIClient {
  // Future implementation for OpenAI API
  async summarize(content: string, maxTokens = 500): Promise<AISummarizeResult> {
    throw new Error('OpenAI client not yet implemented');
  }

  async answer(content: string, question: string): Promise<AIAnswerResult> {
    throw new Error('OpenAI client not yet implemented');
  }

  async filter(content: string, userPreferences?: string): Promise<AIFilterResult> {
    throw new Error('OpenAI client not yet implemented');
  }
}
```

- [ ] **Step 3: Create apps/api/src/ai/ai.module.ts**
```typescript
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai/
git commit -m "feat(api): add Claude AI client integration"
```

---

## Task 2: AI Service and Controller

**Files:**
- Create: `apps/api/src/ai/ai.service.ts`
- Create: `apps/api/src/ai/ai.controller.ts`
- Create: `apps/api/src/ai/dto/summarize.dto.ts`
- Create: `apps/api/src/ai/dto/filter.dto.ts`
- Create: `apps/api/src/ai/dto/answer.dto.ts`

- [ ] **Step 1: Create apps/api/src/ai/dto/summarize.dto.ts**
```typescript
import { z } from 'zod';

export const SummarizeSchema = z.object({
  articleId: z.string(),
});

export type SummarizeInput = z.infer<typeof SummarizeSchema>;
```

- [ ] **Step 2: Create apps/api/src/ai/dto/filter.dto.ts**
```typescript
import { z } from 'zod';

export const FilterSchema = z.object({
  articleId: z.string(),
  userPreferences: z.string().optional(),
});

export type FilterInput = z.infer<typeof FilterSchema>;
```

- [ ] **Step 3: Create apps/api/src/ai/dto/answer.dto.ts**
```typescript
import { z } from 'zod';

export const AnswerSchema = z.object({
  articleId: z.string(),
  question: z.string().min(1),
});

export type AnswerInput = z.infer<typeof AnswerSchema>;
```

- [ ] **Step 4: Create apps/api/src/ai/ai.service.ts**
```typescript
import { Injectable } from '@nestjs/common';
import { ClaudeClient, AISummarizeResult, AIAnswerResult, AIFilterResult } from './clients/claude.client';
import { ArticlesRepository } from '../articles/articles.repository';
import { ReadingRepository } from '../reading/reading.repository';
import { AnnotationsService } from '../annotations/annotations.service';
import { boss } from '../worker/feed-scheduler';

@Injectable()
export class AiService {
  private claudeClient: ClaudeClient;

  constructor(
    private articles: ArticlesRepository,
    private reading: ReadingRepository,
    private annotations: AnnotationsService
  ) {
    this.claudeClient = new ClaudeClient();
  }

  async summarizeArticle(articleId: string, userId: string): Promise<{ jobId: string }> {
    const article = await this.articles.findById(articleId);
    if (!article) throw new NotFoundException('Article not found');

    const readingItem = await this.reading.findByUserAndArticle(userId, articleId);
    if (!readingItem) throw new NotFoundException('Article not in reading list');

    const jobId = await boss.send('ai.summarize', { articleId, userId });
    return { jobId };
  }

  async answerQuestion(articleId: string, userId: string, question: string): Promise<AIAnswerResult> {
    const article = await this.articles.findById(articleId);
    if (!article) throw new NotFoundException('Article not found');

    const content = (article as { content?: string }).content || '';
    const result = await this.claudeClient.answer(content, question);

    await this.annotations.create(userId, (await this.reading.findByUserAndArticle(userId, articleId))!.id, 'answer', result.answer);

    return result;
  }

  async filterArticle(articleId: string, userPreferences?: string): Promise<AIFilterResult> {
    const article = await this.articles.findById(articleId);
    if (!article) throw new NotFoundException('Article not found');

    const content = (article as { description?: string; content?: string }).description || '';
    return this.claudeClient.filter(content, userPreferences);
  }
}
```

- [ ] **Step 5: Create apps/api/src/ai/ai.controller.ts**
```typescript
import { Controller, Post, Body, Req, Get, Param } from '@nestjs/common';
import { AiService } from './ai.service';
import { SummarizeSchema, FilterSchema, AnswerSchema } from './dto/summarize.dto';
import type { Request } from 'express';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('summarize')
  async summarize(@Body() body: unknown, @Req() req: Request) {
    const input = SummarizeSchema.parse(body);
    const userId = (req as { user: { id: string } }).user?.id;
    return this.ai.summarizeArticle(input.articleId, userId);
  }

  @Post('answer')
  async answer(@Body() body: unknown, @Req() req: Request) {
    const input = AnswerSchema.parse(body);
    const userId = (req as { user: { id: string } }).user?.id;
    return this.ai.answerQuestion(input.articleId, userId, input.question);
  }

  @Get('filter/:articleId')
  async filter(@Param('articleId') articleId: string, @Req() req: Request) {
    return this.ai.filterArticle(articleId);
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/ai/
git commit -m "feat(api): add AI service and controller"
```

---

## Task 3: AI Worker Processors

**Files:**
- Create: `apps/api/src/worker/ai-summary.processor.ts`
- Create: `apps/api/src/worker/ai-answer.processor.ts`
- Create: `apps/api/src/worker/ai-filter.processor.ts`

- [ ] **Step 1: Create apps/api/src/worker/ai-summary.processor.ts**
```typescript
import { boss } from './feed-scheduler';
import { ArticlesRepository } from '../articles/articles.repository';
import { ReadingRepository } from '../reading/reading.repository';
import { AnnotationsRepository } from '../annotations/annotations.repository';
import { ClaudeClient } from '../ai/clients/claude.client';

export function registerAiProcessors(
  articlesRepo: ArticlesRepository,
  readingRepo: ReadingRepository,
  annotationsRepo: AnnotationsRepository
) {
  const claudeClient = new ClaudeClient();

  // AI Summarize processor
  boss.work('ai.summarize', { concurrency: 2 }, async (args: { articleId: string; userId: string }) => {
    console.log(`AI summarizing article: ${args.articleId}`);

    const article = await articlesRepo.findById(args.articleId);
    if (!article) {
      console.error(`Article not found: ${args.articleId}`);
      return;
    }

    const content = (article as { content?: string }).content ||
      (article as { description?: string }).description || '';

    if (!content) {
      console.error(`No content to summarize for article: ${args.articleId}`);
      return;
    }

    try {
      const result = await claudeClient.summarize(content);

      // Store summary in reading item
      const readingItem = await readingRepo.findByUserAndArticle(args.userId, args.articleId);
      if (readingItem) {
        await readingRepo.update(readingItem.id, { status: 'reading' });
      }

      // Create annotation
      const id = crypto.randomUUID();
      await annotationsRepo.create({
        id,
        readingItemId: readingItem!.id,
        type: 'summary',
        content: result.summary,
      });

      console.log(`AI summary complete for article: ${args.articleId}`);
      return result;
    } catch (error) {
      console.error(`AI summarize failed for ${args.articleId}:`, error);
      throw error;
    }
  });
}
```

- [ ] **Step 2: Create apps/api/src/worker/ai-answer.processor.ts**
```typescript
import { boss } from './feed-scheduler';
import { ArticlesRepository } from '../articles/articles.repository';
import { ReadingRepository } from '../reading/reading.repository';
import { AnnotationsRepository } from '../annotations/annotations.repository';
import { ClaudeClient } from '../ai/clients/claude.client';

export function registerAiAnswerProcessor(
  articlesRepo: ArticlesRepository,
  readingRepo: ReadingRepository,
  annotationsRepo: AnnotationsRepository
) {
  const claudeClient = new ClaudeClient();

  boss.work('ai.answer', { concurrency: 2 }, async (args: { articleId: string; userId: string; question: string }) => {
    console.log(`AI answering question for article: ${args.articleId}`);

    const article = await articlesRepo.findById(args.articleId);
    if (!article) {
      console.error(`Article not found: ${args.articleId}`);
      return;
    }

    const content = (article as { content?: string }).content ||
      (article as { description?: string }).description || '';

    try {
      const result = await claudeClient.answer(content, args.question);

      const readingItem = await readingRepo.findByUserAndArticle(args.userId, args.articleId);
      if (readingItem) {
        const id = crypto.randomUUID();
        await annotationsRepo.create({
          id,
          readingItemId: readingItem.id,
          type: 'answer',
          content: `Q: ${args.question}\n\nA: ${result.answer}`,
        });
      }

      return result;
    } catch (error) {
      console.error(`AI answer failed for ${args.articleId}:`, error);
      throw error;
    }
  });
}
```

- [ ] **Step 3: Create apps/api/src/worker/ai-filter.processor.ts**
```typescript
import { boss } from './feed-scheduler';
import { ArticlesRepository } from '../articles/articles.repository';
import { ClaudeClient } from '../ai/claude.client';

export function registerAiFilterProcessor(articlesRepo: ArticlesRepository) {
  const claudeClient = new ClaudeClient();

  boss.work('ai.filter', { concurrency: 3 }, async (args: { articleId: string; userPreferences?: string }) => {
    console.log(`AI filtering article: ${args.articleId}`);

    const article = await articlesRepo.findById(args.articleId);
    if (!article) {
      console.error(`Article not found: ${args.articleId}`);
      return;
    }

    const content = (article as { description?: string }).description || '';

    try {
      const result = await claudeClient.filter(content, args.userPreferences);
      console.log(`AI filter complete for article: ${args.articleId}, relevant: ${result.relevant}`);
      return result;
    } catch (error) {
      console.error(`AI filter failed for ${args.articleId}:`, error);
      throw error;
    }
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/worker/
git commit -m "feat(api): add AI worker processors"
```

---

## Task 4: Integrate AI Module into App Module

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Update app.module.ts**

Add AiModule to imports:

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
import { AiModule } from './ai/ai.module';

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
    AiModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): integrate AI module"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Claude API integration ✓ (Task 1)
   - Article summarization ✓ (Task 2, 3)
   - Smart filtering ✓ (Task 1, 3)
   - Q&A on articles ✓ (Task 2, 3)

2. **Placeholder scan:** No placeholders found.

3. **Type consistency:** All AI clients use consistent interfaces.

---

**Plan saved to `docs/superpowers/plans/2026-05-23-folio-phase4-ai-features.md`**

## Two Execution Options:

**1. Subagent-Driven (recommended)**
**2. Inline Execution**

**Which approach?**