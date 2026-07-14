import 'reflect-metadata'
import { startFeedScheduler } from './feed-scheduler'
import { registerFeedProcessors } from './feed-fetch.processor'

// Worker entry point - runs separately from the main API
async function startWorker() {
  console.log('Starting folio worker...')

  const boss = await startFeedScheduler()

  // Register processors - these would need actual service instances
  // In production, use a separate worker process with DI

  console.log('folio worker started')

  // Keep process running
  process.on('SIGTERM', async () => {
    console.log('Stopping worker...')
    await boss.stop()
    process.exit(0)
  })
}

startWorker().catch(console.error)
