<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import HomePage from './components/HomePage.vue'
import MediaViewer from './components/MediaViewer.vue'
import Controls from './components/Controls.vue'
import ProgressBar from './components/ProgressBar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import HelpModal from './components/HelpModal.vue'
import { useRedditFetcher } from './composables/useRedditFetcher.js'
import { useSettings } from './composables/useSettings.js'
import { useAutoNext } from './composables/useAutoNext.js'
import { logger } from './utils/logger.js'
import { validateSubreddits, validateSort, validateTimeFilter } from './utils/validators'

// Calculate if background is light or dark
function isLightColor(hex) {
  if (!hex) return false
  const color = hex.replace('#', '')
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// URL parsing with input validation
function parseUrl() {
  const path = window.location.pathname
  const search = new URLSearchParams(window.location.search)

  // Match /r/subreddit or /r/sub1+sub2+sub3
  const match = path.match(/^\/r\/([^/]+)(?:\/([^/]+))?/)

  if (!match) {
    // Homepage - no subreddit specified
    return {
      subreddits: null,
      sort: 'hot',
      timeFilter: ''
    }
  }

  // Validate all inputs
  const subreddits = validateSubreddits(match[1])
  if (!subreddits) {
    // Invalid subreddit, treat as homepage
    return {
      subreddits: null,
      sort: 'hot',
      timeFilter: ''
    }
  }

  const sort = validateSort(match[2])
  const timeFilter = validateTimeFilter(search.get('t'))

  return { subreddits, sort, timeFilter }
}

// State
const urlParams = parseUrl()
const subreddits = urlParams.subreddits

// Check if we're on the homepage (no subreddit specified)
const isHomePage = !subreddits
const currentSort = ref(urlParams.sort)
const currentTimeFilter = ref(urlParams.timeFilter)
const currentIndex = ref(0)
const settingsVisible = ref(false)
const helpVisible = ref(false)
const viewerRef = ref(null)
const isFullscreen = ref(false)
const showInfoBeforeFullscreen = ref(true)
const failedPostIds = ref(new Set())
const userActive = ref(true)
let inactivityTimer = null

// Composables
const { settings, reset: resetSettings } = useSettings()
const {
  posts,
  loading,
  error,
  fetchPosts,
  fetchMore,
  setTimeFilterChangeCallback,
  setNoSuitablePostsCallback
} = useRedditFetcher()

// Light/dark mode detection
const isLight = computed(() => isLightColor(settings.display.backgroundColor))

// Handle time filter fallback (when no results found, fetcher tries broader range)
setTimeFilterChangeCallback((newTimeFilter) => {
  currentTimeFilter.value = newTimeFilter
  // Update URL to reflect the new time filter
  let newPath = `/r/${subreddits}/${currentSort.value}`
  let newSearch = ''
  if (newTimeFilter && (currentSort.value === 'top' || currentSort.value === 'controversial')) {
    newSearch = `?t=${newTimeFilter}`
  }
  window.history.replaceState({}, '', newPath + newSearch)
})

// Handle no suitable posts found - redirect to homepage
setNoSuitablePostsCallback((failedSubreddits) => {
  alert(
    `No viewable media found in r/${failedSubreddits}. This subreddit may not have image/video content. Redirecting to homepage.`
  )
  window.location.href = '/'
})

// Auto-next
const autoNext = useAutoNext(() => {
  // Check if we're on a gallery that needs internal advancement
  const post = filteredPosts.value[currentIndex.value]
  if (post?.type === 'gallery') {
    const currentSlide = viewerRef.value?.slideRefs?.[currentIndex.value]
    if (currentSlide?.isGallery?.()) {
      const galleryIndex = currentSlide.getGalleryIndex()
      const galleryTotal = currentSlide.getGalleryTotal()

      if (galleryIndex < galleryTotal - 1) {
        // More images in gallery - advance within gallery and restart timer
        currentSlide.galleryNext()
        autoNext.start(settings.autoNext.imageDelay)
        return
      }
    }
  }
  // Default: advance to next post
  if (viewerRef.value) {
    viewerRef.value.next()
  }
})

// Current post (from filtered list)
const currentPost = computed(() => filteredPosts.value[currentIndex.value]?.post || null)

// Display text for subreddits (truncate if too many)
const subredditDisplay = computed(() => {
  const subs = subreddits.split('+')
  if (subs.length === 1) {
    return `r/${subs[0]}`
  }
  if (subs.length <= 3) {
    return `r/${subs.join('+')}`
  }
  return `${subs.length} subreddits`
})

// Filter posts based on settings and failed loads
const filteredPosts = computed(() => {
  return posts.value.filter((post) => {
    // Filter out failed posts
    const postId = post.post?.id || post.url
    if (failedPostIds.value.has(postId)) {
      return false
    }
    // Filter by NSFW
    if (settings.content.nsfwMode === 'hide' && post.post?.over_18) {
      return false
    }
    // Filter by upvotes
    if (post.post?.score < settings.content.minUpvotes) {
      return false
    }
    return true
  })
})

// Handle auto-next based on media type
function handleMediaLoaded(index) {
  const post = filteredPosts.value[index]
  logger.log(
    'media',
    `[${index}] Media loaded, type: ${post?.type}, autoNext: ${settings.autoNext.enabled}, videoMode: ${settings.autoNext.videoMode}`
  )

  if (!settings.autoNext.enabled) return
  if (index !== currentIndex.value) return
  if (!post) return

  if (post.type === 'image') {
    logger.log('media', `[${index}] Starting image timer: ${settings.autoNext.imageDelay}ms`)
    autoNext.start(settings.autoNext.imageDelay)
  } else if (post.type === 'gallery') {
    logger.log('media', `[${index}] Gallery starting timer: ${settings.autoNext.imageDelay}ms`)
    autoNext.start(settings.autoNext.imageDelay)
  } else if (post.type === 'video' || post.type === 'redgif') {
    if (settings.autoNext.videoMode === 'skip') {
      logger.log('media', `[${index}] Video skip mode, advancing immediately`)
      viewerRef.value?.next()
    } else if (settings.autoNext.videoMode === 'fixed') {
      logger.log('media', `[${index}] Video fixed mode, starting timer`)
      autoNext.start(settings.autoNext.imageDelay)
    } else {
      // "once" or "wait" mode - wait for ended event
      logger.log(
        'media',
        `[${index}] Video ${settings.autoNext.videoMode} mode, waiting for ended event`
      )
    }
  }
}

function handleMediaEnded(index) {
  const post = filteredPosts.value[index]
  logger.log(
    'media',
    `[${index}] Video ended, type: ${post?.type}, videoMode: ${settings.autoNext.videoMode}`
  )

  if (!settings.autoNext.enabled) {
    logger.log('media', `[${index}] Auto-next disabled, not advancing`)
    return
  }
  if (index !== currentIndex.value) {
    logger.log('media', `[${index}] Index mismatch (current: ${currentIndex.value}), not advancing`)
    return
  }
  // "once" or "wait" mode - advance when video ends
  if (settings.autoNext.videoMode === 'once' || settings.autoNext.videoMode === 'wait') {
    logger.log(
      'nav',
      `[${index}] Advancing to next (video ended in ${settings.autoNext.videoMode} mode)`
    )
    viewerRef.value?.next()
  }
}

function handleGalleryComplete(index) {
  if (index !== currentIndex.value) return
  // Always advance to next post when gallery completes (user viewed all items)
  viewerRef.value?.next()
}

function handleGalleryIndexChange(postIndex, galleryIndex) {
  // Reset timer when manually navigating within a gallery
  if (postIndex !== currentIndex.value) return
  if (!settings.autoNext.enabled) return

  logger.log(
    'media',
    `[${postIndex}] Gallery manual navigation to image ${galleryIndex}, resetting timer`
  )
  autoNext.start(settings.autoNext.imageDelay)
}

function handleMediaError(index) {
  // Mark post as failed
  const post = filteredPosts.value[index]
  if (post) {
    const postId = post.post?.id || post.url
    failedPostIds.value.add(postId)
    // Force reactivity update
    failedPostIds.value = new Set(failedPostIds.value)
  }
  // Auto-advance to next post (the failed one will be filtered out)
  // Use setTimeout to allow the filter to update first
  setTimeout(() => {
    // Adjust index if needed since the failed post is now removed
    if (currentIndex.value >= filteredPosts.value.length) {
      currentIndex.value = Math.max(0, filteredPosts.value.length - 1)
    }
  }, 50)
}

// Watch current index changes
watch(currentIndex, () => {
  autoNext.stop()
})

// Handle left/right keys based on media type
function handleLeftKey() {
  const post = filteredPosts.value[currentIndex.value]
  if (post?.type === 'video' || post?.type === 'redgif') {
    seekCurrentVideo(-5)
  } else {
    viewerRef.value?.galleryPrev()
  }
}

function handleRightKey() {
  const post = filteredPosts.value[currentIndex.value]
  if (post?.type === 'video' || post?.type === 'redgif') {
    seekCurrentVideo(5)
  } else {
    viewerRef.value?.galleryNext()
  }
}

function seekCurrentVideo(seconds) {
  viewerRef.value?.seekVideo(seconds)
}

// Keyboard shortcuts
function handleKeydown(e) {
  if (!settings.navigation.keyboardEnabled) return
  if (settingsVisible.value) {
    if (e.key === 'Escape') {
      settingsVisible.value = false
    }
    return
  }
  if (helpVisible.value) {
    if (e.key === 'Escape') {
      helpVisible.value = false
    }
    return
  }

  switch (e.key) {
    case 'ArrowUp':
    case 'k':
    case 'w':
      e.preventDefault()
      viewerRef.value?.prev()
      break
    case 'ArrowDown':
    case 'j':
    case 's':
      e.preventDefault()
      viewerRef.value?.next()
      break
    case 'ArrowLeft':
    case 'a':
      e.preventDefault()
      handleLeftKey()
      break
    case 'ArrowRight':
    case 'd':
      e.preventDefault()
      handleRightKey()
      break
    case ' ':
      e.preventDefault()
      toggleSlideshow()
      break
    case 'i':
      settings.display.showInfo = !settings.display.showInfo
      break
    case 'm':
      settings.video.muted = !settings.video.muted
      break
    case 'f':
      toggleFullscreen()
      break
    case '?':
      helpVisible.value = !helpVisible.value
      break
    case 'Escape':
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
      break
  }
}

function toggleSlideshow() {
  settings.autoNext.enabled = !settings.autoNext.enabled
  if (settings.autoNext.enabled) {
    handleMediaLoaded(currentIndex.value)
  } else {
    autoNext.stop()
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    // Save current showInfo state and hide controls when entering fullscreen
    showInfoBeforeFullscreen.value = settings.display.showInfo
    settings.display.showInfo = false
    document.documentElement.requestFullscreen()
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
  if (!document.fullscreenElement) {
    // Restore showInfo state when exiting fullscreen
    settings.display.showInfo = showInfoBeforeFullscreen.value
  }
}

function toggleControls() {
  settings.display.showInfo = !settings.display.showInfo
}

// Inactivity tracking - hide controls after timeout
function resetInactivityTimer() {
  userActive.value = true
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
  const timeout = settings.display.inactivityTimeout
  if (timeout > 0) {
    inactivityTimer = setTimeout(() => {
      userActive.value = false
    }, timeout)
  }
}

// Throttled activity handler to avoid excessive calls on mousemove
let lastActivityTime = 0
const ACTIVITY_THROTTLE_MS = 100

function handleUserActivity() {
  const now = Date.now()
  if (now - lastActivityTime < ACTIVITY_THROTTLE_MS) {
    return
  }
  lastActivityTime = now
  resetInactivityTimer()
}

function handleChangeSort({ sort, timeFilter }) {
  currentSort.value = sort
  currentTimeFilter.value = timeFilter || ''
  currentIndex.value = 0
  failedPostIds.value = new Set()

  // Update URL without reloading
  let newPath = `/r/${subreddits}/${sort}`
  let newSearch = ''
  if (timeFilter && (sort === 'top' || sort === 'controversial')) {
    newSearch = `?t=${timeFilter}`
  }
  window.history.pushState({}, '', newPath + newSearch)

  // Refetch with new sort
  fetchPosts(subreddits, sort, timeFilter)
}

// Initial fetch (only if not on homepage)
onMounted(() => {
  if (subreddits) {
    fetchPosts(subreddits, currentSort.value, currentTimeFilter.value)
  }
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)

  // Activity tracking for auto-hide controls
  window.addEventListener('mousemove', handleUserActivity)
  window.addEventListener('touchstart', handleUserActivity)
  window.addEventListener('click', handleUserActivity)
  resetInactivityTimer()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('mousemove', handleUserActivity)
  window.removeEventListener('touchstart', handleUserActivity)
  window.removeEventListener('click', handleUserActivity)
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
  }
})
</script>

<template>
  <div
    class="app"
    :class="{ light: isLight }"
    :style="{
      '--bg-color': settings.display.backgroundColor,
      '--frame-color': settings.display.frameColor,
      backgroundColor: settings.display.backgroundColor
    }"
  >
    <!-- Homepage -->
    <HomePage v-if="isHomePage" />

    <!-- Loading state -->
    <div v-else-if="loading && posts.length === 0" class="loading-screen">
      <div class="spinner"></div>
      <p>Loading {{ subredditDisplay }}...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error && posts.length === 0" class="error-screen">
      <p>{{ error }}</p>
      <button @click="fetchPosts(subreddits, currentSort, currentTimeFilter)">Retry</button>
    </div>

    <!-- Main viewer -->
    <template v-else-if="filteredPosts.length > 0">
      <ErrorBoundary>
        <MediaViewer
          ref="viewerRef"
          v-model:current-index="currentIndex"
          :posts="filteredPosts"
          :settings="settings"
          :user-active="userActive"
          @need-more="fetchMore"
          @media-loaded="handleMediaLoaded"
          @media-ended="handleMediaEnded"
          @media-error="handleMediaError"
          @gallery-complete="handleGalleryComplete"
          @gallery-index-change="handleGalleryIndexChange"
        />
      </ErrorBoundary>

      <ProgressBar
        :progress="autoNext.progress.value"
        :visible="settings.display.showProgress && settings.autoNext.enabled && userActive"
      />

      <Controls
        :post="currentPost"
        :subreddits="subreddits"
        :current-index="currentIndex"
        :total-posts="filteredPosts.length"
        :is-playing="settings.autoNext.enabled"
        :show-info="settings.display.showInfo"
        :user-active="userActive"
        :is-fullscreen="isFullscreen"
        :sort="currentSort"
        :time-filter="currentTimeFilter"
        @prev="viewerRef?.prev()"
        @next="viewerRef?.next()"
        @toggle-play="toggleSlideshow"
        @open-settings="settingsVisible = true"
        @toggle-controls="toggleControls"
        @toggle-fullscreen="toggleFullscreen"
        @change-sort="handleChangeSort"
        @open-help="helpVisible = true"
      />
    </template>

    <!-- Empty state -->
    <div v-else class="empty-screen">
      <p>No posts found</p>
    </div>

    <!-- Settings modal -->
    <SettingsPanel
      :visible="settingsVisible"
      @close="settingsVisible = false"
      @reset="resetSettings"
    />

    <!-- Help modal -->
    <HelpModal :visible="helpVisible" @close="helpVisible = false" />
  </div>
</template>

<style>
.app {
  width: 100%;
  height: 100%;
  color: #fff;
  position: relative;
}

.loading-screen,
.error-screen,
.empty-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-screen p,
.error-screen p,
.empty-screen p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
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

.error-screen button {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.error-screen button:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Light mode overrides */
.app.light {
  color: #000;
}

.app.light .loading-screen p,
.app.light .error-screen p,
.app.light .empty-screen p {
  color: rgba(0, 0, 0, 0.7);
}

.app.light .spinner {
  border-color: rgba(0, 0, 0, 0.2);
  border-top-color: #000;
}

.app.light .error-screen button {
  background: rgba(0, 0, 0, 0.1);
  color: #000;
}

.app.light .error-screen button:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
