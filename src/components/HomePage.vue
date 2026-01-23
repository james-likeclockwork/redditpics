<script setup>
import { ref, onMounted } from 'vue'
import { extractMedia } from '../utils/mediaExtractor'

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

const subreddits = ref(FEATURED_SUBREDDITS.map(sub => ({
  ...sub,
  previewUrl: null,
  loading: true,
  error: false
})))

async function fetchPreview(index) {
  const sub = subreddits.value[index]
  try {
    // Use hot instead of top/day - more reliable for less active subreddits
    const response = await fetch(
      `/api/reddit/r/${sub.name}/hot.json?limit=10&raw_json=1`,
      { signal: AbortSignal.timeout(10000) }
    )

    if (!response.ok) throw new Error('Failed to fetch')

    const data = await response.json()
    const children = data?.data?.children || []

    // Find first post with extractable media
    for (const child of children) {
      const media = extractMedia(child)
      if (media && (media.type === 'image' || media.type === 'gallery')) {
        const url = media.type === 'gallery' ? media.items[0]?.url : media.url
        if (url) {
          subreddits.value[index].previewUrl = url
          break
        }
      }
    }
  } catch (e) {
    console.error(`Failed to fetch preview for ${sub.name}:`, e)
    subreddits.value[index].error = true
  } finally {
    subreddits.value[index].loading = false
  }
}

onMounted(() => {
  // Fetch all previews in parallel
  subreddits.value.forEach((_, index) => fetchPreview(index))
})
</script>

<template>
  <div class="homepage">
    <header class="header">
      <h1>RedditPics</h1>
      <p class="tagline">A distraction-free media viewer for Reddit</p>
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
  </div>
</template>

<style scoped>
.homepage {
  height: 100vh;
  background: #0a0a0a;
  color: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  text-align: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.tagline {
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-width: 700px;
  width: 100%;
  margin: 0 auto;
  flex: 1;
  align-content: center;
}

.card {
  display: block;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.card-image {
  aspect-ratio: 4 / 3;
  background: #252525;
  position: relative;
  overflow: hidden;
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
  margin-top: 16px;
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
  }

  .header h1 {
    font-size: 1.8rem;
  }

  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .card-info {
    padding: 12px;
  }

  .card-info h2 {
    font-size: 0.95rem;
  }

  .card-info p {
    font-size: 0.8rem;
  }
}
</style>
