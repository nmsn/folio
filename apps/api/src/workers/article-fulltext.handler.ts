import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { articles } from '@folio/db'
import type { CloudflareEnv } from '@folio/api/env'
import { extractFulltext } from '../rss/extract-fulltext'

export type ArticleFulltextMessage = {
  type: 'article.fulltext-fetch'
  articleId: string
  url: string
}

export async function handleArticleFulltext(
  env: CloudflareEnv,
  message: ArticleFulltextMessage,
) {
  const { articleId, url } = message
  console.log(`Fetching fulltext for article: ${articleId}`)

  const result = await extractFulltext(url)
  const db = drizzle(env.DB)
  await db
    .update(articles)
    .set({ content: result.content, updatedAt: new Date() })
    .where(eq(articles.id, articleId))

  console.log(`Fulltext fetched for article: ${articleId}`)
  return result
}
