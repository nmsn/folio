import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { RPCHandler } from '@orpc/server/fetch'
import { onError } from '@orpc/server'
import { appRouter, createAuth } from '@folio/api'
import { createContext } from '@folio/api/context'
import type { CloudflareEnv } from '@folio/api/env'
import { handleQueueBatch, type QueueMessage } from './workers/queue'
import { runFeedScheduler } from './workers/scheduled/feed-scheduler'

const app = new Hono<{ Bindings: CloudflareEnv }>()

app.use('*', logger())

app.use(
  '/*',
  cors({
    origin: (origin) => {
      const allowed = ((env as CloudflareEnv).CORS_ORIGIN ||
        'http://localhost:5173,http://localhost:3000')
        .split(',')
        .map((o) => o.trim())
      if (!origin) return allowed[0] || '*'
      return allowed.includes(origin) ? origin : allowed[0] || ''
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['set-auth-token'],
    credentials: true,
  }),
)

app.on(['POST', 'GET'], '/api/auth/*', (c) => {
  const auth = createAuth(c.env)
  return auth.handler(c.req.raw)
})

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error: unknown) => {
      console.error(error)
    }),
  ],
})

app.use('/rpc/*', async (c, next) => {
  const context = await createContext(c)
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/rpc',
    context,
  })

  if (matched) {
    return c.newResponse(response.body, response)
  }

  await next()
})

app.get('/', (c) => c.text('folio api'))

export default {
  fetch: app.fetch,

  async queue(batch: MessageBatch<QueueMessage>, workerEnv: CloudflareEnv) {
    await handleQueueBatch(batch, workerEnv)
  },

  async scheduled(
    _controller: ScheduledController,
    workerEnv: CloudflareEnv,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(runFeedScheduler(workerEnv).then(() => undefined))
  },
}
