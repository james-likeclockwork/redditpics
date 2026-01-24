import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    fetchStart: vi.fn(),
    fetchEnd: vi.fn(),
    fetchError: vi.fn(),
    startTimer: vi.fn(),
    endTimer: vi.fn()
  }
}))

// Mock the storage module
vi.mock('../../services/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn()
  }
}))

// Import after mocks
import { useRedditFetcher } from '../useRedditFetcher'

describe('useRedditFetcher', () => {
  const mockRedditResponse = {
    kind: 'Listing',
    data: {
      after: 't3_next',
      children: [
        {
          kind: 't3',
          data: {
            id: 'post1',
            name: 't3_post1',
            title: 'Test Image Post',
            author: 'testuser',
            subreddit: 'pics',
            subreddit_name_prefixed: 'r/pics',
            permalink: '/r/pics/post1/',
            url: 'https://i.redd.it/test.jpg',
            domain: 'i.redd.it',
            created_utc: 1704067200,
            score: 1000,
            num_comments: 50,
            over_18: false,
            is_self: false,
            is_video: false
          }
        },
        {
          kind: 't3',
          data: {
            id: 'post2',
            name: 't3_post2',
            title: 'Test Self Post',
            author: 'testuser2',
            subreddit: 'pics',
            subreddit_name_prefixed: 'r/pics',
            permalink: '/r/pics/post2/',
            url: '',
            domain: 'self.pics',
            created_utc: 1704067200,
            score: 500,
            num_comments: 25,
            over_18: false,
            is_self: true,
            is_video: false
          }
        }
      ]
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with empty state', () => {
    const { posts, loading, error, hasMore } = useRedditFetcher()

    expect(posts.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(hasMore.value).toBe(true)
  })

  it('fetches posts successfully', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRedditResponse)
    } as Response)

    const { posts, loading, error, fetchPosts } = useRedditFetcher()

    await fetchPosts('pics', 'hot', '')

    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    // Should filter out self posts, keeping only media posts
    expect(posts.value.length).toBe(1)
    expect(posts.value[0].type).toBe('image')
  })

  it('handles HTTP errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    } as Response)

    const { error, fetchPosts } = useRedditFetcher()

    await fetchPosts('nonexistent', 'hot', '')

    expect(error.value).toContain('404')
  })

  it('prevents concurrent fetches', async () => {
    let resolveFirst: (_value: Response) => void
    const firstPromise = new Promise<Response>((resolve) => {
      resolveFirst = resolve
    })
    // Suppress unused variable warning - resolveFirst is used later
    void resolveFirst!

    vi.mocked(global.fetch).mockReturnValueOnce(firstPromise)

    const { loading, fetchPosts } = useRedditFetcher()

    // Start first fetch
    const firstFetch = fetchPosts('pics', 'hot', '')
    expect(loading.value).toBe(true)

    // Try to start second fetch while first is in progress
    const secondFetch = fetchPosts('pics', 'hot', '')

    // Should still only have one pending request
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1)

    // Resolve the first fetch
    resolveFirst!({
      ok: true,
      json: () => Promise.resolve(mockRedditResponse)
    } as Response)

    await Promise.all([firstFetch, secondFetch])
  })

  it('resets state when params change', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRedditResponse)
    } as Response)

    const { posts, fetchPosts } = useRedditFetcher()

    await fetchPosts('pics', 'hot', '')
    expect(posts.value.length).toBe(1)

    // Fetch different subreddit - should reset
    await fetchPosts('videos', 'hot', '')
    expect(posts.value.length).toBe(1) // Fresh data, not appended
  })

  it('handles stale request cancellation', async () => {
    // This test verifies that when params change, old results are discarded
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRedditResponse)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockRedditResponse,
            data: {
              ...mockRedditResponse.data,
              children: [
                {
                  kind: 't3',
                  data: {
                    ...mockRedditResponse.data.children[0].data,
                    id: 'new_post',
                    url: 'https://i.redd.it/new.jpg'
                  }
                }
              ]
            }
          })
      } as Response)

    const { posts, fetchPosts } = useRedditFetcher()

    // Fetch first subreddit
    await fetchPosts('pics', 'hot', '')
    expect(posts.value[0]?.post?.id).toBe('post1')

    // Fetch different subreddit - should reset and get new results
    await fetchPosts('videos', 'hot', '')

    // Should have results from second fetch only (posts are reset on param change)
    expect(posts.value.length).toBe(1)
    expect(posts.value[0]?.post?.id).toBe('new_post')
  })

  it('appends posts when fetching more', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRedditResponse)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockRedditResponse,
            data: {
              ...mockRedditResponse.data,
              children: [
                {
                  kind: 't3',
                  data: {
                    ...mockRedditResponse.data.children[0].data,
                    id: 'post3',
                    url: 'https://i.redd.it/test2.jpg'
                  }
                }
              ]
            }
          })
      } as Response)

    const { posts, fetchPosts, fetchMore } = useRedditFetcher()

    await fetchPosts('pics', 'hot', '')
    expect(posts.value.length).toBe(1)

    await fetchMore()
    expect(posts.value.length).toBe(2)
  })

  it('sets hasMore to false when no after token', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ...mockRedditResponse,
          data: {
            ...mockRedditResponse.data,
            after: null
          }
        })
    } as Response)

    const { hasMore, fetchPosts } = useRedditFetcher()

    await fetchPosts('pics', 'hot', '')

    expect(hasMore.value).toBe(false)
  })

  it('resets all state on reset()', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRedditResponse)
    } as Response)

    const { posts, loading, error, hasMore, fetchPosts, reset } = useRedditFetcher()

    await fetchPosts('pics', 'hot', '')
    expect(posts.value.length).toBe(1)

    reset()

    expect(posts.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(hasMore.value).toBe(true)
  })
})
