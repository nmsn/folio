import { Module } from '@nestjs/common'
import { ReadingController } from './reading.controller'
import { ReadingService } from './reading.service'
import { ReadingRepository } from './reading.repository'
import { ArticlesModule } from '../articles/articles.module'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule, ArticlesModule],
  controllers: [ReadingController],
  providers: [ReadingService, ReadingRepository],
  exports: [ReadingRepository],
})
export class ReadingModule {}
