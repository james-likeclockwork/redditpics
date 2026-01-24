<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MediaSlide from './MediaSlide.vue'
import { useSwipe } from '../composables/useSwipe.js'
import { logger } from '../utils/logger.js'

const props = defineProps({
  posts: {
    type: Array,
    required: true
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  settings: {
    type: Object,
    required: true
  },
  userActive: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits([
  'update:currentIndex',
  'needMore',
  'mediaLoaded',
  'mediaEnded',
  'mediaError',
  'galleryComplete',
  'galleryIndexChange'
])

const containerRef = ref(null)
const slideRefs = ref({})

// Virtualization - render current + 1 behind + ahead (3 if preload enabled, 1 if not)
const visibleRange = computed(() => {
  const behind = 1
  const ahead = props.settings.performance?.preloadEnabled ? 3 : 1
  const start = Math.max(0, props.currentIndex - behind)
  const end = Math.min(props.posts.length - 1, props.currentIndex + ahead)
  return { start, end }
})

const visiblePosts = computed(() => {
  const { start, end } = visibleRange.value
  return props.posts.slice(start, end + 1).map((post, i) => ({
    ...post,
    virtualIndex: start + i
  }))
})

// Preload images for upcoming posts (only after current loads)
const preloadCache = new Set()
const currentLoaded = ref(false)
let preloadTimeout = null

function preloadMedia(post, index) {
  if (!post) return

  const key = post.post?.id || post.url
  if (preloadCache.has(key)) {
    logger.preloadHit(index)
    return
  }
  preloadCache.add(key)

  if (post.type === 'image' && post.url) {
    logger.preloadStart(index, post.url)
    const img = new Image()
    img.src = post.url
  } else if (post.type === 'gallery' && post.items) {
    logger.preloadStart(index, `gallery with ${post.items.length} items`)
    // Preload first 3 images of gallery
    post.items.slice(0, 3).forEach((item) => {
      const img = new Image()
      img.src = item.url
    })
  }
  // Videos are preloaded by being rendered in DOM with preload="auto"
  // They won't play until active=true
}

function preloadNearby() {
  if (!currentLoaded.value) return
  if (!props.settings.performance?.preloadEnabled) return

  const index = props.currentIndex
  for (let i = 1; i <= 5; i++) {
    const nextPost = props.posts[index + i]
    if (nextPost) {
      preloadMedia(nextPost, index + i)
    }
  }
}

// Reset loaded state when changing posts and cleanup distant slides
watch(
  () => props.currentIndex,
  (newIndex, oldIndex) => {
    const delta = Math.abs(newIndex - oldIndex)
    if (delta > 1) {
      logger.navJump(oldIndex, newIndex)
    } else {
      logger.navTo(newIndex, props.posts.length)
    }
    logger.visibleRange(visibleRange.value.start, visibleRange.value.end, newIndex)

    currentLoaded.value = false
    if (preloadTimeout) {
      clearTimeout(preloadTimeout)
      preloadTimeout = null
    }

    // Clean up slides that are now far away (more than 5 positions)
    const cleanupDistance = 5
    Object.keys(slideRefs.value).forEach((key) => {
      const idx = parseInt(key)
      if (Math.abs(idx - newIndex) > cleanupDistance) {
        delete slideRefs.value[idx]
      }
    })

    // Clear preload cache entries for distant posts to allow re-preloading if user goes back
    const keysToRemove = []
    preloadCache.forEach((key) => {
      // Can't easily map cache keys to indices, so just limit cache size
      if (preloadCache.size > 20) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.slice(0, preloadCache.size - 20).forEach((key) => preloadCache.delete(key))
  }
)

// Check if we need to fetch more
watch(
  () => props.currentIndex,
  (index) => {
    if (index >= props.posts.length - 10) {
      emit('needMore')
    }
  }
)

// Also check on posts length change (in case we filtered many out)
watch(
  () => props.posts.length,
  () => {
    if (props.currentIndex >= props.posts.length - 10) {
      emit('needMore')
    }
  },
  { immediate: true }
)

// Navigation
function goToIndex(index) {
  if (index >= 0 && index < props.posts.length) {
    emit('update:currentIndex', index)
  }
}

function next() {
  if (props.currentIndex < props.posts.length - 1) {
    goToIndex(props.currentIndex + 1)
  }
}

function prev() {
  if (props.currentIndex > 0) {
    goToIndex(props.currentIndex - 1)
  }
}

// Gallery navigation for current slide (falls back to post navigation if not a gallery or at boundary)
function galleryNext() {
  const currentSlide = slideRefs.value[props.currentIndex]
  if (currentSlide?.isGallery?.()) {
    const currentIdx = currentSlide.getGalleryIndex()
    const total = currentSlide.getGalleryTotal()
    if (currentIdx >= total - 1) {
      next()
    } else {
      currentSlide.galleryNext()
    }
  } else {
    next()
  }
}

function galleryPrev() {
  const currentSlide = slideRefs.value[props.currentIndex]
  if (currentSlide?.isGallery?.()) {
    const currentIdx = currentSlide.getGalleryIndex()
    if (currentIdx <= 0) {
      prev()
    } else {
      currentSlide.galleryPrev()
    }
  } else {
    prev()
  }
}

// Swipe handling - vertical for posts, horizontal for gallery
const { isSwiping, deltaY, direction } = useSwipe(containerRef, {
  threshold: props.settings.navigation.swipeSensitivity,
  onSwipeUp: next,
  onSwipeDown: prev,
  onSwipeLeft: galleryNext,
  onSwipeRight: galleryPrev,
  preventScroll: true
})

// Animation settings
const easingMap = {
  ease: 'ease',
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  snappy: 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
}

const animationType = computed(() => props.settings.animation?.type || 'slide')
const animationDuration = computed(() => props.settings.animation?.duration || 400)
const animationEasing = computed(
  () => easingMap[props.settings.animation?.easing] || easingMap.smooth
)

// Check if animation type uses container movement (slide-based) or stacked slides (fade/zoom)
const usesContainerSlide = computed(() => {
  const type = animationType.value
  return type === 'slide' || type === 'slide-fade'
})

// Compute transform with drag offset for smooth follow-through
const slideTransform = computed(() => {
  // For fade/zoom modes, container doesn't move - slides are stacked
  if (!usesContainerSlide.value) {
    return 'translate3d(0, 0, 0)'
  }

  const baseOffset = props.currentIndex * 100

  // Only apply drag offset for vertical swipes
  if (isSwiping.value && (direction.value === 'up' || direction.value === 'down')) {
    const dragPercent = (deltaY.value / window.innerHeight) * 100
    const atStart = props.currentIndex === 0 && deltaY.value > 0
    const atEnd = props.currentIndex === props.posts.length - 1 && deltaY.value < 0
    const resistance = atStart || atEnd ? 0.3 : 0.6
    const finalOffset = -baseOffset + dragPercent * resistance
    return `translate3d(0, ${finalOffset}%, 0)`
  }

  return `translate3d(0, -${baseOffset}%, 0)`
})

const containerTransition = computed(() => {
  if (animationType.value === 'none') return 'none'
  if (!usesContainerSlide.value) return 'none'
  if (isSwiping.value && (direction.value === 'up' || direction.value === 'down')) return 'none'
  return `transform ${animationDuration.value}ms ${animationEasing.value}`
})

// Compute styles per slide based on animation type
function getSlideStyle(virtualIndex) {
  const isActive = virtualIndex === props.currentIndex
  const type = animationType.value
  const duration = animationDuration.value
  const easing = animationEasing.value

  // For slide-based animations, position slides vertically
  if (type === 'slide') {
    return {
      transform: `translateY(${virtualIndex * 100}%)`
    }
  }

  if (type === 'slide-fade') {
    return {
      transform: `translateY(${virtualIndex * 100}%)`,
      opacity: isActive ? 1 : 0.3,
      transition: `opacity ${duration}ms ${easing}`
    }
  }

  // For stacked animations (fade, zoom, none), all slides at same position
  if (type === 'none') {
    return {
      opacity: isActive ? 1 : 0,
      visibility: isActive ? 'visible' : 'hidden',
      transition: 'none'
    }
  }

  if (type === 'fade') {
    return {
      opacity: isActive ? 1 : 0,
      transition: `opacity ${duration}ms ${easing}`
    }
  }

  if (type === 'zoom') {
    const scale = isActive ? 1 : 0.85
    return {
      transform: `scale(${scale})`,
      opacity: isActive ? 1 : 0,
      transition: `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`
    }
  }

  if (type === 'kenburns') {
    // Ken Burns: slow zoom/pan effect while active, fade between slides
    // Zoom duration scales with configured duration (5x), capped at 15s
    const zoomDuration = Math.min(duration * 5, 15000)
    const scale = isActive ? 1.1 : 1
    return {
      transform: `scale(${scale})`,
      opacity: isActive ? 1 : 0,
      transition: isActive
        ? `transform ${zoomDuration}ms ease-out, opacity ${duration}ms ${easing}`
        : `opacity ${duration}ms ${easing}`
    }
  }

  if (type === 'blur') {
    // Blur transition: blur out old slide, blur in new slide
    return {
      opacity: isActive ? 1 : 0,
      filter: isActive ? 'blur(0px)' : 'blur(20px)',
      transition: `opacity ${duration}ms ${easing}, filter ${duration}ms ${easing}`
    }
  }

  // Fallback
  return {
    transform: `translateY(${virtualIndex * 100}%)`
  }
}

// Debounce wheel events
let wheelTimeout = null
function debouncedWheel(e) {
  e.preventDefault()
  if (wheelTimeout) return
  wheelTimeout = setTimeout(() => {
    wheelTimeout = null
  }, 200)

  if (e.deltaY > 0) {
    next()
  } else if (e.deltaY < 0) {
    prev()
  }
}

onMounted(() => {
  containerRef.value?.addEventListener('wheel', debouncedWheel, { passive: false })
})

onUnmounted(() => {
  containerRef.value?.removeEventListener('wheel', debouncedWheel)
  if (wheelTimeout) clearTimeout(wheelTimeout)
})

// Event handlers from slides
function onMediaLoaded(index) {
  logger.mediaLoad(index, props.posts[index]?.type)
  logger.endTimer(`media-${index}`)

  // Only process if this is the current slide
  if (index === props.currentIndex) {
    currentLoaded.value = true
    // Start preloading nearby posts after a short delay
    preloadTimeout = setTimeout(preloadNearby, 100)
  }
  emit('mediaLoaded', index)
}

function onMediaEnded(index) {
  emit('mediaEnded', index)
}

function onMediaError(index) {
  logger.mediaError(index, props.posts[index]?.type, 'load failed')
  emit('mediaError', index)
}

function onGalleryComplete(index) {
  emit('galleryComplete', index)
}

function onGalleryIndexChange(postIndex, galleryIndex) {
  emit('galleryIndexChange', postIndex, galleryIndex)
}

function seekVideo(seconds) {
  const currentSlide = slideRefs.value[props.currentIndex]
  currentSlide?.seekRelative?.(seconds)
}

defineExpose({ next, prev, goToIndex, galleryNext, galleryPrev, slideRefs, seekVideo })
</script>

<template>
  <div
    ref="containerRef"
    class="media-viewer"
    :style="{ backgroundColor: settings.display?.backgroundColor }"
  >
    <div
      class="slides-container"
      :style="{ transform: slideTransform, transition: containerTransition }"
    >
      <!-- Only render slide wrappers for visible range, position them absolutely -->
      <div
        v-for="post in visiblePosts"
        :key="post.post?.id || post.virtualIndex"
        class="slide-wrapper"
        :style="getSlideStyle(post.virtualIndex)"
      >
        <MediaSlide
          :ref="
            (el) => {
              if (el) slideRefs[post.virtualIndex] = el
            }
          "
          :media="post"
          :active="post.virtualIndex === currentIndex"
          :settings="settings"
          :user-active="userActive"
          @loaded="onMediaLoaded(post.virtualIndex)"
          @ended="onMediaEnded(post.virtualIndex)"
          @error="onMediaError(post.virtualIndex)"
          @gallery-complete="onGalleryComplete(post.virtualIndex)"
          @gallery-index-change="(idx) => onGalleryIndexChange(post.virtualIndex, idx)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  position: relative;
  /* Isolate this element's rendering */
  isolation: isolate;
  contain: layout style;
}

.slides-container {
  position: relative;
  width: 100%;
  height: 100%;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.slide-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  contain: layout style paint;
}
</style>
