import { z } from 'zod'

export const SignUpSchema = z.object({
  email: z.email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
})

export const SignInSchema = z.object({
  email: z.email(),
  password: z.string(),
})

export type SignUpInput = z.infer<typeof SignUpSchema>
export type SignInInput = z.infer<typeof SignInSchema>
