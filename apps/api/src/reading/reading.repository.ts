import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { nowSec } from '../database/now-sec'

@Injectable()
export class ReadingRepository {
  constructor(private db: DatabaseService) {}

  async findByUserId(userId: string, limit = 50, offset = 0) {
    return this.db.query(
      `SELECT ri.*, a.title, a.url, a.description, a.image_url, a.published_at
       FROM reading_items ri
       JOIN articles a ON a.id = ri.article_id
       WHERE ri.user_id = $1
       ORDER BY ri.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    )
  }

  async findByUserAndStatus(userId: string, status: string, limit = 50, offset = 0) {
    return this.db.query(
      `SELECT ri.*, a.title, a.url, a.description, a.image_url, a.published_at
       FROM reading_items ri
       JOIN articles a ON a.id = ri.article_id
       WHERE ri.user_id = $1 AND ri.status = $2
       ORDER BY ri.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, status, limit, offset],
    )
  }

  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM reading_items WHERE id = $1', [id])
  }

  async findByUserAndArticle(userId: string, articleId: string) {
    return this.db.queryOne('SELECT * FROM reading_items WHERE user_id = $1 AND article_id = $2', [
      userId,
      articleId,
    ])
  }

  async create(item: { id: string; userId: string; articleId: string; status: string }) {
    const now = nowSec()
    await this.db.query(
      `INSERT INTO reading_items (id, user_id, article_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [item.id, item.userId, item.articleId, item.status, now, now],
    )
    return this.findById(item.id)
  }

  async update(id: string, input: { status?: string; progress?: number }) {
    const sets: string[] = []
    const params: unknown[] = []
    let i = 1

    if (input.status !== undefined) {
      sets.push(`status = $${i++}`)
      params.push(input.status)
    }
    if (input.progress !== undefined) {
      sets.push(`progress = $${i++}`)
      params.push(Math.floor(input.progress * 100))
    }

    if (sets.length === 0) return this.findById(id)

    sets.push(`updated_at = $${i++}`)
    params.push(nowSec())
    params.push(id)

    await this.db.query(`UPDATE reading_items SET ${sets.join(', ')} WHERE id = $${i}`, params)
    return this.findById(id)
  }

  async delete(id: string) {
    await this.db.query('DELETE FROM reading_items WHERE id = $1', [id])
  }
}
