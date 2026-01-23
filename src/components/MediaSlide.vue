<script setup>
import { computed, ref } from 'vue'
import ImageSlide from './ImageSlide.vue'
import VideoSlide from './VideoSlide.vue'
import GallerySlide from './GallerySlide.vue'
import RedgifSlide from './RedgifSlide.vue'

const props = defineProps({
  media: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['loaded', 'ended', 'error', 'galleryComplete'])

const videoRef = ref(null)
const galleryRef = ref(null)

const mediaType = computed(() => props.media.type)
const post = computed(() => props.media.post)
const isNsfw = computed(() => post.value?.over_18 || false)

// Loop videos when auto-next is disabled, otherwise use the loop setting
const shouldLoop = computed(() => {
  if (!props.settings.autoNext.enabled) {
    return true
  }
  return props.settings.video.loop
})

function onLoaded() {
  emit('loaded')
}

function onEnded() {
  emit('ended')
}

function onError() {
  emit('error')
}

function onGalleryComplete() {
  emit('galleryComplete')
}

// Gallery control methods
function galleryNext() {
  galleryRef.value?.next()
}

function galleryPrev() {
  galleryRef.value?.prev()
}

function getGalleryIndex() {
  const gallery = galleryRef.value
  if (!gallery) return 0
  const idx = gallery.currentIndex
  if (idx === undefined || idx === null) return 0
  return typeof idx === 'object' && 'value' in idx ? idx.value : idx
}

function isGallery() {
  return props.media.type === 'gallery'
}

function getGalleryTotal() {
  return props.media.items?.length ?? 0
}

// Expose methods for parent control
defineExpose({
  videoRef,
  galleryRef,
  galleryNext,
  galleryPrev,
  getGalleryIndex,
  getGalleryTotal,
  isGallery
})
</script>

<template>
  <div class="media-slide">
    <ImageSlide
      v-if="mediaType === 'image'"
      :url="media.url"
      :active="active"
      :nsfw="isNsfw"
      :nsfw-mode="settings.content.nsfwMode"
      @loaded="onLoaded"
      @error="onError"
    />

    <VideoSlide
      v-else-if="mediaType === 'video'"
      ref="videoRef"
      :url="media.url"
      :hls-url="media.hlsUrl"
      :autoplay="settings.video.autoplay"
      :muted="settings.video.muted"
      :loop="shouldLoop"
      :active="active"
      :nsfw="isNsfw"
      :nsfw-mode="settings.content.nsfwMode"
      @loaded="onLoaded"
      @ended="onEnded"
      @error="onError"
    />

    <GallerySlide
      v-else-if="mediaType === 'gallery'"
      ref="galleryRef"
      :items="media.items"
      :active="active"
      :nsfw="isNsfw"
      :nsfw-mode="settings.content.nsfwMode"
      @loaded="onLoaded"
      @complete="onGalleryComplete"
    />

    <RedgifSlide
      v-else-if="mediaType === 'redgif'"
      :id="media.id"
      :autoplay="settings.video.autoplay"
      :muted="settings.video.muted"
      :loop="shouldLoop"
      :active="active"
      :nsfw="isNsfw"
      :nsfw-mode="settings.content.nsfwMode"
      @loaded="onLoaded"
      @ended="onEnded"
      @error="onError"
    />

    <div v-else class="unsupported">
      <span>Unsupported media type</span>
    </div>
  </div>
</template>

<style scoped>
.media-slide {
  width: 100%;
  height: 100%;
  background: #000;
}

.unsupported {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}
</style>
