import { Module } from '@nestjs/common'
import { RssService } from './rss.service'
import { FeedsModule } from '../feeds/feeds.module'

@Module({
  imports: [FeedsModule],
  providers: [RssService],
  exports: [RssService],
})
export class RssModule {}
