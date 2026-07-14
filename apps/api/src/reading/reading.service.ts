import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common'
import { ReadingRepository } from './reading.repository'
import { ArticlesRepository } from '../articles/articles.repository'
import { CreateReadingItemInput, UpdateReadingItemInput } from './dto/create-reading-item.dto'

@Injectable()
export class ReadingService {
  constructor(
    private reading: ReadingRepository,
    private articles: ArticlesRepository,
  ) {}

  async findAll(userId: string, limit = 50, offset = 0) {
    return this.reading.findByUserId(userId, limit, offset)
  }

  async findByStatus(userId: string, status: string, limit = 50, offset = 0) {
    return this.reading.findByUserAndStatus(userId, status, limit, offset)
  }

  async findOne(id: string, userId: string) {
    const item = await this.reading.findById(id)
    if (!item) throw new NotFoundException('Reading item not found')
    if ((item as { user_id: string }).user_id !== userId) throw new ForbiddenException()
    return item
  }

  async create(userId: string, input: CreateReadingItemInput) {
    const article = await this.articles.findById(input.articleId)
    if (!article) throw new NotFoundException('Article not found')

    const existing = await this.reading.findByUserAndArticle(userId, input.articleId)
    if (existing) throw new ConflictException('Article already in reading list')

    const id = crypto.randomUUID()
    return this.reading.create({ id, userId, articleId: input.articleId, status: 'unread' })
  }

  async update(id: string, userId: string, input: UpdateReadingItemInput) {
    await this.findOne(id, userId)
    return this.reading.update(id, input)
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId)
    return this.reading.delete(id)
  }

  async markAsRead(id: string, userId: string) {
    return this.update(id, userId, { status: 'read', progress: 1 })
  }

  async markAsSaved(id: string, userId: string) {
    return this.update(id, userId, { status: 'saved' })
  }
}
