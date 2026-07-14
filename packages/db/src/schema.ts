import { pgTable, text, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const rssSources = pgTable('rss_sources', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  category: text('category'),
  isActive: text('is_active').default('true'),
  lastFetchedAt: integer('last_fetched_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const articles = pgTable('articles', {
  id: text('id').primaryKey(),
  sourceId: text('source_id')
    .notNull()
    .references(() => rssSources.id),
  title: text('title').notNull(),
  url: text('url').notNull(),
  author: text('author'),
  description: text('description'),
  content: text('content'),
  imageUrl: text('image_url'),
  publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const readingItems = pgTable('reading_items', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  articleId: text('article_id')
    .notNull()
    .references(() => articles.id),
  status: text('status', { enum: ['unread', 'reading', 'read', 'saved'] }).default('unread'),
  progress: integer('progress'),
  aiSummary: text('ai_summary'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const aiAnnotations = pgTable('ai_annotations', {
  id: text('id').primaryKey(),
  readingItemId: text('reading_item_id')
    .notNull()
    .references(() => readingItems.id),
  type: text('type', { enum: ['summary', 'highlight', 'question', 'answer'] }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
