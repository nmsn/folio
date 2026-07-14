import { os, ORPCError } from '@orpc/server'
import type { Context } from './context'

export const o = os.$context<Context>()

export const connection = o.handler(({ context }) => {
  console.log('Env bindings present:', !!context.env)
  return 'OK'
})

export const kv = o.handler(({ context }) => {
  if (!context.env.KV) throw new ORPCError('NOT_FOUND', { message: 'KV not found' })
  return 'OK'
})

export const db = o.handler(({ context }) => {
  if (!context.env.DB) throw new ORPCError('NOT_FOUND', { message: 'DB not found' })
  return 'OK'
})

export const r2 = o.handler(({ context }) => {
  if (!context.env.BUCKET) {
    throw new ORPCError('NOT_FOUND', { message: 'R2 bucket not configured' })
  }
  return 'OK'
})
