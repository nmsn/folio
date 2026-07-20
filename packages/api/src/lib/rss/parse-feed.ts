import { XMLParser } from 'fast-xml-parser'
import { sanitizeHtmlContent } from './sanitize'

export interface ParsedArticle {
  guid?: string
  link?: string
  title: string
  author?: string
  description?: string
  content?: string
  pubDate?: Date
  imageUrl?: string
}

export interface ParsedFeed {
  title: string
  description?: string
  feedUrl: string
  siteUrl?: string
  iconUrl?: string
  articles: ParsedArticle[]
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['item', 'entry'].includes(name),
})

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function textOf(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node === 'object' && node !== null && '#text' in node) {
    return String((node as Record<string, unknown>)['#text'] ?? '')
  }
  return ''
}

function attr(node: unknown, name: string): string | undefined {
  if (!node || typeof node !== 'object') return undefined
  const v = (node as Record<string, unknown>)[`@_${name}`]
  return typeof v === 'string' ? v : undefined
}

export function parseFeed(xml: string, feedUrl: string): ParsedFeed {
  const doc = parser.parse(xml) as Record<string, unknown>

  // RSS 2.0
  const rss = doc.rss as Record<string, unknown> | undefined
  if (rss?.channel) {
    const channel = rss.channel as Record<string, unknown>
    const items = asArray(channel.item)
    const articles: ParsedArticle[] = items.map((item) => {
      const row = item as Record<string, unknown>
      const mediaThumb = row['media:thumbnail']
      const mediaContent = row['media:content']
      const itunesImage = row['itunes:image']

      let imageUrl =
        attr(mediaThumb, 'url') ||
        attr(mediaContent, 'url') ||
        attr(itunesImage, 'href') ||
        undefined

      const contentEncoded = textOf(row['content:encoded'])
      const description = textOf(row.description)
      const link = textOf(row.link) || attr(row.link, 'href')
      const guid = textOf(row.guid) || link

      return {
        guid,
        link,
        title: textOf(row.title) || 'Untitled',
        author: textOf(row['dc:creator']) || textOf(row.author) || undefined,
        description: description || undefined,
        content: sanitizeHtmlContent(contentEncoded || description || ''),
        pubDate: textOf(row.pubDate) ? new Date(textOf(row.pubDate)) : undefined,
        imageUrl,
      }
    })

    const image = channel.image as Record<string, unknown> | undefined

    return {
      title: textOf(channel.title) || 'Untitled Feed',
      description: textOf(channel.description) || undefined,
      feedUrl,
      siteUrl: textOf(channel.link) || undefined,
      iconUrl: image ? textOf(image.url) || undefined : undefined,
      articles,
    }
  }

  // Atom
  const feed = doc.feed as Record<string, unknown> | undefined
  if (feed) {
    const entries = asArray(feed.entry)
    const articles: ParsedArticle[] = entries.map((entry) => {
      const row = entry as Record<string, unknown>
      const links = asArray(row.link)
      const alt = links.find((l) => !attr(l, 'rel') || attr(l, 'rel') === 'alternate')
      const link = attr(alt || links[0], 'href')
      const content = textOf(row.content) || textOf(row.summary)

      return {
        guid: textOf(row.id) || link,
        link,
        title: textOf(row.title) || 'Untitled',
        author: textOf((row.author as Record<string, unknown> | undefined)?.name) || undefined,
        description: textOf(row.summary) || undefined,
        content: sanitizeHtmlContent(content),
        pubDate: textOf(row.updated || row.published)
          ? new Date(textOf(row.updated || row.published))
          : undefined,
      }
    })

    const links = asArray(feed.link)
    const self = links.find((l) => attr(l, 'rel') === 'self')
    const alt = links.find((l) => !attr(l, 'rel') || attr(l, 'rel') === 'alternate')

    return {
      title: textOf(feed.title) || 'Untitled Feed',
      description: textOf(feed.subtitle) || undefined,
      feedUrl: attr(self, 'href') || feedUrl,
      siteUrl: attr(alt, 'href'),
      articles,
    }
  }

  throw new Error('Unrecognized feed format')
}
