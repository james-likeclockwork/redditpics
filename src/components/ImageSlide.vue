<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  url: {
    type: String,
    required: true
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

const emit = defineEmits(['loaded', 'error'])

const loaded = ref(false)
const error = ref(false)
const showNsfw = ref(false)

function onLoad() {
  loaded.value = true
  emit('loaded')
}

function onError() {
  error.value = true
  emit('error')
}

function revealNsfw() {
  showNsfw.value = true
}

const shouldBlur = props.nsfw && props.nsfwMode === 'blur' && !showNsfw.value

// When becoming active, emit loaded if already loaded (for auto-next)
watch(() => props.active, (isActive) => {
  if (isActive && loaded.value) {
    emit('loaded')
  }
})
</script>

<template>
  <div class="image-slide">
    <div v-if="!loaded && !error" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-if="error" class="error">
      <span>Failed to load image</span>
    </div>

    <img
      v-show="loaded && !error"
      :src="url"
      :class="{ blur: shouldBlur }"
      @load="onLoad"
      @error="onError"
      alt=""
    />

    <div
      v-if="nsfw && nsfwMode === 'blur' && !showNsfw"
      class="nsfw-overlay"
      @click="revealNsfw"
    >
      <span>NSFW - Tap to reveal</span>
    </div>
  </div>
</template>

<style scoped>
.image-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color, #000);
  position: relative;
  overflow: hidden;
}

img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

img.blur {
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
}

.nsfw-overlay span {
  padding: 12px 24px;
  background: rgba(255, 0, 0, 0.3);
  border-radius: 8px;
}
</style>
