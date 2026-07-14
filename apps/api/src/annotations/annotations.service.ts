import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { AnnotationsRepository } from './annotations.repository'
import { ReadingRepository } from '../reading/reading.repository'

@Injectable()
export class AnnotationsService {
  constructor(
    private annotations: AnnotationsRepository,
    private reading: ReadingRepository,
  ) {}

  async findByReadingItem(readingItemId: string, userId: string) {
    const readingItem = await this.reading.findById(readingItemId)
    if (!readingItem) throw new NotFoundException('Reading item not found')
    if ((readingItem as { user_id: string }).user_id !== userId) throw new ForbiddenException()

    return this.annotations.findByReadingItemId(readingItemId)
  }

  async create(
    userId: string,
    readingItemId: string,
    type: 'summary' | 'highlight' | 'question' | 'answer',
    content: string,
  ) {
    const readingItem = await this.reading.findById(readingItemId)
    if (!readingItem) throw new NotFoundException('Reading item not found')
    if ((readingItem as { user_id: string }).user_id !== userId) throw new ForbiddenException()

    const id = crypto.randomUUID()
    return this.annotations.create({ id, readingItemId, type, content })
  }

  async delete(id: string, userId: string) {
    const annotation = await this.annotations.findById(id)
    if (!annotation) throw new NotFoundException('Annotation not found')

    const readingItem = await this.reading.findById(
      (annotation as { reading_item_id: string }).reading_item_id,
    )
    if (!readingItem) throw new NotFoundException('Reading item not found')
    if ((readingItem as { user_id: string }).user_id !== userId) throw new ForbiddenException()

    return this.annotations.delete(id)
  }
}
