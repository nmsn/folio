import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { DatabaseService } from '../database/database.service'
import { SignUpInput, SignInInput } from './dto/auth.dto'
import { randomBytes } from 'crypto'
import { nowSec } from '../database/now-sec'

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private db: DatabaseService,
  ) {}

  async signUp(input: SignUpInput) {
    const existing = await this.users.findByEmail(input.email)
    if (existing) {
      throw new UnauthorizedException('Email already in use')
    }
    return this.users.create(input)
  }

  async signIn(input: SignInInput) {
    const user = await this.users.findByEmail(input.email)
    if (!user || !('password_hash' in user)) {
      throw new UnauthorizedException('Invalid credentials')
    }
    const valid = this.users.verifyPassword(input.password, user.password_hash as string)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials')
    }
    return user
  }

  async createSession(userId: string) {
    const id = randomBytes(32).toString('hex')
    const now = nowSec()
    const expiresAt = now + 30 * 24 * 60 * 60 // 30 days
    await this.db.query(
      'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)',
      [id, userId, expiresAt, now],
    )
    return { sessionId: id, expiresAt: new Date(expiresAt * 1000) }
  }

  async validateSession(sessionId: string) {
    // expires_at 是 integer (unix 秒)，不能直接 NOW() 比较；改用 nowSec() 传参
    const session = await this.db.queryOne(
      'SELECT * FROM sessions WHERE id = $1 AND expires_at > $2',
      [sessionId, nowSec()],
    )
    if (!session) return null
    return this.users.findById((session as { user_id: string }).user_id)
  }
}
