import { getRedgifsToken, clearRedgifsToken } from './redgifsAuth'
import { isValidRedgifsGifResponse, type RedgifsGifResponse } from '../utils/apiValidation'
import { withRetry, isRetryableError } from '../utils/retry'
import { logger } from '../utils/logger'

const DEFAULT_TIMEOUT = 10000

export interface RedgifsVideoInfo {
  id: string
  hdUrl?: string
  sdUrl?: string
  posterUrl?: string
  thumbnailUrl?: string
  width: number
  height: number
  duration: number
}

/**
 * Fetch video info from Redgifs API
 */
export async function fetchRedgifsVideo(gifId: string): Promise<RedgifsVideoInfo> {
  logger.log('fetch', `[redgifs] Fetching ${gifId}`)

  const data = await withRetry<RedgifsGifResponse>(
    async () => {
      const token = await getRedgifsToken()

      const response = await fetch(`/api/redgifs/v2/gifs/${gifId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
      })

      // Handle auth errors by refreshing token and retrying
      if (response.status === 401) {
        clearRedgifsToken()
        const newToken = await getRedgifsToken()

        const retryResponse = await fetch(`/api/redgifs/v2/gifs/${gifId}`, {
          headers: {
            Authorization: `Bearer ${newToken}`
          },
          signal: AbortSignal.timeout(DEFAULT_TIMEOUT)
        })

        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}: Failed after token refresh`)
        }

        const retryData = await retryResponse.json()
        if (!isValidRedgifsGifResponse(retryData)) {
          throw new Error('Invalid response from Redgifs API')
        }

        return retryData
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const jsonData = await response.json()

      if (!isValidRedgifsGifResponse(jsonData)) {
        throw new Error('Invalid response from Redgifs API')
      }

      return jsonData
    },
    {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 2000,
      shouldRetry: (error) => {
        // Don't retry auth errors (we handle those specially above)
        if (error.message.includes('401') || error.message.includes('token')) {
          return false
        }
        return isRetryableError(error)
      }
    }
  )

  const gif = data.gif

  return {
    id: gif.id,
    hdUrl: gif.urls.hd,
    sdUrl: gif.urls.sd,
    posterUrl: gif.urls.poster,
    thumbnailUrl: gif.urls.thumbnail,
    width: gif.width,
    height: gif.height,
    duration: gif.duration
  }
}

/**
 * Get the best available video URL
 */
export function getBestVideoUrl(info: RedgifsVideoInfo): string | null {
  return info.hdUrl || info.sdUrl || null
}
