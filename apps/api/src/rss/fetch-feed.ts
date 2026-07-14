export interface FetchFeedOptions {
  etag?: string
  lastModified?: string
}

export interface FetchFeedResult {
  content: string
  etag?: string
  lastModified?: string
  notModified?: boolean
}

export async function fetchFeed(
  url: string,
  options: FetchFeedOptions = {},
): Promise<FetchFeedResult> {
  const headers: Record<string, string> = {
    'User-Agent': 'folio/1.0 RSS Reader',
    Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml',
  }

  if (options.etag) headers['If-None-Match'] = options.etag
  if (options.lastModified) headers['If-Modified-Since'] = options.lastModified

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  })

  if (response.status === 304) {
    return {
      content: '',
      etag: options.etag,
      lastModified: options.lastModified,
      notModified: true,
    }
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status}`)
  }

  return {
    content: await response.text(),
    etag: response.headers.get('etag') || options.etag,
    lastModified: response.headers.get('last-modified') || options.lastModified,
  }
}
