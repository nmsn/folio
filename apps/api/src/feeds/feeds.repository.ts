import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { nowSec } from '../database/now-sec'

@Injectable()
export class FeedsRepository {
  constructor(private db: DatabaseService) {}

  async findByUserId(userId: string | undefined) {
    if (!userId) {
      // 开发模式：未鉴权时返回全部订阅源（与 web 端 MOCK_USER bypass 配套）
      return this.db.query('SELECT * FROM rss_sources ORDER BY created_at DESC')
    }
    return this.db.query('SELECT * FROM rss_sources WHERE user_id = $1 ORDER BY created_at DESC', [
      userId,
    ])
  }

  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM rss_sources WHERE id = $1', [id])
  }

  async findByUrl(userId: string, url: string) {
    return this.db.queryOne('SELECT * FROM rss_sources WHERE user_id = $1 AND url = $2', [
      userId,
      url,
    ])
  }

  async create(
    userId: string,
    input: { name: string; url: string; description?: string; category?: string },
  ) {
    const id = crypto.randomUUID()
    const now = nowSec()
    await this.db.query(
      `INSERT INTO rss_sources (id, user_id, name, url, description, category, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)`,
      [
        id,
        userId,
        input.name,
        input.url,
        input.description || null,
        input.category || null,
        now,
        now,
      ],
    )
    return this.findById(id)
  }

  async update(
    id: string,
    input: { name?: string; description?: string; category?: string; isActive?: boolean },
  ) {
    const sets: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      sets.push(`name = $${paramIndex++}`)
      params.push(input.name)
    }
    if (input.description !== undefined) {
      sets.push(`description = $${paramIndex++}`)
      params.push(input.description)
    }
    if (input.category !== undefined) {
      sets.push(`category = $${paramIndex++}`)
      params.push(input.category)
    }
    if (input.isActive !== undefined) {
      sets.push(`is_active = $${paramIndex++}`)
      params.push(input.isActive)
    }

    if (sets.length === 0) return this.findById(id)

    sets.push(`updated_at = $${paramIndex++}`)
    params.push(nowSec())
    params.push(id)

    await this.db.query(
      `UPDATE rss_sources SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
      params,
    )
    return this.findById(id)
  }

  async delete(id: string) {
    await this.db.query('DELETE FROM rss_sources WHERE id = $1', [id])
  }

  async updateLastFetched(id: string, lastFetchedAt: Date) {
    // schema 用 integer + mode 'timestamp'，DB 存 unix 秒；Date 对象 pg 不会自动转 int
    const lastFetchedSec = Math.floor(lastFetchedAt.getTime() / 1000)
    const nowSec = Math.floor(Date.now() / 1000)
    await this.db.query(
      'UPDATE rss_sources SET last_fetched_at = $1, updated_at = $2 WHERE id = $3',
      [lastFetchedSec, nowSec, id],
    )
  }
}
