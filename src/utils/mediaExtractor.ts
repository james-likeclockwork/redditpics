/**
 * Extracts media URLs from Reddit post data
 * Returns an object with type and url(s)
 */

import type { RedditPost } from '../types/reddit'
import type { MediaItem, GalleryItem } from '../types/media'

/**
 * Safely unescape HTML entities using DOMParser
 * This is secure against XSS and handles all HTML entities including double-encoded ones
 */
export function unescapeHtml(str: string | null | undefined): string {
  if (!str) return str ?? ''

  // Use DOMParser for secure HTML entity decoding
  const doc = new DOMParser().parseFromString(str, 'text/html')
  return doc.documentElement.textContent ?? ''
}

function getExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop()?.toLowerCase() ?? ''
    return ext
  } catch {
    return ''
  }
}

function isImageUrl(url: string): boolean {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  return imageExts.includes(getExtension(url))
}

function isVideoUrl(url: string): boolean {
  const videoExts = ['mp4', 'webm', 'mov']
  return videoExts.includes(getExtension(url))
}

function isGifvUrl(url: string): boolean {
  return getExtension(url) === 'gifv'
}

/**
 * Check if an Imgur URL is a known "removed" or "no longer available" placeholder
 */
function isImgurRemovedPlaceholder(url: string): boolean {
  // Known Imgur placeholder image IDs for removed/deleted content
  const removedPatterns = [
    /i\.imgur\.com\/removed\./i,
    /i\.imgur\.com\/deleted\./i,
    // The actual "image does not exist" placeholder ID
    /i\.imgur\.com\/hxseNbg\./i,
    // Another common removed image placeholder
    /i\.imgur\.com\/a0HlREy\./i
  ]
  return removedPatterns.some((pattern) => pattern.test(url))
}

export function extractMedia(post: { data?: RedditPost } | RedditPost): MediaItem | null {
  const data: RedditPost = (post as { data?: RedditPost }).data || (post as RedditPost)

  // Skip self posts (text only)
  if (data.is_self) {
    return null
  }

  // Skip removed/deleted posts
  if (data.removed_by_category || data.removed || data.deleted) {
    return null
  }

  const url = data.url || ''
  const domain = data.domain || ''

  // Skip external video sites we can't embed (YouTube, Vimeo, TikTok, etc.)
  const externalVideoDomains = [
    'youtube.com',
    'youtu.be',
    'www.youtube.com',
    'm.youtube.com',
    'vimeo.com',
    'www.vimeo.com',
    'tiktok.com',
    'www.tiktok.com',
    'vm.tiktok.com',
    'twitch.tv',
    'www.twitch.tv',
    'clips.twitch.tv',
    'streamable.com',
    'www.streamable.com'
  ]
  if (externalVideoDomains.some((d) => domain.includes(d))) {
    return null
  }

  // Reddit Gallery
  if (data.is_gallery && data.gallery_data && data.media_metadata) {
    const items = data.gallery_data.items || []
    const images: GalleryItem[] = items
      .map((item) => {
        const meta = data.media_metadata?.[item.media_id]
        if (!meta) return null

        // Get the best quality source
        if (meta.s) {
          if (meta.e === 'Image') {
            return {
              url: unescapeHtml(meta.s.u || meta.s.gif),
              width: meta.s.x,
              height: meta.s.y
            }
          }
          if (meta.e === 'AnimatedImage') {
            // Prefer gif URL for galleries since GallerySlide uses <img> tags
            // GIFs auto-animate in img tags and are simpler than mixed video/image handling
            return {
              url: unescapeHtml(meta.s.gif || meta.s.mp4),
              width: meta.s.x,
              height: meta.s.y,
              isVideo: false
            }
          }
        }
        return null
      })
      .filter((item): item is GalleryItem => item !== null)

    if (images.length > 0) {
      return {
        type: 'gallery',
        items: images,
        post: data
      }
    }
  }

  // Reddit Video
  if (data.is_video && data.media?.reddit_video) {
    const video = data.media.reddit_video
    return {
      type: 'video',
      url: video.fallback_url,
      hlsUrl: video.hls_url,
      width: video.width,
      height: video.height,
      duration: video.duration,
      hasAudio: video.has_audio,
      post: data
    }
  }

  // Crosspost video
  if (data.crosspost_parent_list?.[0]?.is_video) {
    const crosspost = data.crosspost_parent_list[0]
    const video = crosspost.media?.reddit_video
    if (video) {
      return {
        type: 'video',
        url: video.fallback_url,
        hlsUrl: video.hls_url,
        width: video.width,
        height: video.height,
        duration: video.duration,
        hasAudio: video.has_audio,
        post: data
      }
    }
  }

  // i.redd.it images
  if (domain === 'i.redd.it' && isImageUrl(url)) {
    return {
      type: 'image',
      url: url,
      post: data
    }
  }

  // i.redd.it gifs (actually videos)
  if (domain === 'i.redd.it' && getExtension(url) === 'gif') {
    // Check for mp4 preview
    const mp4Preview = data.preview?.images?.[0]?.variants?.mp4?.source?.url
    if (mp4Preview) {
      return {
        type: 'video',
        url: unescapeHtml(mp4Preview),
        post: data
      }
    }
    return {
      type: 'image',
      url: url,
      post: data
    }
  }

  // Imgur
  if (domain.includes('imgur.com')) {
    // Skip known "removed" placeholder images
    if (isImgurRemovedPlaceholder(url)) {
      return null
    }

    // Imgur gifv -> mp4
    if (isGifvUrl(url)) {
      return {
        type: 'video',
        url: url.replace('.gifv', '.mp4'),
        post: data
      }
    }

    // Direct imgur image
    if (isImageUrl(url)) {
      return {
        type: 'image',
        url: url,
        post: data
      }
    }

    // Imgur page (not direct link) - try to make it direct
    const imgurMatch = url.match(/imgur\.com\/(\w+)$/)
    if (imgurMatch) {
      const directUrl = `https://i.imgur.com/${imgurMatch[1]}.jpg`
      // Check if the constructed URL is a known placeholder
      if (isImgurRemovedPlaceholder(directUrl)) {
        return null
      }
      return {
        type: 'image',
        url: directUrl,
        post: data
      }
    }

    // Imgur album - skip for now (would need API)
    if (url.includes('/a/') || url.includes('/gallery/')) {
      return null
    }
  }

  // Gfycat
  if (domain.includes('gfycat.com')) {
    const gfyMatch = url.match(/gfycat\.com\/(?:ifr\/)?(\w+)/i)
    if (gfyMatch) {
      const gfyId = gfyMatch[1].split('-')[0] // Remove any suffix
      return {
        type: 'video',
        url: `https://giant.gfycat.com/${gfyId}.mp4`,
        post: data
      }
    }
  }

  // Redgifs - check multiple URL patterns and sources
  if (domain.includes('redgifs.com') || url.includes('redgifs.com')) {
    // Try multiple patterns: /watch/, /ifr/, or just the ID at the end
    const redgifMatch =
      url.match(/redgifs\.com\/(?:watch|ifr)\/(\w+)/i) || url.match(/redgifs\.com\/(\w+)$/i)
    if (redgifMatch) {
      return {
        type: 'redgif',
        id: redgifMatch[1].toLowerCase(),
        post: data
      }
    }
  }

  // Check for redgifs in secure_media embed
  if (data.secure_media?.oembed?.provider_name?.toLowerCase() === 'redgifs') {
    const embedUrl = data.secure_media.oembed.thumbnail_url || ''
    // Try standard URL patterns first
    let embedMatch = embedUrl.match(/redgifs\.com\/(?:watch|ifr)\/(\w+)/i)
    // Try thumbnail URL pattern: thumbsXX.redgifs.com/SomeIdHere-mobile.jpg
    if (!embedMatch) {
      embedMatch = embedUrl.match(/thumbs\d*\.redgifs\.com\/([A-Za-z]+)-/i)
    }
    if (embedMatch) {
      return {
        type: 'redgif',
        id: embedMatch[1].toLowerCase(),
        post: data
      }
    }
  }

  // Also check media field for redgifs
  if (data.media?.oembed?.provider_name?.toLowerCase() === 'redgifs') {
    const embedUrl = data.media.oembed.thumbnail_url || ''
    let embedMatch = embedUrl.match(/redgifs\.com\/(?:watch|ifr)\/(\w+)/i)
    if (!embedMatch) {
      embedMatch = embedUrl.match(/thumbs\d*\.redgifs\.com\/([A-Za-z]+)-/i)
    }
    if (embedMatch) {
      return {
        type: 'redgif',
        id: embedMatch[1].toLowerCase(),
        post: data
      }
    }
  }

  // Check url_overridden_by_dest for redgifs
  const destUrl = data.url_overridden_by_dest || ''
  if (destUrl.includes('redgifs.com')) {
    const destMatch =
      destUrl.match(/redgifs\.com\/(?:watch|ifr)\/(\w+)/i) || destUrl.match(/redgifs\.com\/(\w+)$/i)
    if (destMatch) {
      return {
        type: 'redgif',
        id: destMatch[1].toLowerCase(),
        post: data
      }
    }
  }

  // Direct video URLs
  if (isVideoUrl(url)) {
    return {
      type: 'video',
      url: url,
      post: data
    }
  }

  // Direct image URLs
  if (isImageUrl(url)) {
    return {
      type: 'image',
      url: url,
      post: data
    }
  }

  // Reddit preview images (fallback) - only for posts Reddit identifies as images
  // Skip article links that just have preview thumbnails
  if (data.preview?.images?.[0]) {
    const preview = data.preview.images[0]
    const postHint = data.post_hint || ''

    // Check for video variant first - these are valid
    if (preview.variants?.mp4?.source?.url) {
      return {
        type: 'video',
        url: unescapeHtml(preview.variants.mp4.source.url),
        post: data
      }
    }

    // Only use preview source if Reddit explicitly identifies this as an image post
    // Don't show article/link thumbnails even if they're large
    if (preview.source?.url && postHint === 'image') {
      return {
        type: 'image',
        url: unescapeHtml(preview.source.url),
        width: preview.source.width,
        height: preview.source.height,
        post: data
      }
    }
  }

  // No supported media found
  return null
}

export function extractAllMedia(posts: Array<{ data?: RedditPost } | RedditPost>): MediaItem[] {
  return posts.map((post) => extractMedia(post)).filter((item): item is MediaItem => item !== null)
}
