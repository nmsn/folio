import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticlesRepository } from './articles.repository';
import { RssService } from '../rss/rss.service';
import { createPaginatedResponse, type Cursor } from '@folio/shared';

@Injectable()
export class ArticlesService {
  constructor(
    private articles: ArticlesRepository,
    private rss: RssService
  ) {}

  async findBySourceId(sourceId: string, limit = 20, offset = 0) {
    return this.articles.findBySourceId(sourceId, limit, offset);
  }

  /**
   * Get articles with cursor-based pagination
   */
  async findWithCursor(
    sourceId: string | undefined,
    cursor: Cursor | undefined,
    limit: number
  ) {
    const rows = await this.articles.findWithCursor(sourceId, cursor, limit);

    // Check if there are more results
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;

    // Get next cursor from last item
    const nextCursor: Cursor | undefined = hasMore && items.length > 0
      ? {
          id: items[items.length - 1].id as string,
          publishedAt: items[items.length - 1].published_at as string,
        }
      : undefined;

    return createPaginatedResponse(items, hasMore, nextCursor);
  }

  async findOne(id: string) {
    const article = await this.articles.findById(id);
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async refreshFeed(feedId: string) {
    const parsedFeed = await this.rss.fetchAndParseFeed(feedId);
    const newArticles: unknown[] = [];

    for (const article of parsedFeed.articles) {
      const link = article.link || article.guid;
      if (!link) continue;

      const existing = await this.articles.findByLink(link);
      if (existing) continue;

      const id = crypto.randomUUID();
      const newArticle = await this.articles.create({
        id,
        sourceId: feedId,
        title: article.title,
        url: link,
        author: article.author,
        description: article.description,
        content: article.content,
        imageUrl: article.imageUrl,
        publishedAt: article.pubDate || new Date(),
      });
      newArticles.push(newArticle);
    }

    return { feed: parsedFeed, newArticles };
  }
}