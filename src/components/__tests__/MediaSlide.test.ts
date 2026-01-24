import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MediaSlide from '../MediaSlide.vue'
import type { MediaItem, AppSettings } from '../../types/media'
import type { RedditPost } from '../../types/reddit'

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    mediaMount: vi.fn(),
    slideUnmount: vi.fn(),
    startTimer: vi.fn(),
    endTimer: vi.fn()
  }
}))

// Mock child components
vi.mock('../ImageSlide.vue', () => ({
  default: {
    name: 'ImageSlide',
    template: '<div class="image-slide-mock" data-testid="image-slide">Image Slide</div>',
    props: ['url', 'active', 'nsfw', 'nsfwMode'],
    emits: ['loaded', 'error']
  }
}))

vi.mock('../VideoSlide.vue', () => ({
  default: {
    name: 'VideoSlide',
    template: '<div class="video-slide-mock" data-testid="video-slide">Video Slide</div>',
    props: ['url', 'hlsUrl', 'autoplay', 'muted', 'loop', 'active', 'nsfw', 'nsfwMode'],
    emits: ['loaded', 'ended', 'error'],
    methods: {
      seekRelative: vi.fn()
    }
  }
}))

vi.mock('../GallerySlide.vue', () => ({
  default: {
    name: 'GallerySlide',
    template: '<div class="gallery-slide-mock" data-testid="gallery-slide">Gallery Slide</div>',
    props: ['items', 'active', 'nsfw', 'nsfwMode'],
    emits: ['loaded', 'complete'],
    methods: {
      next: vi.fn(),
      prev: vi.fn()
    },
    setup() {
      return { currentIndex: 0 }
    }
  }
}))

vi.mock('../RedgifSlide.vue', () => ({
  default: {
    name: 'RedgifSlide',
    template: '<div class="redgif-slide-mock" data-testid="redgif-slide">Redgif Slide</div>',
    props: ['id', 'autoplay', 'muted', 'loop', 'active', 'nsfw', 'nsfwMode'],
    emits: ['loaded', 'ended', 'error'],
    methods: {
      seekRelative: vi.fn()
    }
  }
}))

describe('MediaSlide', () => {
  const mockPost: RedditPost = {
    id: 'test123',
    name: 't3_test123',
    title: 'Test Post',
    author: 'testuser',
    subreddit: 'test',
    subreddit_name_prefixed: 'r/test',
    permalink: '/r/test/test123/',
    url: 'https://i.redd.it/test.jpg',
    domain: 'i.redd.it',
    created_utc: Date.now() / 1000,
    score: 100,
    num_comments: 10,
    over_18: false,
    is_self: false,
    is_video: false
  }

  const defaultSettings: AppSettings = {
    autoNext: {
      enabled: true,
      imageDelay: 5000,
      videoMode: 'wait',
      galleryMode: 'all'
    },
    display: {
      showInfo: true,
      showProgress: true,
      theme: 'dark'
    },
    video: {
      autoplay: true,
      muted: true,
      loop: false
    },
    content: {
      nsfwMode: 'show',
      minUpvotes: 0
    },
    navigation: {
      swipeSensitivity: 50,
      keyboardEnabled: true
    },
    performance: {
      preloadEnabled: true
    }
  }

  function createMediaItem(overrides: Partial<MediaItem> = {}): MediaItem {
    return {
      type: 'image',
      url: 'https://i.redd.it/test.jpg',
      post: mockPost,
      ...overrides
    } as MediaItem
  }

  it('renders ImageSlide for image type', () => {
    const media = createMediaItem({ type: 'image', url: 'https://i.redd.it/test.jpg' })

    const wrapper = mount(MediaSlide, {
      props: {
        media,
        active: true,
        settings: defaultSettings
      }
    })

    expect(wrapper.find('[data-testid="image-slide"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="video-slide"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="gallery-slide"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="redgif-slide"]').exists()).toBe(false)
  })

  it('renders VideoSlide for video type', () => {
    const media = createMediaItem({
      type: 'video',
      url: 'https://v.redd.it/test.mp4'
    })

    const wrapper = mount(MediaSlide, {
      props: {
        media,
        active: true,
        settings: defaultSettings
      }
    })

    expect(wrapper.find('[data-testid="video-slide"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="image-slide"]').exists()).toBe(false)
  })

  it('renders GallerySlide for gallery type', () => {
    const media = createMediaItem({
      type: 'gallery',
      items: [{ url: 'https://i.redd.it/1.jpg' }, { url: 'https://i.redd.it/2.jpg' }]
    })

    const wrapper = mount(MediaSlide, {
      props: {
        media,
        active: true,
        settings: defaultSettings
      }
    })

    expect(wrapper.find('[data-testid="gallery-slide"]').exists()).toBe(true)
  })

  it('renders RedgifSlide for redgif type', () => {
    const media = createMediaItem({
      type: 'redgif',
      id: 'testgif'
    })

    const wrapper = mount(MediaSlide, {
      props: {
        media,
        active: true,
        settings: defaultSettings
      }
    })

    expect(wrapper.find('[data-testid="redgif-slide"]').exists()).toBe(true)
  })

  it('renders unsupported fallback for unknown type', () => {
    const media = {
      type: 'unknown' as const,
      post: mockPost
    }

    const wrapper = mount(MediaSlide, {
      props: {
        media: media as MediaItem,
        active: true,
        settings: defaultSettings
      }
    })

    expect(wrapper.find('.unsupported').exists()).toBe(true)
    expect(wrapper.text()).toContain('Unsupported media type')
  })

  it('detects NSFW posts', () => {
    const nsfwPost = { ...mockPost, over_18: true }
    const media = createMediaItem({ post: nsfwPost })

    const wrapper = mount(MediaSlide, {
      props: {
        media,
        active: true,
        settings: defaultSettings
      }
    })

    // The ImageSlide mock should receive nsfw=true
    const imageSlide = wrapper.findComponent({ name: 'ImageSlide' })
    expect(imageSlide.props('nsfw')).toBe(true)
  })

  it('exposes isGallery method', () => {
    const galleryMedia = createMediaItem({
      type: 'gallery',
      items: [{ url: 'test.jpg' }]
    })

    const wrapper = mount(MediaSlide, {
      props: {
        media: galleryMedia,
        active: true,
        settings: defaultSettings
      }
    })

    expect(wrapper.vm.isGallery()).toBe(true)

    const imageMedia = createMediaItem({ type: 'image' })
    const wrapper2 = mount(MediaSlide, {
      props: {
        media: imageMedia,
        active: true,
        settings: defaultSettings
      }
    })

    expect(wrapper2.vm.isGallery()).toBe(false)
  })

  it('loops videos when auto-next is disabled', () => {
    const settingsWithAutoNextDisabled = {
      ...defaultSettings,
      autoNext: { ...defaultSettings.autoNext, enabled: false }
    }

    const media = createMediaItem({ type: 'video', url: 'test.mp4' })

    const wrapper = mount(MediaSlide, {
      props: {
        media,
        active: true,
        settings: settingsWithAutoNextDisabled
      }
    })

    const videoSlide = wrapper.findComponent({ name: 'VideoSlide' })
    expect(videoSlide.props('loop')).toBe(true)
  })

  it('uses loop setting when auto-next is enabled', () => {
    const settingsWithLoop = {
      ...defaultSettings,
      video: { ...defaultSettings.video, loop: true }
    }

    const media = createMediaItem({ type: 'video', url: 'test.mp4' })

    const wrapper = mount(MediaSlide, {
      props: {
        media,
        active: true,
        settings: settingsWithLoop
      }
    })

    const videoSlide = wrapper.findComponent({ name: 'VideoSlide' })
    expect(videoSlide.props('loop')).toBe(true)
  })
})
