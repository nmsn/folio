import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { nowSec, toUnixSeconds } from '../database/now-sec'
import type { Cursor } from '@folio/shared'

@Injectable()
export class ArticlesRepository {
  constructor(private db: DatabaseService) {}

  /**
   * Find articles with cursor-based pagination
   * Uses compound cursor (id, publishedAt) for stable ordering
   */
  async findWithCursor(sourceId: string | undefined, cursor: Cursor | undefined, limit: number) {
    if (!sourceId) {
      // No source filter - use global article list
      if (!cursor) {
        return this.db.query(
          'SELECT * FROM articles ORDER BY published_at DESC, id DESC LIMIT $1',
          [limit + 1], // Fetch one extra to check if there are more
        )
      }
      return this.db.query(
        `SELECT * FROM articles
         WHERE (published_at < $1 OR (published_at = $1 AND id < $2))
         ORDER BY published_at DESC, id DESC
         LIMIT $3`,
        [toUnixSeconds(cursor.publishedAt), cursor.id, limit + 1],
      )
    }

    // With source filter
    if (!cursor) {
      return this.db.query(
        'SELECT * FROM articles WHERE source_id = $1 ORDER BY published_at DESC, id DESC LIMIT $2',
        [sourceId, limit + 1],
      )
    }

    return this.db.query(
      `SELECT * FROM articles
       WHERE source_id = $1
         AND (published_at < $2 OR (published_at = $2 AND id < $3))
       ORDER BY published_at DESC, id DESC
       LIMIT $4`,
      [sourceId, toUnixSeconds(cursor.publishedAt), cursor.id, limit + 1],
    )
  }

  async findBySourceId(sourceId: string, limit = 20, offset = 0) {
    return this.db.query(
      'SELECT * FROM articles WHERE source_id = $1 ORDER BY published_at DESC LIMIT $2 OFFSET $3',
      [sourceId, limit, offset],
    )
  }

  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM articles WHERE id = $1', [id])
  }

  async findByLink(link: string) {
    // schema 没有 guid 列，用 link 去重
    return this.db.queryOne('SELECT * FROM articles WHERE url = $1', [link])
  }

  async create(article: {
    id: string
    sourceId: string
    title: string
    url: string
    author?: string
    description?: string
    content?: string
    imageUrl?: string
    publishedAt: Date
  }) {
    // schema 用 integer + mode 'timestamp'，DB 存 unix 秒；Date 对象 pg 不会自动转 int
    const publishedSec = Math.floor(article.publishedAt.getTime() / 1000)
    const nowSec = Math.floor(Date.now() / 1000)
    await this.db.query(
      `INSERT INTO articles (id, source_id, title, url, author, description, content, image_url, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        article.id,
        article.sourceId,
        article.title,
        article.url,
        article.author || null,
        article.description || null,
        article.content || null,
        article.imageUrl || null,
        publishedSec,
        nowSec,
        nowSec,
      ],
    )
    return this.findById(article.id)
  }

  async updateContent(id: string, content: string) {
    const nowSec = Math.floor(Date.now() / 1000)
    await this.db.query('UPDATE articles SET content = $1, updated_at = $2 WHERE id = $3', [
      content,
      nowSec,
      id,
    ])
  }
}
