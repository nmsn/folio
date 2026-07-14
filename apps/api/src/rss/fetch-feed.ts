import got from 'got'

export interface FetchFeedOptions {
  etag?: string
  lastModified?: string
}

export interface FetchFeedResult {
  content: string
  etag?: string
  lastModified?: string
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

  const response = await got(url, {
    headers,
    timeout: { request: 30000 },
    throwHttpErrors: false,
  })

  if (response.statusCode === 304) {
    return { content: '', etag: options.etag, lastModified: options.lastModified }
  }

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch feed: ${response.statusCode}`)
  }

  return {
    content: response.body,
    etag: (response.headers.etag as string) || options.etag,
    lastModified: (response.headers['last-modified'] as string) || options.lastModified,
  }
}
