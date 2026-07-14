import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { DefaultFeedsSeed } from './seed/default-feeds'
import { startFeedScheduler } from './worker/feed-scheduler'
import { registerFeedProcessors } from './worker/feed-fetch.processor'
import { RssService } from './rss/rss.service'
import { ArticlesService } from './articles/articles.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // 开发期 CORS：允许 web 端 localhost:5173
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  })

  // 启动时执行 seed（幂等）
  try {
    const seeder = app.get(DefaultFeedsSeed)
    await seeder.run()
  } catch (err) {
    console.warn('[seed] failed (non-fatal):', err)
  }

  // 启动 pg-boss 调度 + 注册 feed-fetch processor
  // 让 API 进程在 dev 模式下也充当 worker（生产环境仍可拆出独立 worker 进程）
  try {
    await startFeedScheduler()
    const rssService = app.get(RssService)
    const articlesService = app.get(ArticlesService)
    registerFeedProcessors(rssService, articlesService)
    console.log('[worker] pg-boss started, feed-fetch processor registered')
  } catch (err) {
    console.warn('[worker] failed to start (non-fatal):', err)
  }

  const configService = app.get(ConfigService)
  const port = configService.get('PORT', 3000)
  await app.listen(port)
  console.log(`API running on port ${port}`)
}

export { bootstrap }
