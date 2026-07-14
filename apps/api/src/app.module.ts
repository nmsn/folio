import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { DatabaseModule } from './database/database.module'
import { FeedsModule } from './feeds/feeds.module'
import { ArticlesModule } from './articles/articles.module'
import { RssModule } from './rss/rss.module'
import { ReadingModule } from './reading/reading.module'
import { AnnotationsModule } from './annotations/annotations.module'
import { AiModule } from './ai/ai.module'
import { SeedModule } from './seed/seed.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    FeedsModule,
    ArticlesModule,
    RssModule,
    ReadingModule,
    AnnotationsModule,
    AiModule,
    SeedModule,
  ],
})
export class AppModule {}
