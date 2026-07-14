import { z } from 'zod'

export const CreateFeedSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.url(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export const UpdateFeedSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type CreateFeedInput = z.infer<typeof CreateFeedSchema>
export type UpdateFeedInput = z.infer<typeof UpdateFeedSchema>
