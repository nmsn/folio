import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { nowSec } from '../database/now-sec'

@Injectable()
export class AnnotationsRepository {
  constructor(private db: DatabaseService) {}

  async findByReadingItemId(readingItemId: string) {
    return this.db.query(
      'SELECT * FROM ai_annotations WHERE reading_item_id = $1 ORDER BY created_at ASC',
      [readingItemId],
    )
  }

  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM ai_annotations WHERE id = $1', [id])
  }

  async create(annotation: { id: string; readingItemId: string; type: string; content: string }) {
    const now = nowSec()
    await this.db.query(
      `INSERT INTO ai_annotations (id, reading_item_id, type, content, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [annotation.id, annotation.readingItemId, annotation.type, annotation.content, now],
    )
    return this.findById(annotation.id)
  }

  async delete(id: string) {
    await this.db.query('DELETE FROM ai_annotations WHERE id = $1', [id])
  }
}
