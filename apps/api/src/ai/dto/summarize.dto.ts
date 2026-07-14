import { z } from 'zod'

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

export type SummarizeInput = z.infer<typeof SummarizeSchema>
export type FilterInput = z.infer<typeof FilterSchema>
export type AnswerInput = z.infer<typeof AnswerSchema>
