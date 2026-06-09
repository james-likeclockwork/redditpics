import type { RedditPost } from './reddit'

// Extracted media types
export type MediaType = 'image' | 'video' | 'gallery' | 'redgif'

export interface BaseMediaItem {
  type: MediaType
  post: RedditPost
}

export interface ImageMediaItem extends BaseMediaItem {
  type: 'image'
  url: string
  width?: number
  height?: number
}

export interface VideoMediaItem extends BaseMediaItem {
  type: 'video'
  url: string
  hlsUrl?: string
  width?: number
  height?: number
  duration?: number
  hasAudio?: boolean
}

export interface GalleryMediaItem extends BaseMediaItem {
  type: 'gallery'
  items: GalleryItem[]
}

export interface GalleryItem {
  url: string
  width?: number
  height?: number
  isVideo?: boolean
}

export interface RedgifMediaItem extends BaseMediaItem {
  type: 'redgif'
  id: string
}

export type MediaItem = ImageMediaItem | VideoMediaItem | GalleryMediaItem | RedgifMediaItem

// Extended media item with virtual index for rendering.
// MediaItem is a union, so this must be an intersection type rather than an
// interface (an interface cannot `extends` a union).
export type MediaItemWithIndex = MediaItem & {
  virtualIndex?: number
}

// Settings types
export interface AppSettings {
  autoNext: AutoNextSettings
  display: DisplaySettings
  video: VideoSettings
  content: ContentSettings
  navigation: NavigationSettings
  performance: PerformanceSettings
}

export interface AutoNextSettings {
  enabled: boolean
  imageDelay: number
  videoMode: 'wait' | 'fixed' | 'skip'
  galleryMode: 'all' | 'fixed'
}

export interface DisplaySettings {
  showInfo: boolean
  showProgress: boolean
  theme: 'dark' | 'light'
}

export interface VideoSettings {
  autoplay: boolean
  muted: boolean
  loop: boolean
}

export interface ContentSettings {
  nsfwMode: 'show' | 'blur' | 'hide'
  minUpvotes: number
}

export interface NavigationSettings {
  swipeSensitivity: number
  keyboardEnabled: boolean
}

export interface PerformanceSettings {
  preloadEnabled: boolean
}
