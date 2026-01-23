<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MediaViewer from './components/MediaViewer.vue'
import Controls from './components/Controls.vue'
import ProgressBar from './components/ProgressBar.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { useRedditFetcher } from './composables/useRedditFetcher.js'
import { useSettings } from './composables/useSettings.js'
import { useAutoNext } from './composables/useAutoNext.js'

// URL parsing
function parseUrl() {
  const path = window.location.pathname
  const search = new URLSearchParams(window.location.search)

  // Match /r/subreddit or /r/sub1+sub2+sub3
  const match = path.match(/^\/r\/([^\/]+)(?:\/([^\/]+))?/)

  if (!match) {
    return {
      subreddits: 'pics',
      sort: 'hot',
      timeFilter: ''
    }
  }

  const subreddits = match[1]
  const sort = match[2] || 'hot'
  const timeFilter = search.get('t') || ''

  return { subreddits, sort, timeFilter }
}

// State
const { subreddits, sort, timeFilter } = parseUrl()
const currentIndex = ref(0)
const settingsVisible = ref(false)
const viewerRef = ref(null)
const isFullscreen = ref(false)
const showInfoBeforeFullscreen = ref(true)
const failedPostIds = ref(new Set())

// Composables
const { settings, reset: resetSettings } = useSettings()
const { posts, loading, error, hasMore, fetchPosts, fetchMore } = useRedditFetcher()

// Auto-next
const autoNext = useAutoNext(() => {
  if (viewerRef.value) {
    viewerRef.value.next()
  }
})

// Current post (from filtered list)
const currentPost = computed(() => filteredPosts.value[currentIndex.value]?.post || null)

// Filter posts based on settings and failed loads
const filteredPosts = computed(() => {
  return posts.value.filter(post => {
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
  if (!settings.autoNext.enabled) return
  if (index !== currentIndex.value) return

  const post = filteredPosts.value[index]
  if (!post) return

  if (post.type === 'image') {
    autoNext.start(settings.autoNext.imageDelay)
  } else if (post.type === 'gallery') {
    if (settings.autoNext.galleryMode === 'fixed') {
      autoNext.start(settings.autoNext.imageDelay)
    }
    // 'all' mode waits for galleryComplete event
  } else if (post.type === 'video') {
    if (settings.autoNext.videoMode === 'skip') {
      viewerRef.value?.next()
    } else if (settings.autoNext.videoMode === 'fixed') {
      autoNext.start(settings.autoNext.imageDelay)
    }
    // 'wait' mode waits for video end event
  }
}

function handleMediaEnded(index) {
  if (!settings.autoNext.enabled) return
  if (index !== currentIndex.value) return
  if (settings.autoNext.videoMode === 'wait') {
    viewerRef.value?.next()
  }
}

function handleGalleryComplete(index) {
  if (!settings.autoNext.enabled) return
  if (index !== currentIndex.value) return
  if (settings.autoNext.galleryMode === 'all') {
    viewerRef.value?.next()
  }
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

// Keyboard shortcuts
function handleKeydown(e) {
  if (!settings.navigation.keyboardEnabled) return
  if (settingsVisible.value) {
    if (e.key === 'Escape') {
      settingsVisible.value = false
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
      viewerRef.value?.galleryPrev()
      break
    case 'ArrowRight':
    case 'd':
      e.preventDefault()
      viewerRef.value?.galleryNext()
      break
    case ' ':
      e.preventDefault()
      toggleSlideshow()
      break
    case 'i':
      settings.display.showInfo = !settings.display.showInfo
      break
    case 'f':
      toggleFullscreen()
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

// Initial fetch
onMounted(() => {
  fetchPosts(subreddits, sort, timeFilter)
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<template>
  <div class="app">
    <!-- Loading state -->
    <div v-if="loading && posts.length === 0" class="loading-screen">
      <div class="spinner"></div>
      <p>Loading r/{{ subreddits }}...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error && posts.length === 0" class="error-screen">
      <p>{{ error }}</p>
      <button @click="fetchPosts(subreddits, sort, timeFilter)">Retry</button>
    </div>

    <!-- Main viewer -->
    <template v-else-if="filteredPosts.length > 0">
      <MediaViewer
        ref="viewerRef"
        :posts="filteredPosts"
        v-model:current-index="currentIndex"
        :settings="settings"
        @need-more="fetchMore"
        @media-loaded="handleMediaLoaded"
        @media-ended="handleMediaEnded"
        @media-error="handleMediaError"
        @gallery-complete="handleGalleryComplete"
      />

      <ProgressBar
        :progress="autoNext.progress.value"
        :visible="settings.display.showProgress && settings.autoNext.enabled"
      />

      <Controls
        :post="currentPost"
        :subreddits="subreddits"
        :current-index="currentIndex"
        :total-posts="filteredPosts.length"
        :is-playing="settings.autoNext.enabled"
        :show-info="settings.display.showInfo"
        :is-fullscreen="isFullscreen"
        @prev="viewerRef?.prev()"
        @next="viewerRef?.next()"
        @toggle-play="toggleSlideshow"
        @open-settings="settingsVisible = true"
        @toggle-controls="toggleControls"
        @toggle-fullscreen="toggleFullscreen"
      />
    </template>

    <!-- Empty state -->
    <div v-else class="empty-screen">
      <p>No posts found</p>
    </div>

    <!-- Settings modal -->
    <SettingsPanel
      :settings="settings"
      :visible="settingsVisible"
      @close="settingsVisible = false"
      @reset="resetSettings"
    />
  </div>
</template>

<style>
.app {
  width: 100%;
  height: 100%;
  background: #000;
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
</style>
