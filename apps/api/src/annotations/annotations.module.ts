import { Module } from '@nestjs/common'
import { AnnotationsService } from './annotations.service'
import { AnnotationsRepository } from './annotations.repository'
import { ReadingModule } from '../reading/reading.module'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule, ReadingModule],
  providers: [AnnotationsService, AnnotationsRepository],
  exports: [AnnotationsService],
})
export class AnnotationsModule {}
