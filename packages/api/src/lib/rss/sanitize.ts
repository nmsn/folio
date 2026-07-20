const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'figure',
  'figcaption',
  'div',
  'span',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'rel']),
  img: new Set(['src', 'alt', 'title']),
}

/**
 * Lightweight HTML sanitizer for Workers (no jsdom / sanitize-html).
 */
export function sanitizeHtmlContent(html: string): string {
  if (!html) return ''

  // Strip scripts/styles entirely
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')

  cleaned = cleaned.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tag: string, attrs: string) => {
    const lower = tag.toLowerCase()
    const isClose = match.startsWith('</')
    if (!ALLOWED_TAGS.has(lower)) return ''
    if (isClose) return `</${lower}>`

    const allowed = ALLOWED_ATTRS[lower]
    if (!allowed) return `<${lower}>`

    const kept: string[] = []
    const attrRe = /([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g
    let m: RegExpExecArray | null
    while ((m = attrRe.exec(attrs))) {
      const name = m[1].toLowerCase()
      if (!allowed.has(name)) continue
      const value = m[3] ?? m[4] ?? m[5] ?? ''
      if ((name === 'href' || name === 'src') && !/^(https?:|mailto:)/i.test(value)) continue
      kept.push(`${name}="${value.replace(/"/g, '&quot;')}"`)
    }
    return kept.length ? `<${lower} ${kept.join(' ')}>` : `<${lower}>`
  })

  return cleaned
}
