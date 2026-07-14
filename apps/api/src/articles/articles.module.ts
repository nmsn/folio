import { Module } from '@nestjs/common'
import { ArticlesController } from './articles.controller'
import { ArticlesService } from './articles.service'
import { ArticlesRepository } from './articles.repository'
import { RssModule } from '../rss/rss.module'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule, RssModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticlesRepository],
  exports: [ArticlesRepository],
})
export class ArticlesModule {}
