<script setup>
import { ref, watch, onMounted } from 'vue'
import VideoSlide from './VideoSlide.vue'

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
  }
})

const emit = defineEmits(['loaded', 'ended', 'error'])

const videoUrl = ref(null)
const loading = ref(true)
const error = ref(null)
const videoRef = ref(null)

async function fetchRedgifUrl() {
  loading.value = true
  error.value = null

  try {
    // First get a temporary token (via proxy)
    const tokenRes = await fetch('/api/redgifs/v2/auth/temporary')
    if (!tokenRes.ok) throw new Error('Failed to get token')
    const tokenData = await tokenRes.json()
    const token = tokenData.token

    // Then fetch the gif data (via proxy)
    const gifRes = await fetch(`/api/redgifs/v2/gifs/${props.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    if (!gifRes.ok) throw new Error('Failed to fetch gif')
    const gifData = await gifRes.json()

    // Get HD URL
    videoUrl.value = gifData.gif?.urls?.hd || gifData.gif?.urls?.sd
    if (!videoUrl.value) throw new Error('No video URL found')
  } catch (e) {
    console.error('Redgif fetch error:', e)
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
watch(() => props.id, () => {
  fetchRedgifUrl()
})

defineExpose({ videoRef })
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
  background: #000;
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
