import type { RedditListing, RedditPost, RedditSort, RedditTimeFilter } from '../types/reddit'
import { withRetry, isRetryableError } from '../utils/retry'
import { isValidRedditListing } from '../utils/apiValidation'
import { logger } from '../utils/logger'

const DEFAULT_TIMEOUT = 15000

export interface FetchPostsOptions {
  subreddits: string
  sort?: RedditSort
  timeFilter?: RedditTimeFilter
  after?: string | null
  limit?: number
  signal?: AbortSignal
}

export interface FetchPostsResult {
  posts: RedditPost[]
  after: string | null
  hasMore: boolean
}

/**
 * Build Reddit API URL for fetching posts
 */
function buildUrl(options: FetchPostsOptions): string {
  const { subreddits, sort = 'hot', timeFilter, after, limit = 100 } = options

  let url = `/api/reddit/r/${subreddits}/${sort}.json?limit=${limit}&raw_json=1`

  if (after) {
    url += `&after=${after}`
  }

  if (timeFilter && (sort === 'top' || sort === 'controversial')) {
    url += `&t=${timeFilter}`
  }

  return url
}

/**
 * Fetch posts from Reddit API with retry logic and validation
 */
export async function fetchRedditPosts(
  options: FetchPostsOptions
): Promise<FetchPostsResult> {
  const url = buildUrl(options)

  logger.fetchStart(url)

  const data = await withRetry<RedditListing<RedditPost>>(
    async () => {
      const signals: AbortSignal[] = [AbortSignal.timeout(DEFAULT_TIMEOUT)]
      if (options.signal) {
        signals.push(options.signal)
      }

      const response = await fetch(url, {
        signal: AbortSignal.any(signals)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const jsonData = await response.json()

      if (!isValidRedditListing(jsonData)) {
        throw new Error('Invalid response from Reddit API')
      }

      return jsonData as RedditListing<RedditPost>
    },
    {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      shouldRetry: (error) => {
        // Don't retry cancelled requests
        if (error.name === 'AbortError' || error.message?.includes('abort')) {
          return false
        }
        return isRetryableError(error)
      }
    }
  )

  const children = data.data.children || []
  const posts = children.map((child) => child.data)

  logger.fetchEnd(url, posts.length)

  return {
    posts,
    after: data.data.after || null,
    hasMore: !!data.data.after
  }
}

/**
 * Fetch a single post by ID
 */
export async function fetchRedditPost(
  postId: string,
  subreddit: string
): Promise<RedditPost | null> {
  const url = `/api/reddit/r/${subreddit}/comments/${postId}.json?raw_json=1`

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Reddit returns an array where first item is the post listing
    if (Array.isArray(data) && data[0]?.data?.children?.[0]?.data) {
      return data[0].data.children[0].data as RedditPost
    }

    return null
  } catch (error) {
    logger.log('error', `Failed to fetch post ${postId}: ${(error as Error).message}`)
    return null
  }
}
