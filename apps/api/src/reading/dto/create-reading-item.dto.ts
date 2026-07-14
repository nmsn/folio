import { z } from 'zod'

export const CreateReadingItemSchema = z.object({
  articleId: z.string(),
})

export const UpdateReadingItemSchema = z.object({
  status: z.enum(['unread', 'reading', 'read', 'saved']).optional(),
  progress: z.number().min(0).max(1).optional(),
})

export type CreateReadingItemInput = z.infer<typeof CreateReadingItemSchema>
export type UpdateReadingItemInput = z.infer<typeof UpdateReadingItemSchema>
