<script setup>
import { computed, ref } from 'vue'
import {
  X,
  Menu,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  ArrowUp,
  ExternalLink
} from 'lucide-vue-next'

const props = defineProps({
  post: {
    type: Object,
    default: null
  },
  subreddits: {
    type: String,
    default: ''
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  totalPosts: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  showInfo: {
    type: Boolean,
    default: true
  },
  userActive: {
    type: Boolean,
    default: true
  },
  isFullscreen: {
    type: Boolean,
    default: false
  },
  sort: {
    type: String,
    default: 'hot'
  },
  timeFilter: {
    type: String,
    default: ''
  }
})

const emit = defineEmits([
  'prev',
  'next',
  'togglePlay',
  'openSettings',
  'toggleControls',
  'toggleFullscreen',
  'changeSort',
  'openHelp'
])

const sortMenuOpen = ref(false)

const sortOptions = [
  { value: 'hot', label: 'Hot' },
  { value: 'new', label: 'New' },
  { value: 'rising', label: 'Rising' },
  { value: 'top', label: 'Top', hasTime: true }
]

const timeOptions = [
  { value: 'hour', label: 'Hour' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All Time' }
]

const currentSortOption = computed(() => sortOptions.find((s) => s.value === props.sort))
const currentTimeOption = computed(() => timeOptions.find((t) => t.value === props.timeFilter))
const needsTimeFilter = computed(() => props.sort === 'top' || props.sort === 'controversial')

const sortDisplayLabel = computed(() => {
  let label = currentSortOption.value?.label || 'Hot'
  if (needsTimeFilter.value) {
    const timeLabel = currentTimeOption.value?.label || 'Day'
    label += ` (${timeLabel})`
  }
  return label
})

function selectSort(sort, time = '') {
  emit('changeSort', { sort, timeFilter: time })
  sortMenuOpen.value = false
}

function toggleSortMenu() {
  sortMenuOpen.value = !sortMenuOpen.value
}

function closeSortMenu() {
  sortMenuOpen.value = false
}

const title = computed(() => props.post?.title || '')
const author = computed(() => props.post?.author || '')
const subreddit = computed(() => props.post?.subreddit || '')
const score = computed(() => {
  const s = props.post?.score || 0
  if (s >= 1000) {
    return (s / 1000).toFixed(1) + 'k'
  }
  return s.toString()
})
const permalink = computed(() => {
  if (props.post?.permalink) {
    return `https://reddit.com${props.post.permalink}`
  }
  return null
})
</script>

<template>
  <!-- Toggle button - visible when user is active -->
  <button
    class="toggle-controls-btn"
    :class="{ visible: userActive }"
    :title="showInfo ? 'Hide controls (i)' : 'Show controls (i)'"
    @click="emit('toggleControls')"
  >
    <X v-if="showInfo" :size="18" />
    <Menu v-else :size="18" />
  </button>

  <div class="controls" :class="{ visible: showInfo && userActive }">
    <!-- Top bar - Post info only (top left) -->
    <div class="top-bar">
      <div class="post-info">
        <p class="post-title">{{ title }}</p>
        <div class="post-meta">
          <span class="author">u/{{ author }}</span>
          <span class="divider">•</span>
          <span class="source">r/{{ subreddit }}</span>
          <span class="divider">•</span>
          <span class="score"><ArrowUp :size="12" /> {{ score }}</span>
          <a v-if="permalink" :href="permalink" target="_blank" rel="noopener" class="reddit-link">
            <ExternalLink :size="12" />
          </a>
        </div>
      </div>
    </div>

    <!-- Bottom bar - Controls (bottom left) -->
    <div class="bottom-bar">
      <!-- Sort selector -->
      <div class="sort-selector" @mouseleave="closeSortMenu">
        <button class="sort-btn" @click="toggleSortMenu">
          {{ sortDisplayLabel }} <ChevronDown :size="14" />
        </button>
        <div v-if="sortMenuOpen" class="sort-menu">
          <template v-for="opt in sortOptions" :key="opt.value">
            <template v-if="opt.hasTime">
              <button
                class="sort-option sort-group-header"
                :class="{ active: sort === opt.value }"
                @click="selectSort(opt.value, 'day')"
              >
                {{ opt.label }}
              </button>
              <button
                v-for="time in timeOptions"
                :key="`${opt.value}-${time.value}`"
                class="sort-option time-option"
                :class="{ active: sort === opt.value && timeFilter === time.value }"
                @click="selectSort(opt.value, time.value)"
              >
                {{ time.label }}
              </button>
            </template>
            <button
              v-else
              class="sort-option"
              :class="{ active: sort === opt.value }"
              @click="selectSort(opt.value)"
            >
              {{ opt.label }}
            </button>
          </template>
        </div>
      </div>

      <div class="position">{{ currentIndex + 1 }} / {{ totalPosts }}</div>
      <button
        class="fullscreen-btn"
        :title="isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (f)'"
        @click="emit('toggleFullscreen')"
      >
        <Minimize2 v-if="isFullscreen" :size="20" />
        <Maximize2 v-else :size="20" />
      </button>
      <button class="settings-btn" title="Settings" @click="emit('openSettings')">
        <Settings :size="20" />
      </button>
      <button class="help-btn" title="Help (?)" @click="emit('openHelp')">
        <HelpCircle :size="20" />
      </button>
    </div>

    <!-- Side controls (right side) -->
    <div class="side-controls">
      <button class="nav-zone nav-prev" @click="emit('prev')">
        <ChevronUp :size="24" />
      </button>
      <button class="play-btn" @click="emit('togglePlay')">
        <Pause v-if="isPlaying" :size="28" />
        <Play v-else :size="28" class="play-icon" />
      </button>
      <button class="nav-zone nav-next" @click="emit('next')">
        <ChevronDown :size="24" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toggle-controls-btn {
  position: absolute;
  bottom: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    opacity 0.3s ease,
    background 0.2s ease;
  pointer-events: none;
}

.toggle-controls-btn.visible {
  opacity: 1;
  background: rgba(0, 0, 0, 0.6);
  pointer-events: auto;
}

.toggle-controls-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.controls.visible {
  opacity: 1;
}

.controls.visible > * {
  pointer-events: auto;
}

/* Top bar - post info at top left */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  padding: 16px;
  padding-right: 80px;
  background: linear-gradient(rgba(0, 0, 0, 0.8), transparent 90%);
}

/* Bottom bar - controls at bottom left */
.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  padding: 16px;
  padding-left: 70px;
  padding-right: 16px;
  background: linear-gradient(to right, rgba(0, 0, 0, 0.6), transparent);
  border-radius: 0 16px 0 0;
}

.position {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-right: 16px;
}

.sort-selector {
  position: relative;
  margin-right: 16px;
  padding-bottom: 8px;
  margin-bottom: -8px;
}

.sort-btn {
  padding: 6px 12px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sort-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.sort-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  min-width: 140px;
  background: rgba(30, 30, 30, 0.95);
  border-radius: 8px;
  padding: 4px 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 100;
  backdrop-filter: blur(10px);
}

.sort-group-header {
  font-weight: 600;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 4px;
  padding-top: 8px;
}

.sort-option {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.sort-option:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sort-option.active {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.sort-option.time-option {
  padding-left: 24px;
}

.fullscreen-btn,
.settings-btn,
.help-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.fullscreen-btn,
.settings-btn {
  margin-right: 8px;
}

.help-btn {
  font-weight: 700;
}

.fullscreen-btn:hover,
.settings-btn:hover,
.help-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.side-controls {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.nav-zone {
  width: 48px;
  height: 48px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-zone:hover {
  background: rgba(255, 255, 255, 0.2);
}

.play-btn {
  width: 56px;
  height: 56px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.play-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.play-icon {
  transform: translateX(2px);
}

.post-info {
  flex: 1;
  min-width: 0;
  max-width: 60%;
}

.post-title {
  color: #fff;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.divider {
  opacity: 0.5;
}

.score {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.reddit-link {
  display: inline-flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  margin-left: 4px;
}

.reddit-link:hover {
  color: #fff;
}
</style>
