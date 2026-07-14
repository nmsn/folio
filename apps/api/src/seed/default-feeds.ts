import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'

/**
 * 默认数据 seed：mock user + 12 个默认 RSS 订阅源。
 * 启动时由 bootstrap 调用，幂等（重复启动不报错）。
 *
 * URL 已通过 rss-parser 实际解析验证可拉到 articles（见 /tmp/test-feeds*.mjs）。
 * 分类用于 web 端按类别聚合展示。
 *
 * 与 web 端 apps/web/src/app.tsx 中的 MOCK_USER（id='1', email='test@test.com'）
 * 对齐，使 web 端直接看到这些默认订阅源。
 */
@Injectable()
export class DefaultFeedsSeed {
  private readonly logger = new Logger(DefaultFeedsSeed.name)

  constructor(private db: DatabaseService) {}

  async run() {
    await this.ensureMockUser()
    await this.ensureDefaultFeeds()
  }

  private async ensureMockUser() {
    const existing = await this.db.queryOne('SELECT id FROM users WHERE id = $1', ['1'])
    if (existing) return

    const now = Math.floor(Date.now() / 1000)
    await this.db.query(
      `INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['1', 'test@test.com', 'Demo User', null, now, now],
    )
    this.logger.log('Seeded mock user (id=1, email=test@test.com)')
  }

  private async ensureDefaultFeeds() {
    const defaults: Array<{
      name: string
      url: string
      description: string
      category: string
    }> = [
      // ── Tech News ───────────────────────────────────────────────
      {
        name: 'Hacker News',
        url: 'https://hnrss.org/frontpage',
        description: 'Hacker News 首页热门（hnrss 镜像）',
        category: 'Tech News',
      },
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        description: '初创公司、产品发布、科技商业新闻',
        category: 'Tech News',
      },
      {
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        description: '消费科技、文化与未来趋势',
        category: 'Tech News',
      },
      {
        name: 'Ars Technica',
        url: 'https://feeds.arstechnica.com/arstechnica/index',
        description: '深度技术报道与评测',
        category: 'Tech News',
      },
      {
        name: 'Wired',
        url: 'https://www.wired.com/feed/rss',
        description: '科技、文化、商业与设计',
        category: 'Tech News',
      },

      // ── Tech Community ──────────────────────────────────────────
      {
        name: 'Lobsters',
        url: 'https://lobste.rs/rss',
        description: '面向技术从业者的邀请制社区',
        category: 'Community',
      },

      // ── Engineering Blogs ───────────────────────────────────────
      {
        name: 'GitHub Engineering',
        url: 'https://github.blog/engineering/feed/',
        description: 'GitHub 工程团队的实践与架构',
        category: 'Engineering',
      },
      {
        name: 'Cloudflare Blog',
        url: 'https://blog.cloudflare.com/rss/',
        description: '网络、安全、性能、协议与工程实践',
        category: 'Engineering',
      },

      // ── AI / ML ─────────────────────────────────────────────────
      {
        name: 'OpenAI News',
        url: 'https://openai.com/news/rss.xml',
        description: 'OpenAI 官方动态、模型与产品发布',
        category: 'AI',
      },
      {
        name: "Simon Willison's Weblog",
        url: 'https://simonwillison.net/atom/everything/',
        description: 'LLM、AI 工具与开发者视角的深度评论',
        category: 'AI',
      },

      // ── Strategy / Analysis ─────────────────────────────────────
      {
        name: 'Stratechery',
        url: 'https://stratechery.com/feed/',
        description: 'Ben Thompson 的科技与商业战略分析',
        category: 'Analysis',
      },

      // ── Security ────────────────────────────────────────────────
      {
        name: 'Krebs on Security',
        url: 'https://krebsonsecurity.com/feed/',
        description: '调查性网络安全报道',
        category: 'Security',
      },
    ]

    const now = Math.floor(Date.now() / 1000)
    let inserted = 0
    let skipped = 0
    for (const feed of defaults) {
      // upsert by url —— 同 user 已有该 url 则跳过，避免重复
      const existing = await this.db.queryOne(
        'SELECT id FROM rss_sources WHERE user_id = $1 AND url = $2',
        ['1', feed.url],
      )
      if (existing) {
        skipped++
        continue
      }

      const id = crypto.randomUUID()
      await this.db.query(
        `INSERT INTO rss_sources
           (id, user_id, name, url, description, category, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'true', $7, $8)`,
        [id, '1', feed.name, feed.url, feed.description, feed.category, now, now],
      )
      inserted++
    }
    if (inserted > 0) {
      this.logger.log(`Default feeds: ${inserted} inserted, ${skipped} already present`)
    } else {
      this.logger.log(`Default feeds: all ${defaults.length} already present (no-op)`)
    }
  }
}
