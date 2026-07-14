import { z } from 'zod'

export const FilterSchema = z.object({
  articleId: z.string(),
  userPreferences: z.string().optional(),
})

export type FilterInput = z.infer<typeof FilterSchema>
