import alchemy from 'alchemy'
import { Exec } from 'alchemy/os'
import {
  AccountId,
  D1Database,
  KVNamespace,
  Queue,
  R2Bucket,
  Worker,
} from 'alchemy/cloudflare'
import { CloudflareStateStore } from 'alchemy/state'

const accountId = await AccountId()
console.log('Your Cloudflare Account ID is:', accountId)

// Use CloudflareStateStore only if CLOUDFLARE_API_TOKEN is present (e.g. CI).
const stateStore = process.env.CLOUDFLARE_API_TOKEN
  ? (scope: any) => new CloudflareStateStore(scope, { forceUpdate: true })
  : undefined

const PROJECT_NAME = 'folio'

const app = await alchemy(`${PROJECT_NAME}-api`, {
  stateStore,
})

const KV = await KVNamespace('KV', {
  title: `${app.name}-kv-${app.stage}`,
  adopt: true,
})

await Exec('db-generate', {
  cwd: '../../packages/db',
  command: 'pnpm run generate',
})

const DB = await D1Database('DB', {
  name: `${app.name}-db-${app.stage}`,
  migrationsDir: '../../packages/db/migrations/',
  jurisdiction: 'default',
  adopt: true,
})

const FEED_QUEUE = await Queue('FEED_QUEUE', {
  name: `${app.name}-feed-${app.stage}`,
  adopt: true,
})

const FULLTEXT_QUEUE = await Queue('FULLTEXT_QUEUE', {
  name: `${app.name}-fulltext-${app.stage}`,
  adopt: true,
})

const AI_QUEUE = await Queue('AI_QUEUE', {
  name: `${app.name}-ai-${app.stage}`,
  adopt: true,
})

const hasR2Keys = !!process.env.R2_ACCESS_KEY_ID && !!process.env.R2_SECRET_ACCESS_KEY

const bucketName = `${app.name}-bucket-${app.stage}`

const BUCKET = await R2Bucket('BUCKET', {
  name: bucketName,
  locationHint: 'apac',
  devDomain: true,
  dev: {
    remote: true,
  },
  cors: [
    {
      allowed: {
        origins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
          .split(',')
          .map((o) => o.trim()),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        headers: ['*'],
      },
    },
  ],
  delete: false,
  empty: false,
  adopt: true,
})

if (hasR2Keys) {
  console.log('Your Bucket dev domain: ' + BUCKET.devDomain)
}

export const server = await Worker('server', {
  name: `${app.name}-${app.stage}`,
  entrypoint: 'src/index.ts',
  compatibility: 'node',
  compatibilityFlags: ['enable_request_signal'],
  // Refresh feeds every 15 minutes
  crons: ['*/15 * * * *'],
  eventSources: [FEED_QUEUE, FULLTEXT_QUEUE, AI_QUEUE],
  bindings: {
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000',
    ANTHROPIC_API_KEY: alchemy.secret(process.env.ANTHROPIC_API_KEY || ''),
    R2_PUBLIC_DOMAIN: BUCKET.devDomain || process.env.R2_PUBLIC_DOMAIN || '',
    KV,
    DB,
    FEED_QUEUE,
    FULLTEXT_QUEUE,
    AI_QUEUE,
    ...(hasR2Keys
      ? {
          BUCKET,
          R2_ACCOUNT_ID: accountId,
          R2_BUCKET_NAME: bucketName,
          R2_ACCESS_KEY_ID: alchemy.secret(process.env.R2_ACCESS_KEY_ID!),
          R2_SECRET_ACCESS_KEY: alchemy.secret(process.env.R2_SECRET_ACCESS_KEY!),
        }
      : {}),
  },
  dev: {
    port: 4000,
  },
  adopt: true,
})

console.log({ server: server.url })

await app.finalize()
