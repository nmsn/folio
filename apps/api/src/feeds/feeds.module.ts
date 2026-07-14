import { Module } from '@nestjs/common'
import { FeedsController } from './feeds.controller'
import { FeedsService } from './feeds.service'
import { FeedsRepository } from './feeds.repository'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [FeedsController],
  providers: [FeedsService, FeedsRepository],
  exports: [FeedsRepository],
})
export class FeedsModule {}
