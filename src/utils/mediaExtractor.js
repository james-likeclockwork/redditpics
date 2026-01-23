/**
 * Extracts media URLs from Reddit post data
 * Returns an object with type and url(s)
 */

function unescapeHtml(str) {
  if (!str) return str
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function getExtension(url) {
  try {
    const pathname = new URL(url).pathname
    const ext = pathname.split('.').pop().toLowerCase()
    return ext
  } catch {
    return ''
  }
}

function isImageUrl(url) {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  return imageExts.includes(getExtension(url))
}

function isVideoUrl(url) {
  const videoExts = ['mp4', 'webm', 'mov']
  return videoExts.includes(getExtension(url))
}

function isGifvUrl(url) {
  return getExtension(url) === 'gifv'
}

export function extractMedia(post) {
  const data = post.data || post

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

  // Reddit Gallery
  if (data.is_gallery && data.gallery_data && data.media_metadata) {
    const items = data.gallery_data.items || []
    const images = items
      .map(item => {
        const meta = data.media_metadata[item.media_id]
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
            return {
              url: unescapeHtml(meta.s.mp4 || meta.s.gif),
              width: meta.s.x,
              height: meta.s.y,
              isVideo: !!meta.s.mp4
            }
          }
        }
        return null
      })
      .filter(Boolean)

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
      return {
        type: 'image',
        url: `https://i.imgur.com/${imgurMatch[1]}.jpg`,
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
    const redgifMatch = url.match(/redgifs\.com\/(?:watch|ifr)\/(\w+)/i) ||
                        url.match(/redgifs\.com\/(\w+)$/i)
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
    const destMatch = destUrl.match(/redgifs\.com\/(?:watch|ifr)\/(\w+)/i) ||
                      destUrl.match(/redgifs\.com\/(\w+)$/i)
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

  // Reddit preview images (fallback)
  if (data.preview?.images?.[0]) {
    const preview = data.preview.images[0]

    // Check for video variant first
    if (preview.variants?.mp4?.source?.url) {
      return {
        type: 'video',
        url: unescapeHtml(preview.variants.mp4.source.url),
        post: data
      }
    }

    // Use source image
    if (preview.source?.url) {
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

export function extractAllMedia(posts) {
  return posts
    .map(post => extractMedia(post))
    .filter(Boolean)
}
