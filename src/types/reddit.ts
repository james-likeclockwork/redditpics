// Reddit API types

export interface RedditListing<T> {
  kind: 'Listing'
  data: {
    after: string | null
    before: string | null
    children: Array<{ kind: string; data: T }>
    dist: number
    modhash: string
  }
}

export interface RedditPost {
  id: string
  name: string
  title: string
  author: string
  subreddit: string
  subreddit_name_prefixed: string
  permalink: string
  url: string
  domain: string
  created_utc: number
  score: number
  num_comments: number
  over_18: boolean
  is_self: boolean
  is_video: boolean
  is_gallery?: boolean
  selftext?: string
  selftext_html?: string
  removed_by_category?: string
  removed?: boolean
  deleted?: boolean
  url_overridden_by_dest?: string
  post_hint?: string // 'image', 'hosted:video', 'rich:video', 'link', 'self', etc.
  thumbnail?: string // URL or 'default', 'self', 'nsfw', 'spoiler'

  // Media fields
  preview?: RedditPreview
  media?: RedditMedia
  secure_media?: RedditMedia
  gallery_data?: RedditGalleryData
  media_metadata?: Record<string, RedditMediaMetadata>

  // Crosspost
  crosspost_parent_list?: RedditPost[]
}

export interface RedditPreview {
  enabled: boolean
  images: RedditPreviewImage[]
}

export interface RedditPreviewImage {
  id: string
  source: RedditImageSource
  resolutions: RedditImageSource[]
  variants?: {
    gif?: { source: RedditImageSource; resolutions: RedditImageSource[] }
    mp4?: { source: RedditImageSource; resolutions: RedditImageSource[] }
  }
}

export interface RedditImageSource {
  url: string
  width: number
  height: number
}

export interface RedditMedia {
  reddit_video?: RedditVideo
  oembed?: RedditOEmbed
}

export interface RedditVideo {
  fallback_url: string
  hls_url?: string
  dash_url?: string
  width: number
  height: number
  duration: number
  has_audio: boolean
  is_gif: boolean
}

export interface RedditOEmbed {
  provider_name: string
  provider_url: string
  title?: string
  thumbnail_url?: string
  thumbnail_width?: number
  thumbnail_height?: number
  html?: string
}

export interface RedditGalleryData {
  items: Array<{
    media_id: string
    id: number
    caption?: string
    outbound_url?: string
  }>
}

export interface RedditMediaMetadata {
  status: string
  e: 'Image' | 'AnimatedImage' | 'RedditVideo'
  m?: string // mime type
  p?: RedditImageSource[] // preview sizes
  s?: {
    x: number
    y: number
    u?: string // url
    gif?: string
    mp4?: string
  }
  id: string
}

// Sort options
export type RedditSort = 'hot' | 'new' | 'rising' | 'top' | 'controversial'
export type RedditTimeFilter = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' | ''

export interface RedditFetchParams {
  subreddits: string
  sort: RedditSort
  timeFilter: RedditTimeFilter
  after?: string | null
  limit?: number
}
