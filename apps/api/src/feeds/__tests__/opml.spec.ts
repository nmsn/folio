import { describe, it, expect } from 'vitest'
import {
  parseOPML,
  generateOPML,
  extractFeedUrls,
  OPMLSchema,
  OPMLOutlineSchema,
} from '@folio/shared'

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
    const outline = {
      text: 'Minimal Feed',
    }

    const result = OPMLOutlineSchema.parse(outline)
    expect(result.text).toBe('Minimal Feed')
    expect(result.xmlUrl).toBeUndefined()
  })

  it('should accept any string for xmlUrl (validation happens at creation time)', () => {
    const outline = {
      text: 'Any string Feed',
      xmlUrl: 'not-a-url',
    }

    // OPMLOutlineSchema is a structural schema, URL validation happens when creating feeds
    const result = OPMLOutlineSchema.safeParse(outline)
    expect(result.success).toBe(true)
    expect(result.data?.xmlUrl).toBe('not-a-url')
  })
})

describe('parseOPML', () => {
  it('should parse a valid OPML 2.0 document', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>My Subscriptions</title>
    <dateCreated>Tue, 03 Jun 2026 12:00:00 GMT</dateCreated>
  </head>
  <body>
    <outline text="Tech News" title="Tech News" type="rss" xmlUrl="https://tech.example.com/feed.xml" />
    <outline text="Dev Blog" xmlUrl="https://dev.example.com/feed.xml" />
  </body>
</opml>`

    const result = parseOPML(xml)

    expect(result.version).toBe('2.0')
    expect(result.head.title).toBe('My Subscriptions')
    expect(result.head.dateCreated).toBe('Tue, 03 Jun 2026 12:00:00 GMT')
    expect(result.body).toHaveLength(2)
    expect(result.body[0].text).toBe('Tech News')
    expect(result.body[0].xmlUrl).toBe('https://tech.example.com/feed.xml')
  })

  it('should extract multiple outlines', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Feeds</title></head>
  <body>
    <outline text="Feed 1" xmlUrl="https://feed1.com/rss" />
    <outline text="Feed 2" xmlUrl="https://feed2.com/rss" category="tech" />
    <outline text="Feed 3" xmlUrl="https://feed3.com/atom" type="atom" />
  </body>
</opml>`

    const result = parseOPML(xml)

    expect(result.body).toHaveLength(3)
    expect(result.body[1].category).toBe('tech')
    expect(result.body[2].type).toBe('atom')
  })

  it('should handle outlines without xmlUrl', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Feeds</title></head>
  <body>
    <outline text="Folder" />
    <outline text="Feed" xmlUrl="https://feed.com/rss" />
  </body>
</opml>`

    const result = parseOPML(xml)

    expect(result.body).toHaveLength(2)
    expect(result.body[0].text).toBe('Folder')
    expect(result.body[0].xmlUrl).toBeUndefined()
    expect(result.body[1].xmlUrl).toBe('https://feed.com/rss')
  })

  it('should handle special characters in text', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Feeds &amp; More</title></head>
  <body>
    <outline text="Feed with &quot;quotes&quot; &amp; symbols" xmlUrl="https://feed.com/rss" />
  </body>
</opml>`

    const result = parseOPML(xml)

    expect(result.head.title).toBe('Feeds &amp; More')
  })

  it('should handle missing head element', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Feed" xmlUrl="https://feed.com/rss" />
  </body>
</opml>`

    const result = parseOPML(xml)

    expect(result.head.title).toBe('folio Subscriptions') // default
    expect(result.body).toHaveLength(1)
  })
})

describe('generateOPML', () => {
  it('should generate valid OPML XML', () => {
    const opml = {
      version: '2.0',
      head: {
        title: 'My Subscriptions',
        dateCreated: 'Tue, 03 Jun 2026 12:00:00 GMT',
      },
      body: [
        {
          text: 'Tech News',
          title: 'Tech News',
          type: 'rss',
          xmlUrl: 'https://tech.example.com/feed.xml',
          htmlUrl: 'https://tech.example.com',
        },
        {
          text: 'Dev Blog',
          type: 'rss',
          xmlUrl: 'https://dev.example.com/feed.xml',
        },
      ],
    }

    const xml = generateOPML(opml)

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<opml version="2.0">')
    expect(xml).toContain('<title>My Subscriptions</title>')
    expect(xml).toContain('<dateCreated>Tue, 03 Jun 2026 12:00:00 GMT</dateCreated>')
    expect(xml).toContain('text="Tech News"')
    expect(xml).toContain('xmlUrl="https://tech.example.com/feed.xml"')
  })

  it('should escape special characters', () => {
    const opml = {
      version: '2.0',
      head: { title: 'Feeds with "quotes" & symbols' },
      body: [
        {
          text: 'A & B <C> "quotes"',
          xmlUrl: 'https://feed.com/rss',
        },
      ],
    }

    const xml = generateOPML(opml)

    expect(xml).toContain('&amp;')
    expect(xml).toContain('&lt;')
    expect(xml).toContain('&gt;')
    expect(xml).toContain('&quot;')
  })

  it('should generate empty body for no feeds', () => {
    const opml = {
      version: '2.0',
      head: { title: 'Empty' },
      body: [],
    }

    const xml = generateOPML(opml)

    expect(xml).toContain('<body>')
    expect(xml).toContain('</body>')
  })
})

describe('extractFeedUrls', () => {
  it('should extract only feeds with valid xmlUrl', () => {
    const opml = {
      version: '2.0',
      head: { title: 'Test' },
      body: [
        { text: 'RSS Feed', xmlUrl: 'https://rss.com/feed', type: 'rss' },
        { text: 'Atom Feed', xmlUrl: 'https://atom.com/feed', type: 'atom' },
        { text: 'No URL', xmlUrl: undefined },
        { text: 'Implicit RSS', xmlUrl: 'https://implicit.com/feed' },
      ],
    }

    const feeds = extractFeedUrls(opml)

    // Only 3 because the one without xmlUrl is filtered out
    expect(feeds).toHaveLength(3)
    expect(feeds[0].url).toBe('https://rss.com/feed')
    expect(feeds[1].url).toBe('https://atom.com/feed')
    expect(feeds[2].url).toBe('https://implicit.com/feed')
  })

  it('should include category when present', () => {
    const opml = {
      version: '2.0',
      head: { title: 'Test' },
      body: [{ text: 'Tech Feed', xmlUrl: 'https://tech.com/feed', category: 'Technology' }],
    }

    const feeds = extractFeedUrls(opml)

    expect(feeds).toHaveLength(1)
    expect(feeds[0].category).toBe('Technology')
  })

  it('should skip non-feed outlines (e.g., type=link)', () => {
    const opml = {
      version: '2.0',
      head: { title: 'Test' },
      body: [
        { text: 'RSS Feed', xmlUrl: 'https://rss.com/feed', type: 'rss' },
        { text: 'Link', htmlUrl: 'https://example.com', type: 'link' },
      ],
    }

    const feeds = extractFeedUrls(opml)

    expect(feeds).toHaveLength(1)
    expect(feeds[0].text).toBe('RSS Feed')
  })
})

describe('OPML round-trip', () => {
  it('should parse what generateOPML produces', () => {
    const originalOpml = {
      version: '2.0',
      head: {
        title: 'Round-trip Test',
        dateCreated: 'Tue, 03 Jun 2026 12:00:00 GMT',
      },
      body: [
        {
          text: 'Feed 1',
          title: 'Feed 1 Title',
          type: 'rss',
          xmlUrl: 'https://feed1.com/rss',
          htmlUrl: 'https://feed1.com',
          category: 'Tech',
        },
        {
          text: 'Feed 2',
          xmlUrl: 'https://feed2.com/atom',
          type: 'atom',
        },
      ],
    }

    const xml = generateOPML(originalOpml)
    const parsed = parseOPML(xml)

    expect(parsed.head.title).toBe(originalOpml.head.title)
    expect(parsed.body).toHaveLength(originalOpml.body.length)
    expect(parsed.body[0].text).toBe(originalOpml.body[0].text)
    expect(parsed.body[0].xmlUrl).toBe(originalOpml.body[0].xmlUrl)
    expect(parsed.body[0].category).toBe(originalOpml.body[0].category)
  })
})
