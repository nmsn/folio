import { parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'
import { sanitizeHtmlContent } from './sanitize'

export interface FulltextResult {
  title: string
  content: string
  excerpt: string
}

export async function extractFulltext(url: string): Promise<FulltextResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'folio/1.0 RSS Reader',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status}`)
  }

  const html = await response.text()
  const { document } = parseHTML(html)

  // Readability expects a document with a location; polyfill lightly
  Object.defineProperty(document, 'documentURI', { value: url })
  ;(document as unknown as { baseURI: string }).baseURI = url

  const reader = new Readability(document as unknown as Document)
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
