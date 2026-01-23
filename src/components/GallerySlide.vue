<script setup>
import { ref, computed, watch } from 'vue'

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
  }
})

const emit = defineEmits(['loaded', 'complete', 'indexChange'])

const currentIndex = ref(0)
const loadedCount = ref(0)
const showNsfw = ref(false)

const currentItem = computed(() => props.items[currentIndex.value])
const total = computed(() => props.items.length)
const isLast = computed(() => currentIndex.value === total.value - 1)
const shouldBlur = computed(() => props.nsfw && props.nsfwMode === 'blur' && !showNsfw.value)

function next() {
  if (currentIndex.value < total.value - 1) {
    currentIndex.value++
    emit('indexChange', currentIndex.value)
  } else {
    emit('complete')
  }
}

function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    emit('indexChange', currentIndex.value)
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

function revealNsfw() {
  showNsfw.value = true
}

// When becoming active, emit loaded if already loaded (for auto-next)
watch(() => props.active, (isActive) => {
  if (isActive && loadedCount.value > 0) {
    emit('loaded')
  }
})

// Touch handling moved to MediaViewer for unified swipe control
defineExpose({ next, prev, goTo, currentIndex })
</script>

<template>
  <div class="gallery-slide">
    <div class="gallery-container">
      <img
        v-for="(item, index) in items"
        :key="index"
        :src="item.url"
        :class="{ active: index === currentIndex, blur: shouldBlur }"
        @load="onImageLoad"
        alt=""
      />
    </div>

    <div
      v-if="nsfw && nsfwMode === 'blur' && !showNsfw"
      class="nsfw-overlay"
      @click="revealNsfw"
    >
      <span>NSFW - Tap to reveal</span>
    </div>

    <!-- Navigation arrows -->
    <button
      v-if="currentIndex > 0"
      class="nav-btn nav-prev"
      @click.stop="prev"
    >
      ‹
    </button>
    <button
      v-if="currentIndex < total - 1"
      class="nav-btn nav-next"
      @click.stop="next"
    >
      ›
    </button>

    <!-- Counter -->
    <div class="counter">
      {{ currentIndex + 1 }} / {{ total }}
    </div>

    <!-- Dots indicator -->
    <div class="dots" v-if="total <= 10">
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
  background: #000;
  position: relative;
  overflow: hidden;
}

.gallery-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.gallery-container img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.gallery-container img.active {
  opacity: 1;
}

.gallery-container img.blur {
  filter: blur(30px);
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
  font-size: 32px;
  cursor: pointer;
  z-index: 5;
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
}

.dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 5;
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
