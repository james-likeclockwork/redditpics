<script setup>
import { ref, watch, onUnmounted, computed } from 'vue'

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  hlsUrl: {
    type: String,
    default: null
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

const emit = defineEmits(['loaded', 'ended', 'error', 'timeupdate'])

const videoRef = ref(null)
const loaded = ref(false)
const error = ref(false)
const playing = ref(false)
const isMuted = ref(props.muted)
const currentTime = ref(0)
const duration = ref(0)
const showNsfw = ref(false)

// Sync muted state when prop changes (e.g., from keyboard shortcut)
watch(() => props.muted, (newVal) => {
  isMuted.value = newVal
  if (videoRef.value) {
    videoRef.value.muted = newVal
  }
})

const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

const shouldBlur = computed(() => props.nsfw && props.nsfwMode === 'blur' && !showNsfw.value)

function onCanPlay() {
  // Video has enough data to start playing
  if (!loaded.value) {
    loaded.value = true
    duration.value = videoRef.value?.duration || 0
    emit('loaded')
  }

  // Auto-play if active
  if (props.active && props.autoplay && !playing.value) {
    play()
  }
}

function onLoadedData() {
  duration.value = videoRef.value?.duration || 0
  if (!loaded.value) {
    loaded.value = true
    emit('loaded')
  }
}

function onError() {
  error.value = true
  emit('error')
}

function onEnded() {
  playing.value = false
  emit('ended')
}

function onTimeUpdate() {
  currentTime.value = videoRef.value?.currentTime || 0
  emit('timeupdate', currentTime.value, duration.value)
}

function play() {
  if (videoRef.value) {
    videoRef.value.play().catch(() => {
      // Autoplay may be blocked
    })
    playing.value = true
  }
}

function pause() {
  if (videoRef.value) {
    videoRef.value.pause()
    playing.value = false
  }
}

function togglePlay() {
  if (playing.value) {
    pause()
  } else {
    play()
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (videoRef.value) {
    videoRef.value.muted = isMuted.value
  }
}

function seek(percent) {
  if (videoRef.value && duration.value > 0) {
    videoRef.value.currentTime = (percent / 100) * duration.value
  }
}

function revealNsfw() {
  showNsfw.value = true
}

// Watch active state
watch(() => props.active, (isActive) => {
  if (isActive) {
    // Reset to start when becoming active
    if (videoRef.value) {
      videoRef.value.currentTime = 0
    }
    if (props.autoplay) {
      play()
    }
  } else {
    pause()
    // Reset to start when leaving
    if (videoRef.value) {
      videoRef.value.currentTime = 0
    }
  }
})

function seekRelative(seconds) {
  if (videoRef.value) {
    const newTime = videoRef.value.currentTime + seconds
    videoRef.value.currentTime = Math.max(0, Math.min(videoRef.value.duration || Infinity, newTime))
  }
}

// Expose methods for parent
defineExpose({ play, pause, togglePlay, toggleMute, seek, seekRelative })

onUnmounted(() => {
  pause()
})
</script>

<template>
  <div class="video-slide" @click="togglePlay">
    <div v-if="!loaded && !error" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-if="error" class="error">
      <span>Failed to load video</span>
    </div>

    <video
      ref="videoRef"
      v-show="loaded && !error"
      :src="url"
      :muted="isMuted"
      :loop="loop"
      :class="{ blur: shouldBlur }"
      playsinline
      preload="auto"
      @canplay="onCanPlay"
      @loadeddata="onLoadedData"
      @error="onError"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      @play="playing = true"
      @pause="playing = false"
    />

    <div
      v-if="nsfw && nsfwMode === 'blur' && !showNsfw"
      class="nsfw-overlay"
      @click.stop="revealNsfw"
    >
      <span>NSFW - Tap to reveal</span>
    </div>

    <!-- Video controls overlay -->
    <div v-if="loaded && !error" class="video-controls" @click.stop>
      <div class="progress-bar" @click="e => seek((e.offsetX / e.target.clientWidth) * 100)">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <div class="controls-row">
        <button class="control-btn" @click="togglePlay">
          {{ playing ? '⏸' : '▶' }}
        </button>

        <span class="time">
          {{ Math.floor(currentTime) }}s / {{ Math.floor(duration) }}s
        </span>

        <button class="control-btn" @click="toggleMute">
          {{ isMuted ? '🔇' : '🔊' }}
        </button>
      </div>
    </div>

    <!-- Play indicator -->
    <div v-if="loaded && !playing" class="play-indicator">
      <span>▶</span>
    </div>
  </div>
</template>

<style scoped>
.video-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color, #000);
  position: relative;
  overflow: hidden;
}

video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  /* GPU acceleration to prevent tearing during slide transitions */
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

video.blur {
  filter: blur(30px);
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

.nsfw-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  z-index: 10;
}

.nsfw-overlay span {
  padding: 12px 24px;
  background: rgba(255, 0, 0, 0.3);
  border-radius: 8px;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  margin-bottom: 8px;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.time {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  flex: 1;
}

.play-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.play-indicator span {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  font-size: 24px;
}
</style>
