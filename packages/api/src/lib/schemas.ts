import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.url().optional(),
})

export const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).optional(),
})

export const SignUpSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
})

export const SignInSchema = z.object({
  email: z.email(),
  password: z.string(),
})

export const RSSSourceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1).max(200),
  url: z.url(),
  description: z.string().optional(),
  iconUrl: z.url().optional(),
  category: z.string().optional(),
  isActive: z.boolean().default(true),
  lastFetchedAt: z.date().optional(),
})

export const CreateRSSSourceSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.url(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const UpdateRSSSourceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const ArticleSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  title: z.string().min(1),
  url: z.url(),
  author: z.string().optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  imageUrl: z.url().optional(),
  publishedAt: z.date(),
})

export const ArticleListQuerySchema = z.object({
  sourceId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
})

export const ReadingItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  articleId: z.string(),
  status: z.enum(['unread', 'reading', 'read', 'saved']),
  progress: z.number().min(0).max(1).optional(),
  aiSummary: z.string().optional(),
})

export const CreateReadingItemSchema = z.object({
  articleId: z.string(),
})

export const UpdateReadingItemSchema = z.object({
  status: z.enum(['unread', 'reading', 'read', 'saved']).optional(),
  progress: z.number().min(0).max(1).optional(),
})

export const AIAnnotationSchema = z.object({
  id: z.string(),
  type: z.enum(['summary', 'highlight', 'question', 'answer']),
  content: z.string(),
  createdAt: z.date(),
})

export const AIAgentRequestSchema = z.object({
  articleId: z.string(),
  action: z.enum(['summarize', 'filter', 'answer']),
  question: z.string().optional(),
})

export const SummarizeSchema = z.object({
  articleId: z.string(),
})

export const FilterSchema = z.object({
  articleId: z.string(),
  userPreferences: z.string().optional(),
})

export const AnswerSchema = z.object({
  articleId: z.string(),
  question: z.string().min(1),
})

export type SignUpInput = z.infer<typeof SignUpSchema>
export type SignInInput = z.infer<typeof SignInSchema>
export type CreateFeedInput = z.infer<typeof CreateRSSSourceSchema>
export type UpdateFeedInput = z.infer<typeof UpdateRSSSourceSchema>
