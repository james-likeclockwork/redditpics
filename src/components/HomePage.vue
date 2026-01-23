<script setup>
import { ref, computed, onMounted } from 'vue'
import { extractMedia } from '../utils/mediaExtractor'
import { useSettings } from '../composables/useSettings.js'
import HelpModal from './HelpModal.vue'

const { settings } = useSettings()

// Calculate if background is light or dark
function isLightColor(hex) {
  if (!hex) return false
  const color = hex.replace('#', '')
  const r = parseInt(color.substr(0, 2), 16)
  const g = parseInt(color.substr(2, 2), 16)
  const b = parseInt(color.substr(4, 2), 16)
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

const isLight = computed(() => isLightColor(settings.display.backgroundColor))

const FEATURED_SUBREDDITS = [
  { name: 'EarthPorn', description: 'Landscape & nature' },
  { name: 'itookapicture', description: 'User photography' },
  { name: 'Art', description: 'Artwork of all kinds' },
  { name: 'ExposurePorn', description: 'Long exposure' },
  { name: 'SkyPorn', description: 'Sky & weather' },
  { name: 'CityPorn', description: 'Urban photography' },
  { name: 'ArchitecturePorn', description: 'Architecture' },
  { name: 'AbandonedPorn', description: 'Abandoned places' },
  { name: 'spaceporn', description: 'Space & astronomy' }
]

const CACHE_KEY = 'redditpics_home_previews'
const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000 // Only refresh every 5 minutes

const subreddits = ref(FEATURED_SUBREDDITS.map(sub => ({
  ...sub,
  previewUrl: null,
  loading: true,
  error: false
})))

const helpVisible = ref(false)

function loadCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    return JSON.parse(cached) // { timestamp, previews: { [subreddit]: { url, postId } } }
  } catch {
    return null
  }
}

function saveCache(previews) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      previews
    }))
  } catch {
    // Ignore storage errors
  }
}

// Get a thumbnail-sized image URL from Reddit's preview resolutions
function getThumbnailUrl(post) {
  const preview = post.data?.preview
  if (!preview?.images?.[0]) return null

  const image = preview.images[0]
  const resolutions = image.resolutions || []

  // Target ~320px width for homepage cards
  // Resolutions are sorted smallest to largest
  const targetWidth = 320
  let bestRes = null

  for (const res of resolutions) {
    if (res.width >= targetWidth) {
      bestRes = res
      break
    }
    bestRes = res // Keep the largest if none meet target
  }

  // Fall back to source if no resolutions
  const chosen = bestRes || image.source
  if (!chosen?.url) return null

  // Reddit encodes URLs with HTML entities
  return chosen.url.replace(/&amp;/g, '&')
}

async function fetchPreview(index, cachedPostId = null) {
  const sub = subreddits.value[index]
  try {
    const response = await fetch(
      `/api/reddit/r/${sub.name}/hot.json?limit=10&raw_json=1`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!response.ok) throw new Error('Failed to fetch')

    const data = await response.json()
    const children = data?.data?.children || []

    for (const child of children) {
      const media = extractMedia(child)
      if (media && (media.type === 'image' || media.type === 'gallery')) {
        const postId = child.data?.id

        // Get thumbnail URL for homepage, fall back to full URL
        let url = getThumbnailUrl(child)
        if (!url) {
          url = media.type === 'gallery' ? media.items[0]?.url : media.url
        }

        if (url) {
          // Only update if different from cached
          if (postId !== cachedPostId) {
            subreddits.value[index].previewUrl = url
          }
          return { url, postId }
        }
      }
    }
    return null
  } catch (e) {
    console.error(`Failed to fetch preview for ${sub.name}:`, e)
    subreddits.value[index].error = true
    return null
  } finally {
    subreddits.value[index].loading = false
  }
}

async function loadPreviews() {
  const cache = loadCache()
  const cached = cache?.previews || {}
  const cacheAge = cache?.timestamp ? Date.now() - cache.timestamp : Infinity

  // Immediately show cached previews
  subreddits.value.forEach((sub) => {
    if (cached[sub.name]?.url) {
      sub.previewUrl = cached[sub.name].url
      sub.loading = false
    }
  })

  // Skip refresh if cache is recent and we have all previews
  const allCached = subreddits.value.every(sub => cached[sub.name]?.url)
  if (allCached && cacheAge < CACHE_REFRESH_INTERVAL) {
    subreddits.value.forEach(sub => { sub.loading = false })
    return
  }

  // Fetch all in parallel
  const results = await Promise.all(
    subreddits.value.map((sub, index) =>
      fetchPreview(index, cached[sub.name]?.postId)
    )
  )

  // Update cache with new data
  const newCache = {}
  subreddits.value.forEach((sub, index) => {
    const result = results[index]
    if (result) {
      newCache[sub.name] = result
    } else if (cached[sub.name]) {
      // Keep old cache if fetch failed
      newCache[sub.name] = cached[sub.name]
    }
  })
  saveCache(newCache)
}

onMounted(() => {
  loadPreviews()
})
</script>

<template>
  <div class="homepage" :class="{ light: isLight }" :style="{ backgroundColor: settings.display.backgroundColor }">
    <header class="header">
      <h1>RedditPics</h1>
      <p class="tagline">A distraction-free media viewer for Reddit</p>
      <button class="help-btn" @click="helpVisible = true" title="Help">?</button>
    </header>

    <main class="grid">
      <a
        v-for="sub in subreddits"
        :key="sub.name"
        :href="`/r/${sub.name}`"
        class="card"
      >
        <div class="card-image">
          <div v-if="sub.loading" class="loading">
            <div class="spinner"></div>
          </div>
          <img
            v-else-if="sub.previewUrl"
            :src="sub.previewUrl"
            :alt="sub.name"
            loading="lazy"
          />
          <div v-else class="no-preview">
            <span>r/{{ sub.name }}</span>
          </div>
        </div>
        <div class="card-info">
          <h2>r/{{ sub.name }}</h2>
          <p>{{ sub.description }}</p>
        </div>
      </a>
    </main>

    <footer class="footer">
      <p>Or enter any subreddit: <code>/r/yoursubreddit</code></p>
    </footer>

    <HelpModal :visible="helpVisible" @close="helpVisible = false" />
  </div>
</template>

<style scoped>
.homepage {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
  color: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  text-align: center;
  margin-bottom: 12px;
  flex-shrink: 0;
  position: relative;
}

.help-btn {
  position: absolute;
  top: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 4px;
  color: #FF4500;
}

.tagline {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 12px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  flex: 1;
  min-height: 0;
}

.card {
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
  min-height: 0;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.card-image {
  flex: 1;
  background: #252525;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.no-preview {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.4);
}

.card-info {
  padding: 10px;
}

.card-info h2 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 2px;
}

.card-info p {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.footer {
  text-align: center;
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.footer code {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
}

@media (max-width: 768px) {
  .homepage {
    padding: 16px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .header h1 {
    font-size: 1.6rem;
  }

  .grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto;
    gap: 10px;
    flex: none;
  }

  .card-image {
    aspect-ratio: 4 / 3;
    flex: none;
  }

  .card-info {
    padding: 10px;
  }

  .card-info h2 {
    font-size: 0.85rem;
  }

  .card-info p {
    font-size: 0.75rem;
  }
}

/* Light mode overrides */
.homepage.light {
  color: #000;
}

.homepage.light .tagline {
  color: rgba(0, 0, 0, 0.6);
}

.homepage.light .help-btn {
  background: rgba(0, 0, 0, 0.1);
  color: #000;
}

.homepage.light .help-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

.homepage.light .card {
  background: #f0f0f0;
}

.homepage.light .card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.homepage.light .card-image {
  background: #e0e0e0;
}

.homepage.light .spinner {
  border-color: rgba(0, 0, 0, 0.1);
  border-top-color: rgba(0, 0, 0, 0.5);
}

.homepage.light .no-preview {
  color: rgba(0, 0, 0, 0.4);
}

.homepage.light .card-info h2 {
  color: #000;
}

.homepage.light .card-info p {
  color: rgba(0, 0, 0, 0.5);
}

.homepage.light .footer {
  color: rgba(0, 0, 0, 0.4);
}

.homepage.light .footer code {
  background: rgba(0, 0, 0, 0.1);
}
</style>
