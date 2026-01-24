<script setup>
import { ref, watch, onMounted } from 'vue'
import VideoSlide from './VideoSlide.vue'
import { logger } from '../utils/logger.js'
import { getRedgifsToken, clearRedgifsToken } from '../services/redgifsAuth'
import { isValidRedgifsGifResponse } from '../utils/apiValidation'

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  muted: {
    type: Boolean,
    default: true
  },
  loop: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: false
  },
  nsfw: {
    type: Boolean,
    default: false
  },
  nsfwMode: {
    type: String,
    default: 'show'
  },
  frameStyle: {
    type: String,
    default: 'none'
  },
  userActive: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['loaded', 'ended', 'error'])

const videoUrl = ref(null)
const loading = ref(true)
const error = ref(null)
const videoRef = ref(null)

// Rewrite Redgifs media URLs to go through our proxy (avoids CORS issues)
function proxyRedgifsUrl(url) {
  if (!url) return url
  return url.replace('https://media.redgifs.com/', '/media/redgifs/')
}

async function fetchRedgifUrl() {
  loading.value = true
  error.value = null

  try {
    logger.log('fetch', `[redgif] Fetching ${props.id}`)
    logger.startTimer(`redgif-${props.id}`)

    // Get cached token (or fetch new one)
    logger.startTimer(`redgif-token-${props.id}`)
    const token = await getRedgifsToken()
    logger.endTimer(`redgif-token-${props.id}`)

    // Then fetch the gif data (via proxy) with timeout
    logger.startTimer(`redgif-data-${props.id}`)
    const gifRes = await fetch(`/api/redgifs/v2/gifs/${props.id}`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: AbortSignal.timeout(10000)
    })

    // If we get a 401, clear the token and retry once
    if (gifRes.status === 401) {
      clearRedgifsToken()
      const newToken = await getRedgifsToken()
      const retryRes = await fetch(`/api/redgifs/v2/gifs/${props.id}`, {
        headers: {
          Authorization: `Bearer ${newToken}`
        },
        signal: AbortSignal.timeout(10000)
      })
      if (!retryRes.ok) throw new Error('Failed to fetch gif after token refresh')
      const retryData = await retryRes.json()
      if (!isValidRedgifsGifResponse(retryData)) {
        throw new Error('Invalid response from Redgifs API')
      }
      videoUrl.value = proxyRedgifsUrl(retryData.gif.urls.hd || retryData.gif.urls.sd)
    } else {
      if (!gifRes.ok) throw new Error('Failed to fetch gif')
      const gifData = await gifRes.json()
      logger.endTimer(`redgif-data-${props.id}`)

      // Validate response structure
      if (!isValidRedgifsGifResponse(gifData)) {
        throw new Error('Invalid response from Redgifs API')
      }

      // Get HD URL (proxied to avoid CORS)
      videoUrl.value = proxyRedgifsUrl(gifData.gif.urls.hd || gifData.gif.urls.sd)
    }

    if (!videoUrl.value) throw new Error('No video URL found')

    logger.endTimer(`redgif-${props.id}`, videoUrl.value?.slice(0, 60))
  } catch (e) {
    console.error('Redgif fetch error:', e)
    logger.log('error', `[redgif] ${props.id} failed:`, e.message)
    error.value = e.message
    emit('error')
  } finally {
    loading.value = false
  }
}

function onLoaded() {
  emit('loaded')
}

function onEnded() {
  emit('ended')
}

function onError() {
  emit('error')
}

onMounted(() => {
  fetchRedgifUrl()
})

// Refetch if ID changes
watch(
  () => props.id,
  () => {
    fetchRedgifUrl()
  }
)

function seekRelative(seconds) {
  videoRef.value?.seekRelative?.(seconds)
}

defineExpose({ videoRef, seekRelative })
</script>

<template>
  <div class="redgif-slide">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else-if="error" class="error">
      <span>Failed to load Redgif</span>
    </div>

    <VideoSlide
      v-else-if="videoUrl"
      ref="videoRef"
      :url="videoUrl"
      :autoplay="autoplay"
      :muted="muted"
      :loop="loop"
      :active="active"
      :nsfw="nsfw"
      :nsfw-mode="nsfwMode"
      :frame-style="frameStyle"
      :user-active="userActive"
      @loaded="onLoaded"
      @ended="onEnded"
      @error="onError"
    />
  </div>
</template>

<style scoped>
.redgif-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color, #000);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  color: #ff6b6b;
  font-size: 14px;
}
</style>
