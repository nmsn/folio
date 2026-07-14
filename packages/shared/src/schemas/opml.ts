import { z } from 'zod'

// OPML 2.0 schema for RSS feed import/export
// Based on OPML 2.0 specification: http://opml.org/spec2.opml

export const OPMLOutlineSchema = z.object({
  text: z.string(),
  title: z.string().optional(),
  type: z.string().optional(),
  xmlUrl: z.string().optional(),
  htmlUrl: z.string().optional(),
  language: z.string().optional(),
  category: z.string().optional(),
  version: z.string().optional(),
})

export const OPMLHeadSchema = z.object({
  title: z.string(),
  dateCreated: z.string().optional(),
  dateModified: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerId: z.string().optional(),
  docs: z.string().optional(),
  expansionState: z.string().optional(),
  vertScrollState: z.number().optional(),
  windowTop: z.number().optional(),
  windowLeft: z.number().optional(),
  windowBottom: z.number().optional(),
  windowRight: z.number().optional(),
})

export const OPMLSchema = z.object({
  version: z.string().default('2.0'),
  head: OPMLHeadSchema,
  body: z.array(OPMLOutlineSchema),
})

export const OPMLExportOptionsSchema = z.object({
  includeMetadata: z.boolean().default(true),
  categories: z.array(z.string()).optional(),
})

export type OPMLOutline = z.infer<typeof OPMLOutlineSchema>
export type OPMLHead = z.infer<typeof OPMLHeadSchema>
export type OPML = z.infer<typeof OPMLSchema>
export type OPMLExportOptions = z.infer<typeof OPMLExportOptionsSchema>

/**
 * Parse OPML XML string to OPML object
 */
export function parseOPML(xmlString: string): OPML {
  // Simple XML parsing for OPML
  // In production, consider using a proper XML parser like 'fast-xml-parser'
  const getElementContent = (xml: string, tag: string): string | undefined => {
    const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i')
    const match = xml.match(regex)
    return match?.[1]?.trim()
  }

  const getAllElements = (xml: string, tag: string): string[] => {
    const regex = new RegExp(`<${tag}[^>]*>`, 'gi')
    const matches = xml.match(regex) || []
    return matches
  }

  const getOutlineAttributes = (outlineTag: string): Partial<OPMLOutline> => {
    const attrs: Partial<OPMLOutline> = {}

    const textMatch = outlineTag.match(/text=["']([^"']*)["']/i)
    if (textMatch) attrs.text = textMatch[1]

    const titleMatch = outlineTag.match(/title=["']([^"']*)["']/i)
    if (titleMatch) attrs.title = titleMatch[1]

    const typeMatch = outlineTag.match(/type=["']([^"']*)["']/i)
    if (typeMatch) attrs.type = typeMatch[1]

    const xmlUrlMatch = outlineTag.match(/xmlUrl=["']([^"']*)["']/i)
    if (xmlUrlMatch) attrs.xmlUrl = xmlUrlMatch[1]

    const htmlUrlMatch = outlineTag.match(/htmlUrl=["']([^"']*)["']/i)
    if (htmlUrlMatch) attrs.htmlUrl = htmlUrlMatch[1]

    const languageMatch = outlineTag.match(/language=["']([^"']*)["']/i)
    if (languageMatch) attrs.language = languageMatch[1]

    const categoryMatch = outlineTag.match(/category=["']([^"']*)["']/i)
    if (categoryMatch) attrs.category = categoryMatch[1]

    return attrs
  }

  // Extract head
  const headStart = xmlString.indexOf('<head>')
  const headEnd = xmlString.indexOf('</head>')
  const headContent =
    headStart >= 0 && headEnd > headStart ? xmlString.substring(headStart + 6, headEnd) : ''

  const head: OPMLHead = {
    title: getElementContent(headContent, 'title') || 'folio Subscriptions',
    dateCreated: getElementContent(headContent, 'dateCreated'),
    dateModified: getElementContent(headContent, 'dateModified'),
    ownerName: getElementContent(headContent, 'ownerName'),
    ownerEmail: getElementContent(headContent, 'ownerEmail'),
    ownerId: getElementContent(headContent, 'ownerId'),
    docs: getElementContent(headContent, 'docs'),
  }

  // Extract body outlines
  const bodyStart = xmlString.indexOf('<body>')
  const bodyEnd = xmlString.indexOf('</body>')
  const bodyContent =
    bodyStart >= 0 && bodyEnd > bodyStart ? xmlString.substring(bodyStart + 6, bodyEnd) : ''

  const outlineTags = getAllElements(bodyContent, 'outline')
  const body: OPMLOutline[] = outlineTags.map((tag) => {
    const attrs = getOutlineAttributes(tag)
    return OPMLOutlineSchema.parse({
      text: attrs.text || '',
      ...attrs,
    })
  })

  return OPMLSchema.parse({
    version: '2.0',
    head,
    body,
  })
}

/**
 * Generate OPML XML string from OPML object
 */
export function generateOPML(opml: OPML): string {
  const escapeXml = (str: string | undefined): string => {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const outlines = opml.body
    .map((outline) => {
      const attrs: string[] = []
      if (outline.text) attrs.push(`text="${escapeXml(outline.text)}"`)
      if (outline.title) attrs.push(`title="${escapeXml(outline.title)}"`)
      if (outline.type) attrs.push(`type="${escapeXml(outline.type)}"`)
      if (outline.xmlUrl) attrs.push(`xmlUrl="${escapeXml(outline.xmlUrl)}"`)
      if (outline.htmlUrl) attrs.push(`htmlUrl="${escapeXml(outline.htmlUrl)}"`)
      if (outline.language) attrs.push(`language="${escapeXml(outline.language)}"`)
      if (outline.category) attrs.push(`category="${escapeXml(outline.category)}"`)
      return `<outline ${attrs.join(' ')} />`
    })
    .join('\n  ')

  let headXml = `  <head>\n    <title>${escapeXml(opml.head.title)}</title>`

  if (opml.head.dateCreated) {
    headXml += `\n    <dateCreated>${escapeXml(opml.head.dateCreated)}</dateCreated>`
  }
  if (opml.head.ownerName) {
    headXml += `\n    <ownerName>${escapeXml(opml.head.ownerName)}</ownerName>`
  }
  if (opml.head.ownerEmail) {
    headXml += `\n    <ownerEmail>${escapeXml(opml.head.ownerEmail)}</ownerEmail>`
  }

  headXml += '\n  </head>'

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="${opml.version}">
${headXml}
  <body>
  ${outlines}
  </body>
</opml>`
}

/**
 * Extract RSS feed URLs from OPML
 * Only returns outlines that have valid RSS xmlUrl
 */
export function extractFeedUrls(
  opml: OPML,
): Array<{ text: string; url: string; category?: string }> {
  return opml.body
    .filter(
      (outline) =>
        outline.xmlUrl && (outline.type === 'rss' || outline.type === 'atom' || !outline.type),
    )
    .map((outline) => ({
      text: outline.text || outline.title || '',
      url: outline.xmlUrl!,
      category: outline.category,
    }))
}
