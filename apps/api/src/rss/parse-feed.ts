import Parser from 'rss-parser'
import { sanitizeHtmlContent } from './sanitize'

const parser = new Parser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['itunes:image', 'itunesImage'],
    ],
  },
})

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

export async function parseFeed(xml: string, feedUrl: string): Promise<ParsedFeed> {
  const feed = await parser.parseString(xml)

  const articles: ParsedArticle[] = feed.items.map((item) => {
    let imageUrl: string | undefined

    if (item.mediaThumbnail) {
      imageUrl =
        typeof item.mediaThumbnail === 'string'
          ? item.mediaThumbnail
          : (item.mediaThumbnail as { $?: { url: string } })?.$?.url
    } else if (item.mediaContent) {
      imageUrl =
        typeof item.mediaContent === 'string'
          ? item.mediaContent
          : (item.mediaContent as { $?: { url: string } })?.$?.url
    } else if (item.itunesImage) {
      imageUrl =
        typeof item.itunesImage === 'string'
          ? item.itunesImage
          : (item.itunesImage as { $?: { href: string } })?.$?.href
    }

    return {
      guid: item.guid || item.link,
      link: item.link,
      title: item.title || 'Untitled',
      author: item.creator || item.author,
      description: item.contentSnippet,
      content: sanitizeHtmlContent(
        item.content || ((item as Record<string, unknown>)['content:encoded'] as string) || '',
      ),
      pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
      imageUrl,
    }
  })

  return {
    title: feed.title || 'Untitled Feed',
    description: feed.description,
    feedUrl: feed.feedUrl || feedUrl,
    siteUrl: feed.link,
    iconUrl: feed.image?.url,
    articles,
  }
}
