<script setup>
import { ref, watch, computed } from 'vue'

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
  },
  frameStyle: {
    type: String,
    default: 'none'
  }
})

const emit = defineEmits(['loaded', 'error'])

const loaded = ref(false)
const error = ref(false)
const showNsfw = ref(false)

/**
 * Check if the loaded image is an Imgur "removed" placeholder
 * The placeholder is typically 161x81 pixels
 */
function isImgurRemovedPlaceholder(img) {
  // Only check for Imgur URLs
  if (!props.url.includes('imgur.com')) {
    return false
  }
  // Imgur's "removed" placeholder is exactly 161x81
  return img.naturalWidth === 161 && img.naturalHeight === 81
}

function onLoad(event) {
  const img = event.target

  // Check if this is an Imgur "removed" placeholder image
  if (isImgurRemovedPlaceholder(img)) {
    error.value = true
    emit('error')
    return
  }

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

const shouldBlur = computed(() => props.nsfw && props.nsfwMode === 'blur' && !showNsfw.value)
const hasFrame = computed(() => props.frameStyle !== 'none')

// When becoming active, emit loaded if already loaded (for auto-next)
watch(
  () => props.active,
  (isActive) => {
    if (isActive && loaded.value) {
      emit('loaded')
    }
  }
)
</script>

<template>
  <div class="image-slide" :class="{ framed: hasFrame }">
    <div v-if="!loaded && !error" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-if="error" class="error">
      <span>Failed to load image</span>
    </div>

    <div v-show="loaded && !error" class="image-container" :class="[`frame-${frameStyle}`]">
      <img
        :src="url"
        :class="{ blur: shouldBlur }"
        :fetchpriority="active ? 'high' : 'low'"
        decoding="async"
        alt=""
        @load="onLoad"
        @error="onError"
      />
    </div>

    <div v-if="nsfw && nsfwMode === 'blur' && !showNsfw" class="nsfw-overlay" @click="revealNsfw">
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

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

/* No frame - container fills the slide */
.frame-none {
  width: 100%;
  height: 100%;
}

/* Framed - container centers the image */
.image-container:not(.frame-none) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Frame styles - uses --frame-color CSS variable */
.frame-shadow img {
  border: 2px solid var(--frame-color, #fff);
  box-shadow:
    8px 12px 20px rgba(0, 0, 0, 0.5),
    15px 25px 50px rgba(0, 0, 0, 0.4),
    25px 40px 80px rgba(0, 0, 0, 0.3);
}

.frame-shadow-soft img {
  box-shadow:
    0 0 40px var(--frame-color, #fff),
    0 0 80px var(--frame-color, #fff),
    0 0 120px var(--frame-color, #fff),
    0 0 200px var(--frame-color, #fff);
}

.frame-mat img {
  border: 12px solid var(--frame-color, #f5f5f5);
  box-shadow:
    8px 12px 20px rgba(0, 0, 0, 0.5),
    15px 25px 50px rgba(0, 0, 0, 0.4),
    25px 40px 80px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .frame-mat img {
    border-width: 8px;
  }
}

img {
  object-fit: contain;
  /* GPU acceleration to prevent tearing during slide transitions */
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* No frame - image fills container */
.frame-none img {
  width: 100%;
  height: 100%;
}

/* Framed - image constrained to 90% of viewport, border hugs image */
.image-container:not(.frame-none) img {
  max-width: 90vw;
  max-height: 90vh;
  width: auto;
  height: auto;
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
