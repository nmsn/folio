import type { CloudflareEnv } from './src/env'

export type { CloudflareEnv }

declare global {
  type Env = CloudflareEnv
}

declare module 'cloudflare:workers' {
  namespace Cloudflare {
    export interface Env extends CloudflareEnv {}
  }
}
