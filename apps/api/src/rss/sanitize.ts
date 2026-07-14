import sanitizeHtml from 'sanitize-html'

export function sanitizeHtmlContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure', 'figcaption']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title'],
      a: ['href', 'title', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })
}
