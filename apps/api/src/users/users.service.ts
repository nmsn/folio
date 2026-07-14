import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { SignUpInput } from '../auth/dto/auth.dto'
import { createHash, randomBytes } from 'crypto'
import { nowSec } from '../database/now-sec'

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async findByEmail(email: string) {
    return this.db.queryOne('SELECT * FROM users WHERE email = $1', [email])
  }

  async findById(id: string) {
    return this.db.queryOne('SELECT * FROM users WHERE id = $1', [id])
  }

  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    salt = salt || randomBytes(16).toString('hex')
    const hash = createHash('sha256')
      .update(password + salt)
      .digest('hex')
    return { hash, salt }
  }

  async create(input: SignUpInput) {
    const { hash, salt } = this.hashPassword(input.password)
    const id = randomBytes(16).toString('hex')
    const now = nowSec()
    await this.db.query(
      `INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, input.email, input.name, `${hash}:${salt}`, now, now],
    )
    return this.findById(id)
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const [hash, salt] = storedHash.split(':')
    const { hash: computed } = this.hashPassword(password, salt)
    return hash === computed
  }
}
