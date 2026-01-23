import type { RedditListing, RedditPost } from '../types/reddit'

/**
 * Validates Reddit API listing response structure
 */
export function isValidRedditListing(data: unknown): data is RedditListing<RedditPost> {
  if (!data || typeof data !== 'object') {
    return false
  }

  const listing = data as Record<string, unknown>

  if (listing.kind !== 'Listing') {
    return false
  }

  if (!listing.data || typeof listing.data !== 'object') {
    return false
  }

  const listingData = listing.data as Record<string, unknown>

  if (!Array.isArray(listingData.children)) {
    return false
  }

  return true
}

/**
 * Validates Reddit post structure has minimum required fields
 */
export function isValidRedditPost(data: unknown): data is { data: RedditPost } {
  if (!data || typeof data !== 'object') {
    return false
  }

  const post = data as Record<string, unknown>

  if (!post.data || typeof post.data !== 'object') {
    return false
  }

  const postData = post.data as Record<string, unknown>

  // Check required fields exist
  return (
    typeof postData.id === 'string' &&
    typeof postData.title === 'string' &&
    typeof postData.subreddit === 'string'
  )
}

/**
 * Validates Redgifs token response
 */
export function isValidRedgifsTokenResponse(data: unknown): data is { token: string } {
  if (!data || typeof data !== 'object') {
    return false
  }

  const response = data as Record<string, unknown>

  return typeof response.token === 'string' && response.token.length > 0
}

/**
 * Validates Redgifs gif response
 */
export interface RedgifsGifResponse {
  gif: {
    id: string
    urls: {
      hd?: string
      sd?: string
      poster?: string
      thumbnail?: string
      vthumbnail?: string
    }
    width: number
    height: number
    duration: number
  }
}

export function isValidRedgifsGifResponse(data: unknown): data is RedgifsGifResponse {
  if (!data || typeof data !== 'object') {
    return false
  }

  const response = data as Record<string, unknown>

  if (!response.gif || typeof response.gif !== 'object') {
    return false
  }

  const gif = response.gif as Record<string, unknown>

  if (!gif.urls || typeof gif.urls !== 'object') {
    return false
  }

  const urls = gif.urls as Record<string, unknown>

  // Must have at least one video URL
  return typeof urls.hd === 'string' || typeof urls.sd === 'string'
}

/**
 * Safely extract children from Reddit listing
 */
export function extractListingChildren<T>(
  data: unknown
): Array<{ kind: string; data: T }> {
  if (!isValidRedditListing(data)) {
    return []
  }

  return data.data.children.filter((child) => isValidRedditPost(child)) as Array<{
    kind: string
    data: T
  }>
}
