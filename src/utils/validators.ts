import type { RedditSort, RedditTimeFilter } from '../types/reddit'

// Valid single subreddit pattern: 2-21 alphanumeric/underscore chars
const SINGLE_SUBREDDIT_PATTERN = /^[a-zA-Z0-9_]{2,21}$/

// Whitelist of valid sort options
const VALID_SORTS: RedditSort[] = ['hot', 'new', 'rising', 'top', 'controversial']

// Whitelist of valid time filters
const VALID_TIME_FILTERS: RedditTimeFilter[] = ['hour', 'day', 'week', 'month', 'year', 'all', '']

/**
 * Validates a single subreddit name
 */
function isValidSubreddit(name: string): boolean {
  return SINGLE_SUBREDDIT_PATTERN.test(name)
}

/**
 * Validates a subreddit name or multi-reddit string
 * Filters out invalid subreddits and returns the cleaned string
 * Returns null only if no valid subreddits remain
 */
export function validateSubreddits(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') {
    return null
  }

  // Decode URL encoding in case browser didn't
  let decoded: string
  try {
    decoded = decodeURIComponent(input)
  } catch {
    decoded = input
  }

  // Split by + and filter to only valid subreddit names
  const parts = decoded.split('+')
  const validParts = parts
    .map((part) => part.trim())
    .filter((part) => isValidSubreddit(part))

  if (validParts.length === 0) {
    return null
  }

  return validParts.join('+')
}

/**
 * Validates a sort option
 * Returns a valid sort or the default 'hot'
 */
export function validateSort(input: string | null | undefined): RedditSort {
  if (!input || typeof input !== 'string') {
    return 'hot'
  }

  const lower = input.toLowerCase() as RedditSort
  if (VALID_SORTS.includes(lower)) {
    return lower
  }

  return 'hot'
}

/**
 * Validates a time filter
 * Returns a valid time filter or empty string
 */
export function validateTimeFilter(input: string | null | undefined): RedditTimeFilter {
  if (!input || typeof input !== 'string') {
    return ''
  }

  const lower = input.toLowerCase() as RedditTimeFilter
  if (VALID_TIME_FILTERS.includes(lower)) {
    return lower
  }

  return ''
}

/**
 * Validates URL is safe (no javascript:, data:, etc.)
 */
export function isValidMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const parsed = new URL(url)
    // Only allow http and https protocols
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Sanitize user input for safe logging/display
 */
export function sanitizeForDisplay(input: string | null | undefined, maxLength = 100): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input.slice(0, maxLength).replace(/[<>&"']/g, (char) => {
    const entities: Record<string, string> = {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[char] || char
  })
}
