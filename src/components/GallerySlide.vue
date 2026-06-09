<script setup>
import { ref, computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  items: {
    type: Array,
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
  },
  userActive: {
    type: Boolean,
    default: true
  }
})

const hasFrame = computed(() => props.frameStyle !== 'none')

const emit = defineEmits(['loaded', 'complete', 'indexChange', 'error'])

const currentIndex = ref(0)
const loadedCount = ref(0)
const showNsfw = ref(false)
const imageErrors = ref(new Set())

const total = computed(() => props.items.length)
const shouldBlur = computed(() => props.nsfw && props.nsfwMode === 'blur' && !showNsfw.value)
const currentImageFailed = computed(() => imageErrors.value.has(currentIndex.value))

function next() {
  if (currentIndex.value < total.value - 1) {
    currentIndex.value++
    emit('indexChange', currentIndex.value)
    // If next image failed, auto-advance again
    if (imageErrors.value.has(currentIndex.value)) {
      setTimeout(() => next(), 100)
    }
  } else {
    emit('complete')
  }
}

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    emit('indexChange', currentIndex.value)
    // If prev image failed, auto-advance again
    if (imageErrors.value.has(currentIndex.value)) {
      setTimeout(() => prev(), 100)
    }
  }
}

function goTo(index) {
  if (index >= 0 && index < total.value) {
    currentIndex.value = index
    emit('indexChange', currentIndex.value)
    if (index === total.value - 1) {
      emit('complete')
    }
  }
}

function onImageLoad() {
  loadedCount.value++
  if (loadedCount.value === 1) {
    emit('loaded')
  }
}

function onImageError(index) {
  imageErrors.value.add(index)
  // Force reactivity
  imageErrors.value = new Set(imageErrors.value)

  // If this is the first image to try loading, emit loaded anyway
  // so we don't block forever
  if (loadedCount.value === 0) {
    loadedCount.value++
    emit('loaded')
  }

  // If current image failed, try to auto-advance
  if (index === currentIndex.value && props.active) {
    // Try next if available, otherwise emit error
    if (currentIndex.value < total.value - 1) {
      setTimeout(() => next(), 100)
    } else if (imageErrors.value.size === total.value) {
      // All images failed
      emit('error')
    }
  }
}

function revealNsfw() {
  showNsfw.value = true
}

// When becoming active, emit loaded if already loaded (for auto-next)
watch(
  () => props.active,
  (isActive) => {
    if (isActive && loadedCount.value > 0) {
      emit('loaded')
    }
  }
)

// Touch handling moved to MediaViewer for unified swipe control
defineExpose({ next, prev, goTo, currentIndex })
</script>

<template>
  <div class="gallery-slide" :class="{ framed: hasFrame }">
    <div class="gallery-container" :class="[`frame-${frameStyle}`]">
      <img
        v-for="(item, index) in items"
        :key="index"
        :src="item.url"
        :class="{ active: index === currentIndex, blur: shouldBlur, error: imageErrors.has(index) }"
        :fetchpriority="index === currentIndex ? 'high' : 'low'"
        :loading="active ? 'eager' : 'lazy'"
        decoding="async"
        alt=""
        @load="onImageLoad"
        @error="onImageError(index)"
      />
      <!-- Error state for current image -->
      <div v-if="currentImageFailed" class="image-error">
        <span>Failed to load image</span>
      </div>
    </div>

    <div v-if="nsfw && nsfwMode === 'blur' && !showNsfw" class="nsfw-overlay" @click="revealNsfw">
      <span>NSFW - Tap to reveal</span>
    </div>

    <!-- Navigation arrows -->
    <button v-if="currentIndex > 0" class="nav-btn nav-prev" :class="{ hidden: !userActive }" @click.stop="prev">
      <ChevronLeft :size="32" />
    </button>
    <button v-if="currentIndex < total - 1" class="nav-btn nav-next" :class="{ hidden: !userActive }" @click.stop="next">
      <ChevronRight :size="32" />
    </button>

    <!-- Counter -->
    <div class="counter" :class="{ hidden: !userActive }">{{ currentIndex + 1 }} / {{ total }}</div>

    <!-- Dots indicator -->
    <div v-if="total <= 10" class="dots" :class="{ hidden: !userActive }">
      <button
        v-for="(_, index) in items"
        :key="index"
        :class="{ active: index === currentIndex }"
        @click.stop="goTo(index)"
      />
    </div>
  </div>
</template>

<style scoped>
.gallery-slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color, #000);
  position: relative;
  overflow: hidden;
}

.gallery-container {
  position: relative;
  box-sizing: border-box;
}

/* No frame - container fills the slide */
.gallery-slide:not(.framed) .gallery-container {
  width: 100%;
  height: 100%;
}

/* No frame - images fill container */
.gallery-slide:not(.framed) .gallery-container img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Framed - container centers images */
.gallery-slide.framed .gallery-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

/* Framed - images constrained to 90% of viewport */
.gallery-slide.framed .gallery-container img {
  position: absolute;
  max-width: 90vw;
  max-height: 90vh;
  width: auto;
  height: auto;
  object-fit: contain;
}

.gallery-container img {
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 0.2s ease;
  /* GPU acceleration to prevent tearing during slide transitions */
  transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* Frame styles - applied to active image, uses --frame-color CSS variable */
.frame-shadow img.active {
  border: 2px solid var(--frame-color, #fff);
  box-shadow:
    8px 12px 20px rgba(0, 0, 0, 0.5),
    15px 25px 50px rgba(0, 0, 0, 0.4),
    25px 40px 80px rgba(0, 0, 0, 0.3);
}

.frame-shadow-soft img.active {
  box-shadow:
    0 0 40px var(--frame-color, #fff),
    0 0 80px var(--frame-color, #fff),
    0 0 120px var(--frame-color, #fff),
    0 0 200px var(--frame-color, #fff);
}

.frame-mat img.active {
  border: 12px solid var(--frame-color, #f5f5f5);
  box-shadow:
    8px 12px 20px rgba(0, 0, 0, 0.5),
    15px 25px 50px rgba(0, 0, 0, 0.4),
    25px 40px 80px rgba(0, 0, 0, 0.3);
}

@media (max-width: 768px) {
  .frame-mat img.active {
    border-width: 8px;
  }
}

.gallery-container img.active {
  opacity: 1;
}

.gallery-container img.blur {
  filter: blur(30px);
}

.gallery-container img.error {
  display: none;
}

.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: #ff6b6b;
  font-size: 14px;
  z-index: 2;
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

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 80px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  cursor: pointer;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.nav-btn.hidden {
  opacity: 0;
  visibility: hidden;
}

.nav-prev {
  left: 0;
  border-radius: 0 8px 8px 0;
}

.nav-next {
  right: 0;
  border-radius: 8px 0 0 8px;
}

.counter {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 16px;
  color: #fff;
  font-size: 14px;
  z-index: 5;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.counter.hidden {
  opacity: 0;
  visibility: hidden;
}

.dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 5;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}

.dots.hidden {
  opacity: 0;
  visibility: hidden;
}

.dots button {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0;
}

.dots button.active {
  background: #fff;
}
</style>
