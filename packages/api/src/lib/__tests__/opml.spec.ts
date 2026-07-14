import { describe, it, expect } from 'vitest'
import {
  parseOPML,
  generateOPML,
  extractFeedUrls,
  OPMLOutlineSchema,
} from '../opml'

describe('OPML Schema Validation', () => {
  it('should validate a correct OPML outline', () => {
    const outline = {
      text: 'Example Feed',
      title: 'Example Feed',
      type: 'rss',
      xmlUrl: 'https://example.com/feed.xml',
      htmlUrl: 'https://example.com',
    }
    expect(() => OPMLOutlineSchema.parse(outline)).not.toThrow()
  })

  it('should validate minimal outline with just text', () => {
    const result = OPMLOutlineSchema.parse({ text: 'Minimal Feed' })
    expect(result.text).toBe('Minimal Feed')
    expect(result.xmlUrl).toBeUndefined()
  })
})

describe('parseOPML', () => {
  it('should parse a valid OPML 2.0 document', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Test Subscriptions</title>
  </head>
  <body>
    <outline text="Example" title="Example" type="rss" xmlUrl="https://example.com/feed.xml" />
  </body>
</opml>`

    const opml = parseOPML(xml)
    expect(opml.head.title).toBe('Test Subscriptions')
    expect(opml.body).toHaveLength(1)
    expect(opml.body[0].xmlUrl).toBe('https://example.com/feed.xml')
  })
})

describe('generateOPML + extractFeedUrls', () => {
  it('round-trips feeds', () => {
    const xml = generateOPML({
      version: '2.0',
      head: { title: 'folio Subscriptions' },
      body: [
        {
          text: 'A',
          title: 'A',
          type: 'rss',
          xmlUrl: 'https://a.example/feed.xml',
          category: 'news',
        },
      ],
    })
    const feeds = extractFeedUrls(parseOPML(xml))
    expect(feeds).toEqual([{ text: 'A', url: 'https://a.example/feed.xml', category: 'news' }])
  })
})
