import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { DefaultFeedsSeed } from './default-feeds'

@Module({
  imports: [DatabaseModule],
  providers: [DefaultFeedsSeed],
})
export class SeedModule {}
