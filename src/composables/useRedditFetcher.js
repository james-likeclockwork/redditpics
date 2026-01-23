import { ref } from 'vue'
import { extractMedia } from '../utils/mediaExtractor.js'

export function useRedditFetcher() {
  const posts = ref([])
  const loading = ref(false)
  const error = ref(null)
  const hasMore = ref(true)
  const after = ref(null)

  let currentSubreddits = ''
  let currentSort = 'hot'
  let currentTimeFilter = ''
  let fetchId = 0

  async function fetchPosts(subreddits, sort = 'hot', timeFilter = '') {
    // Skip if already loading
    if (loading.value) return

    // Reset if params changed
    if (subreddits !== currentSubreddits || sort !== currentSort || timeFilter !== currentTimeFilter) {
      posts.value = []
      after.value = null
      hasMore.value = true
      currentSubreddits = subreddits
      currentSort = sort
      currentTimeFilter = timeFilter
    }

    if (!hasMore.value) return

    loading.value = true
    error.value = null
    const thisFetchId = ++fetchId

    try {
      let url = `/api/reddit/r/${subreddits}/${sort}.json?limit=100&raw_json=1`
      if (after.value) {
        url += `&after=${after.value}`
      }
      if (timeFilter && (sort === 'top' || sort === 'controversial')) {
        url += `&t=${timeFilter}`
      }

      const response = await fetch(url)

      // Check if this fetch is still current
      if (thisFetchId !== fetchId) return

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Check again after parsing
      if (thisFetchId !== fetchId) return

      const children = data?.data?.children || []

      if (children.length === 0) {
        hasMore.value = false
        return
      }

      // Extract media from posts
      const newPosts = children
        .map(child => extractMedia(child))
        .filter(Boolean)

      posts.value = [...posts.value, ...newPosts]
      after.value = data?.data?.after || null
      hasMore.value = !!after.value
    } catch (e) {
      if (thisFetchId !== fetchId) return
      console.error('Failed to fetch posts:', e)
      error.value = e.message || 'Failed to fetch posts'
    } finally {
      if (thisFetchId === fetchId) {
        loading.value = false
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
    }
    posts.value = []
    loading.value = false
    error.value = null
    hasMore.value = true
    after.value = null
    currentSubreddits = ''
    currentSort = 'hot'
    currentTimeFilter = ''
  }

  return {
    posts,
    loading,
    error,
    hasMore,
    fetchPosts,
    fetchMore,
    reset
  }
}
