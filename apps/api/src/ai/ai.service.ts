import { Injectable, NotFoundException } from '@nestjs/common'
import {
  ClaudeClient,
  AISummarizeResult,
  AIAnswerResult,
  AIFilterResult,
} from './clients/claude.client'
import { ArticlesRepository } from '../articles/articles.repository'
import { ReadingRepository } from '../reading/reading.repository'
import { AnnotationsService } from '../annotations/annotations.service'
import { boss } from '../worker/feed-scheduler'

@Injectable()
export class AiService {
  private claudeClient: ClaudeClient

  constructor(
    private articles: ArticlesRepository,
    private reading: ReadingRepository,
    private annotations: AnnotationsService,
  ) {
    this.claudeClient = new ClaudeClient()
  }

  async summarizeArticle(articleId: string, userId: string): Promise<{ jobId: string }> {
    const article = await this.articles.findById(articleId)
    if (!article) throw new NotFoundException('Article not found')

    const readingItem = await this.reading.findByUserAndArticle(userId, articleId)
    if (!readingItem) throw new NotFoundException('Article not in reading list')

    const jobId = await boss.send('ai.summarize', { articleId, userId })
    return { jobId }
  }

  async answerQuestion(
    articleId: string,
    userId: string,
    question: string,
  ): Promise<AIAnswerResult> {
    const article = await this.articles.findById(articleId)
    if (!article) throw new NotFoundException('Article not found')

    const content = (article as { content?: string }).content || ''
    const result = await this.claudeClient.answer(content, question)

    const readingItem = await this.reading.findByUserAndArticle(userId, articleId)
    if (readingItem) {
      await this.annotations.create(userId, readingItem.id, 'answer', result.answer)
    }

    return result
  }

  async filterArticle(articleId: string, userPreferences?: string): Promise<AIFilterResult> {
    const article = await this.articles.findById(articleId)
    if (!article) throw new NotFoundException('Article not found')

    const content = (article as { description?: string; content?: string }).description || ''
    return this.claudeClient.filter(content, userPreferences)
  }
}
