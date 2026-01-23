import { describe, it, expect } from 'vitest'
import { unescapeHtml, extractMedia, extractAllMedia } from '../mediaExtractor'
import type { RedditPost } from '../../types/reddit'

describe('unescapeHtml', () => {
  it('handles null and undefined', () => {
    expect(unescapeHtml(null)).toBe('')
    expect(unescapeHtml(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(unescapeHtml('')).toBe('')
  })

  it('decodes basic HTML entities', () => {
    expect(unescapeHtml('&amp;')).toBe('&')
    expect(unescapeHtml('&lt;')).toBe('<')
    expect(unescapeHtml('&gt;')).toBe('>')
    expect(unescapeHtml('&quot;')).toBe('"')
    expect(unescapeHtml('&#039;')).toBe("'")
  })

  it('decodes numeric entities', () => {
    expect(unescapeHtml('&#60;')).toBe('<')
    expect(unescapeHtml('&#62;')).toBe('>')
    expect(unescapeHtml('&#x3C;')).toBe('<')
    expect(unescapeHtml('&#x3E;')).toBe('>')
  })

  it('handles double-encoded entities (security fix)', () => {
    expect(unescapeHtml('&amp;amp;')).toBe('&amp;')
    expect(unescapeHtml('&amp;lt;')).toBe('&lt;')
  })

  it('handles mixed content', () => {
    expect(unescapeHtml('Hello &amp; World')).toBe('Hello & World')
    expect(unescapeHtml('a &lt; b &gt; c')).toBe('a < b > c')
  })

  it('preserves plain text', () => {
    expect(unescapeHtml('Hello World')).toBe('Hello World')
    expect(unescapeHtml('https://example.com/path')).toBe('https://example.com/path')
  })
})

describe('extractMedia', () => {
  const createPost = (overrides: Partial<RedditPost>): { data: RedditPost } => ({
    data: {
      id: 'test123',
      name: 't3_test123',
      title: 'Test Post',
      author: 'testuser',
      subreddit: 'test',
      subreddit_name_prefixed: 'r/test',
      permalink: '/r/test/comments/test123/test_post/',
      url: '',
      domain: '',
      created_utc: Date.now() / 1000,
      score: 100,
      num_comments: 10,
      over_18: false,
      is_self: false,
      is_video: false,
      ...overrides
    }
  })

  describe('self posts', () => {
    it('returns null for self posts', () => {
      const post = createPost({ is_self: true })
      expect(extractMedia(post)).toBeNull()
    })
  })

  describe('removed/deleted posts', () => {
    it('returns null for removed posts', () => {
      expect(extractMedia(createPost({ removed: true }))).toBeNull()
      expect(extractMedia(createPost({ deleted: true }))).toBeNull()
      expect(extractMedia(createPost({ removed_by_category: 'moderator' }))).toBeNull()
    })
  })

  describe('i.redd.it images', () => {
    it('extracts direct image URLs', () => {
      const post = createPost({
        url: 'https://i.redd.it/abc123.jpg',
        domain: 'i.redd.it'
      })
      const result = extractMedia(post)
      expect(result).toEqual({
        type: 'image',
        url: 'https://i.redd.it/abc123.jpg',
        post: expect.any(Object)
      })
    })

    it('handles different image extensions', () => {
      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
      extensions.forEach((ext) => {
        const post = createPost({
          url: `https://i.redd.it/test.${ext}`,
          domain: 'i.redd.it'
        })
        const result = extractMedia(post)
        expect(result?.type).toBe('image')
      })
    })
  })

  describe('Reddit video', () => {
    it('extracts native Reddit video', () => {
      const post = createPost({
        is_video: true,
        domain: 'v.redd.it',
        url: 'https://v.redd.it/abc123',
        media: {
          reddit_video: {
            fallback_url: 'https://v.redd.it/abc123/DASH_720.mp4',
            hls_url: 'https://v.redd.it/abc123/HLSPlaylist.m3u8',
            width: 720,
            height: 1280,
            duration: 30,
            has_audio: true,
            is_gif: false
          }
        }
      })
      const result = extractMedia(post)
      expect(result).toEqual({
        type: 'video',
        url: 'https://v.redd.it/abc123/DASH_720.mp4',
        hlsUrl: 'https://v.redd.it/abc123/HLSPlaylist.m3u8',
        width: 720,
        height: 1280,
        duration: 30,
        hasAudio: true,
        post: expect.any(Object)
      })
    })

    it('extracts crosspost video', () => {
      const post = createPost({
        crosspost_parent_list: [
          {
            id: 'parent123',
            name: 't3_parent123',
            title: 'Parent Post',
            author: 'other',
            subreddit: 'other',
            subreddit_name_prefixed: 'r/other',
            permalink: '/r/other/comments/parent123/',
            url: '',
            domain: 'v.redd.it',
            created_utc: Date.now() / 1000,
            score: 50,
            num_comments: 5,
            over_18: false,
            is_self: false,
            is_video: true,
            media: {
              reddit_video: {
                fallback_url: 'https://v.redd.it/parent123/DASH_480.mp4',
                width: 480,
                height: 854,
                duration: 15,
                has_audio: false,
                is_gif: true
              }
            }
          }
        ]
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('video')
      expect(result?.url).toBe('https://v.redd.it/parent123/DASH_480.mp4')
    })
  })

  describe('Reddit gallery', () => {
    it('extracts gallery images', () => {
      const post = createPost({
        is_gallery: true,
        gallery_data: {
          items: [
            { media_id: 'img1', id: 1 },
            { media_id: 'img2', id: 2 }
          ]
        },
        media_metadata: {
          img1: {
            status: 'valid',
            e: 'Image',
            id: 'img1',
            s: { x: 1920, y: 1080, u: 'https://preview.redd.it/img1.jpg' }
          },
          img2: {
            status: 'valid',
            e: 'Image',
            id: 'img2',
            s: { x: 1920, y: 1080, u: 'https://preview.redd.it/img2.jpg' }
          }
        }
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('gallery')
      if (result?.type === 'gallery') {
        expect(result.items).toHaveLength(2)
        expect(result.items[0].url).toBe('https://preview.redd.it/img1.jpg')
      }
    })

    it('handles missing metadata gracefully', () => {
      const post = createPost({
        is_gallery: true,
        gallery_data: {
          items: [
            { media_id: 'img1', id: 1 },
            { media_id: 'missing', id: 2 }
          ]
        },
        media_metadata: {
          img1: {
            status: 'valid',
            e: 'Image',
            id: 'img1',
            s: { x: 1920, y: 1080, u: 'https://preview.redd.it/img1.jpg' }
          }
        }
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('gallery')
      if (result?.type === 'gallery') {
        expect(result.items).toHaveLength(1)
      }
    })
  })

  describe('Imgur', () => {
    it('converts gifv to mp4', () => {
      const post = createPost({
        url: 'https://i.imgur.com/abc123.gifv',
        domain: 'i.imgur.com'
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('video')
      expect(result?.url).toBe('https://i.imgur.com/abc123.mp4')
    })

    it('handles direct imgur links', () => {
      const post = createPost({
        url: 'https://i.imgur.com/abc123.jpg',
        domain: 'i.imgur.com'
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('image')
    })

    it('converts imgur page URLs to direct links', () => {
      const post = createPost({
        url: 'https://imgur.com/abc123',
        domain: 'imgur.com'
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('image')
      expect(result?.url).toBe('https://i.imgur.com/abc123.jpg')
    })

    it('skips imgur albums', () => {
      expect(
        extractMedia(
          createPost({
            url: 'https://imgur.com/a/abc123',
            domain: 'imgur.com'
          })
        )
      ).toBeNull()

      expect(
        extractMedia(
          createPost({
            url: 'https://imgur.com/gallery/abc123',
            domain: 'imgur.com'
          })
        )
      ).toBeNull()
    })
  })

  describe('Redgifs', () => {
    it('extracts redgif ID from watch URL', () => {
      const post = createPost({
        url: 'https://www.redgifs.com/watch/coolcat',
        domain: 'redgifs.com'
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('redgif')
      if (result?.type === 'redgif') {
        expect(result.id).toBe('coolcat')
      }
    })

    it('extracts redgif ID from ifr URL', () => {
      const post = createPost({
        url: 'https://www.redgifs.com/ifr/coolcat',
        domain: 'redgifs.com'
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('redgif')
    })

    it('extracts from secure_media oembed', () => {
      const post = createPost({
        url: 'https://example.com',
        domain: 'example.com',
        secure_media: {
          oembed: {
            provider_name: 'Redgifs',
            provider_url: 'https://redgifs.com',
            thumbnail_url: 'https://thumbs2.redgifs.com/CoolCat-mobile.jpg'
          }
        }
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('redgif')
      if (result?.type === 'redgif') {
        expect(result.id).toBe('coolcat')
      }
    })
  })

  describe('preview fallback', () => {
    it('uses preview image when no direct URL', () => {
      const post = createPost({
        url: 'https://example.com/article',
        domain: 'example.com',
        preview: {
          enabled: true,
          images: [
            {
              id: 'preview1',
              source: {
                url: 'https://preview.redd.it/abc123.jpg?width=1920&amp;format=pjpg',
                width: 1920,
                height: 1080
              },
              resolutions: []
            }
          ]
        }
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('image')
      // Note: HTML entities should be unescaped
      expect(result?.url).toBe('https://preview.redd.it/abc123.jpg?width=1920&format=pjpg')
    })

    it('prefers mp4 variant in preview', () => {
      const post = createPost({
        url: 'https://example.com/article',
        domain: 'example.com',
        preview: {
          enabled: true,
          images: [
            {
              id: 'preview1',
              source: {
                url: 'https://preview.redd.it/abc123.gif',
                width: 1920,
                height: 1080
              },
              resolutions: [],
              variants: {
                mp4: {
                  source: {
                    url: 'https://preview.redd.it/abc123.mp4?format=mp4',
                    width: 1920,
                    height: 1080
                  },
                  resolutions: []
                }
              }
            }
          ]
        }
      })
      const result = extractMedia(post)
      expect(result?.type).toBe('video')
    })
  })
})

describe('extractAllMedia', () => {
  it('filters out null results', () => {
    const posts = [
      {
        data: {
          id: '1',
          name: 't3_1',
          title: 'Self Post',
          author: 'test',
          subreddit: 'test',
          subreddit_name_prefixed: 'r/test',
          permalink: '/r/test/1',
          url: '',
          domain: '',
          created_utc: 0,
          score: 0,
          num_comments: 0,
          over_18: false,
          is_self: true,
          is_video: false
        }
      },
      {
        data: {
          id: '2',
          name: 't3_2',
          title: 'Image Post',
          author: 'test',
          subreddit: 'test',
          subreddit_name_prefixed: 'r/test',
          permalink: '/r/test/2',
          url: 'https://i.redd.it/test.jpg',
          domain: 'i.redd.it',
          created_utc: 0,
          score: 0,
          num_comments: 0,
          over_18: false,
          is_self: false,
          is_video: false
        }
      }
    ]

    const results = extractAllMedia(posts)
    expect(results).toHaveLength(1)
    expect(results[0].type).toBe('image')
  })
})
