import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import { sanitizeHtmlContent } from './sanitize'
import got from 'got'

export interface FulltextResult {
  title: string
  content: string
  excerpt: string
}

export async function extractFulltext(url: string): Promise<FulltextResult> {
  const response = await got(url, {
    headers: {
      'User-Agent': 'folio/1.0 RSS Reader',
      Accept: 'text/html',
    },
    timeout: { request: 30000 },
    throwHttpErrors: false,
  })

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch article: ${response.statusCode}`)
  }

  const dom = new JSDOM(response.body, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Failed to extract content')
  }

  return {
    title: article.title || 'Untitled',
    content: sanitizeHtmlContent(article.content || ''),
    excerpt: article.excerpt || article.textContent?.slice(0, 200) || '',
  }
}
