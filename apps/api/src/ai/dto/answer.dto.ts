import { z } from 'zod'

export const AnswerSchema = z.object({
  articleId: z.string(),
  question: z.string().min(1),
})

export type AnswerInput = z.infer<typeof AnswerSchema>
