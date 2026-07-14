import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FeedsRepository } from './feeds.repository';
import { CreateFeedInput, UpdateFeedInput } from './dto/create-feed.dto';
import { parseOPML, generateOPML, extractFeedUrls, type OPML } from '@folio/shared';

@Injectable()
export class FeedsService {
  constructor(private feeds: FeedsRepository) {}

  async findAll(userId: string) {
    return this.feeds.findByUserId(userId);
  }

  async findOne(id: string, userId: string) {
    const feed = await this.feeds.findById(id);
    if (!feed) throw new NotFoundException('Feed not found');
    // 开发模式：未鉴权时跳过 ownership check（与 findByUserId 的 dev bypass 配套）
    if (userId === undefined) return feed;
    if ((feed as { user_id: string }).user_id !== userId) throw new ForbiddenException();
    return feed;
  }

  async create(userId: string, input: CreateFeedInput) {
    return this.feeds.create(userId, input);
  }

  async update(id: string, userId: string, input: UpdateFeedInput) {
    await this.findOne(id, userId);
    return this.feeds.update(id, input);
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.feeds.delete(id);
  }

  async enqueueRefresh(id: string, userId: string) {
    await this.findOne(id, userId); // validates ownership
    // Import boss dynamically to avoid circular dependencies
    const { boss } = await import('../worker/feed-scheduler');
    await boss.send('feed.fetch', { feedId: id });
    return { success: true };
  }

  /**
   * Export all feeds to OPML format
   */
  async exportToOPML(userId: string): Promise<string> {
    const feeds = await this.feeds.findByUserId(userId);

    const opml: OPML = {
      version: '2.0',
      head: {
        title: 'folio Subscriptions',
        dateCreated: new Date().toUTCString(),
      },
      body: feeds.map((feed: Record<string, unknown>) => ({
        text: feed.name as string || '',
        title: feed.name as string,
        type: 'rss',
        xmlUrl: feed.url as string,
        htmlUrl: feed.description as string || undefined,
        category: feed.category as string || undefined,
      })),
    };

    return generateOPML(opml);
  }

  /**
   * Import feeds from OPML format
   * Returns the number of feeds imported and any errors
   */
  async importFromOPML(userId: string, opmlXml: string): Promise<{
    imported: number;
    failed: number;
    errors: Array<{ url: string; error: string }>;
    feeds: Array<{ name: string; url: string; id: string }>;
  }> {
    let opml: OPML;
    try {
      opml = parseOPML(opmlXml);
    } catch {
      throw new BadRequestException('Invalid OPML format');
    }

    const feedUrls = extractFeedUrls(opml);
    const results = {
      imported: 0,
      failed: 0,
      errors: [] as Array<{ url: string; error: string }>,
      feeds: [] as Array<{ name: string; url: string; id: string }>,
    };

    for (const feedInfo of feedUrls) {
      try {
        // Check if feed already exists for this user
        const existing = await this.feeds.findByUrl(userId, feedInfo.url);
        if (existing) {
          results.feeds.push({
            name: existing.name as string,
            url: existing.url as string,
            id: existing.id as string,
          });
          results.imported++;
          continue;
        }

        // Create new feed
        const feed = await this.feeds.create(userId, {
          name: feedInfo.text || feedInfo.url,
          url: feedInfo.url,
          category: feedInfo.category,
        });
        results.feeds.push({
          name: feed.name as string,
          url: feed.url as string,
          id: feed.id as string,
        });
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          url: feedInfo.url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}