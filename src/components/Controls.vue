<script setup>
import { computed } from 'vue'

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
  isFullscreen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['prev', 'next', 'togglePlay', 'openSettings', 'toggleControls', 'toggleFullscreen'])

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

// Parse and format subreddits display
const subredditList = computed(() => {
  return props.subreddits.split('+').filter(Boolean)
})

const subredditDisplay = computed(() => {
  const list = subredditList.value
  const maxShow = 3

  if (list.length <= maxShow) {
    return 'r/' + list.join('+')
  }

  const shown = list.slice(0, maxShow).join('+')
  const remaining = list.length - maxShow
  return `r/${shown} +${remaining} more`
})

const subredditCount = computed(() => subredditList.value.length)
</script>

<template>
  <!-- Toggle button always visible -->
  <button
    class="toggle-controls-btn"
    :class="{ hidden: showInfo }"
    @click="emit('toggleControls')"
    :title="showInfo ? 'Hide controls (i)' : 'Show controls (i)'"
  >
    {{ showInfo ? '✕' : '☰' }}
  </button>

  <div class="controls" v-show="showInfo">
    <!-- Top bar -->
    <div class="top-bar">
      <div class="subreddit-info">
        <span class="subreddit-name" :title="'r/' + subreddits">{{ subredditDisplay }}</span>
        <span v-if="subredditCount > 3" class="subreddit-count">({{ subredditCount }} subs)</span>
      </div>
      <div class="position">
        {{ currentIndex + 1 }} / {{ totalPosts }}
      </div>
      <button class="fullscreen-btn" @click="emit('toggleFullscreen')" :title="isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (f)'">
        {{ isFullscreen ? '⤓' : '⤢' }}
      </button>
      <button class="settings-btn" @click="emit('openSettings')">
        ⚙
      </button>
    </div>

    <!-- Side controls -->
    <div class="side-controls">
      <button class="nav-zone nav-prev" @click="emit('prev')">
        <span class="nav-icon">↑</span>
      </button>
      <button class="play-btn" @click="emit('togglePlay')">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <button class="nav-zone nav-next" @click="emit('next')">
        <span class="nav-icon">↓</span>
      </button>
    </div>

    <!-- Bottom bar -->
    <div class="bottom-bar">
      <div class="post-info">
        <p class="post-title">{{ title }}</p>
        <div class="post-meta">
          <span class="author">u/{{ author }}</span>
          <span class="divider">•</span>
          <span class="source">r/{{ subreddit }}</span>
          <span class="divider">•</span>
          <span class="score">⬆ {{ score }}</span>
        </div>
      </div>
      <a
        v-if="permalink"
        :href="permalink"
        target="_blank"
        rel="noopener"
        class="reddit-link"
      >
        ↗
      </a>
    </div>
  </div>
</template>

<style scoped>
.toggle-controls-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-controls-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.toggle-controls-btn.hidden {
  background: rgba(255, 255, 255, 0.1);
}

.controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
}

.controls > * {
  pointer-events: auto;
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 16px;
  padding-left: 70px;
  background: linear-gradient(rgba(0, 0, 0, 0.7), transparent);
}

.subreddit-info {
  flex: 1;
  min-width: 0;
}

.subreddit-name {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  max-width: 100%;
}

.subreddit-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-left: 8px;
}

.position {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-right: 16px;
}

.fullscreen-btn,
.settings-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
}

.fullscreen-btn {
  margin-right: 8px;
}

.fullscreen-btn:hover,
.settings-btn:hover {
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
}

.play-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.bottom-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  padding: 16px;
  padding-right: 80px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
}

.post-info {
  flex: 1;
  min-width: 0;
}

.post-title {
  color: #fff;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.divider {
  opacity: 0.5;
}

.reddit-link {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  text-decoration: none;
}

.reddit-link:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
