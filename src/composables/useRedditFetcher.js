import { ref } from 'vue'
import { extractMedia } from '../utils/mediaExtractor'
import { logger } from '../utils/logger.js'
import { withRetry, isRetryableError } from '../utils/retry'
import { isValidRedditListing } from '../utils/apiValidation'

const FETCH_TIMEOUT = 15000 // 15 second timeout
const MAX_POSTS = 500 // Maximum posts to keep in memory
const CLEANUP_BUFFER = 100 // Posts to keep around current index

// Time filter fallback order for "top" sort
const TIME_FILTER_ORDER = ['hour', 'day', 'week', 'month', 'year', 'all']

function getNextTimeFilter(currentFilter) {
  const currentIndex = TIME_FILTER_ORDER.indexOf(currentFilter || 'day')
  if (currentIndex === -1 || currentIndex >= TIME_FILTER_ORDER.length - 1) {
    return null // No more fallbacks
  }
  return TIME_FILTER_ORDER[currentIndex + 1]
}

export function useRedditFetcher() {
  const posts = ref([])
  const loading = ref(false)
  const error = ref(null)
  const hasMore = ref(true)
  const after = ref(null)
  const indexOffset = ref(0) // Tracks how many posts were removed from the start
  const effectiveTimeFilter = ref('') // Tracks actual time filter used (may differ due to fallback)

  let currentSubreddits = ''
  let currentSort = 'hot'
  let currentTimeFilter = ''
  let fetchId = 0
  let abortController = null
  let onTimeFilterChange = null // Callback when time filter changes due to fallback
  let onNoSuitablePosts = null // Callback when no suitable posts found after all fallbacks

  async function fetchPosts(
    subreddits,
    sort = 'hot',
    timeFilter = '',
    isRetryWithFallback = false
  ) {
    // Skip if already loading (unless this is a fallback retry)
    if (loading.value && !isRetryWithFallback) return

    // Reset if params changed (not for fallback retries)
    if (
      !isRetryWithFallback &&
      (subreddits !== currentSubreddits || sort !== currentSort || timeFilter !== currentTimeFilter)
    ) {
      posts.value = []
      after.value = null
      hasMore.value = true
      currentSubreddits = subreddits
      currentSort = sort
      currentTimeFilter = timeFilter
      effectiveTimeFilter.value = timeFilter
    }

    if (!hasMore.value) return

    // Abort any previous fetch
    if (abortController) {
      abortController.abort()
    }
    abortController = new AbortController()

    loading.value = true
    error.value = null
    const thisFetchId = ++fetchId

    // Use effective time filter for the URL (may be different from requested due to fallback)
    const activeTimeFilter = isRetryWithFallback ? effectiveTimeFilter.value : timeFilter

    let url = `/api/reddit/r/${subreddits}/${sort}.json?limit=100&raw_json=1`
    if (after.value) {
      url += `&after=${after.value}`
    }
    if (activeTimeFilter && (sort === 'top' || sort === 'controversial')) {
      url += `&t=${activeTimeFilter}`
    }

    try {
      logger.fetchStart(url)
      logger.startTimer(`fetch-${thisFetchId}`)

      const data = await withRetry(
        async () => {
          // Create combined abort controller for timeout and cancellation
          const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT)

          const response = await fetch(url, {
            signal: abortController.signal
          })

          clearTimeout(timeoutId)

          // Check if this fetch is still current
          if (thisFetchId !== fetchId) {
            throw new Error('Fetch cancelled - stale request')
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const jsonData = await response.json()

          // Validate response structure
          if (!isValidRedditListing(jsonData)) {
            throw new Error('Invalid response from Reddit API')
          }

          return jsonData
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          shouldRetry: (err) => {
            // Don't retry cancelled requests
            if (err.message.includes('cancelled') || err.message.includes('abort')) {
              return false
            }
            return isRetryableError(err)
          }
        }
      )

      // Check again after parsing
      if (thisFetchId !== fetchId) return

      const children = data?.data?.children || []

      // Extract media from posts
      const newPosts = children.map((child) => extractMedia(child)).filter(Boolean)

      // If no results and using "top" sort, try next time range
      if (newPosts.length === 0 && posts.value.length === 0 && sort === 'top') {
        const nextFilter = getNextTimeFilter(activeTimeFilter)
        if (nextFilter) {
          logger.log('fetch', `No results for top/${activeTimeFilter}, trying ${nextFilter}`)
          effectiveTimeFilter.value = nextFilter
          currentTimeFilter = nextFilter
          loading.value = false // Reset so fetchPosts can run again

          // Notify callback about filter change
          if (onTimeFilterChange) {
            onTimeFilterChange(nextFilter)
          }

          // Retry with next time filter
          await fetchPosts(subreddits, sort, nextFilter, true)
          return
        } else {
          // Exhausted all time filters with no results
          logger.log('fetch', `No suitable posts found for ${subreddits} after all time filters`)
          if (onNoSuitablePosts) {
            onNoSuitablePosts(subreddits)
          }
          hasMore.value = false
          return
        }
      }

      // No posts found for non-top sorts
      if (newPosts.length === 0 && posts.value.length === 0) {
        logger.log('fetch', `No suitable posts found for ${subreddits}`)
        if (onNoSuitablePosts) {
          onNoSuitablePosts(subreddits)
        }
        hasMore.value = false
        return
      }

      if (newPosts.length === 0 && children.length === 0) {
        hasMore.value = false
        return
      }

      posts.value = [...posts.value, ...newPosts]
      after.value = data?.data?.after || null
      hasMore.value = !!after.value
      logger.endTimer(`fetch-${thisFetchId}`, `got ${newPosts.length} media posts`)
      logger.fetchEnd(url, newPosts.length)

      // Check if cleanup is needed
      if (posts.value.length > MAX_POSTS) {
        logger.log('memory', `Post count ${posts.value.length} exceeds max ${MAX_POSTS}`)
      }
    } catch (e) {
      if (thisFetchId !== fetchId) return
      if (e.name === 'AbortError' || e.message?.includes('abort')) return

      console.error('Failed to fetch posts:', e)
      logger.fetchError(url, e.message)
      error.value = e.message || 'Failed to fetch posts'
    } finally {
      if (thisFetchId === fetchId) {
        loading.value = false
        abortController = null
      }
    }
  }

  async function fetchMore() {
    if (!currentSubreddits || loading.value || !hasMore.value) return
    await fetchPosts(currentSubreddits, currentSort, currentTimeFilter)
  }

  function reset() {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    posts.value = []
    loading.value = false
    error.value = null
    hasMore.value = true
    after.value = null
    indexOffset.value = 0
    currentSubreddits = ''
    currentSort = 'hot'
    currentTimeFilter = ''
    fetchId++
  }

  /**
   * Cleanup old posts to maintain sliding window
   * Call this with the current viewing index to remove posts far from view
   * Returns the new adjusted index after cleanup
   */
  function cleanupPosts(currentIndex) {
    const totalPosts = posts.value.length

    // Only cleanup if we exceed max
    if (totalPosts <= MAX_POSTS) {
      return currentIndex
    }

    // Calculate how many to remove from start
    // Keep CLEANUP_BUFFER posts before current index
    const removeFromStart = Math.max(0, currentIndex - CLEANUP_BUFFER)

    if (removeFromStart > 0) {
      posts.value = posts.value.slice(removeFromStart)
      indexOffset.value += removeFromStart
      logger.log(
        'memory',
        `Cleaned up ${removeFromStart} old posts, new length: ${posts.value.length}`
      )
      return currentIndex - removeFromStart
    }

    // If we can't remove from start, remove from end (but keep buffer after current)
    const safeEndIndex = currentIndex + CLEANUP_BUFFER
    const actualRemove = Math.max(0, totalPosts - Math.max(MAX_POSTS, safeEndIndex + 1))

    if (actualRemove > 0) {
      posts.value = posts.value.slice(0, totalPosts - actualRemove)
      logger.log(
        'memory',
        `Cleaned up ${actualRemove} posts from end, new length: ${posts.value.length}`
      )
    }

    return currentIndex
  }

  function setTimeFilterChangeCallback(callback) {
    onTimeFilterChange = callback
  }

  function setNoSuitablePostsCallback(callback) {
    onNoSuitablePosts = callback
  }

  return {
    posts,
    loading,
    error,
    hasMore,
    indexOffset,
    effectiveTimeFilter,
    fetchPosts,
    fetchMore,
    reset,
    cleanupPosts,
    setTimeFilterChangeCallback,
    setNoSuitablePostsCallback
  }
}
