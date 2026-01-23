/**
 * Toggleable verbose logging for debugging
 * Enable via: localStorage.setItem('redditp2-debug', 'true') or window.enableDebug()
 */

const LOG_LEVELS = {
  fetch: '🌐',
  nav: '🧭',
  media: '🖼️',
  preload: '📦',
  perf: '⚡',
  error: '❌'
}

let enabled = false

// Check localStorage on load
try {
  enabled = localStorage.getItem('redditp2-debug') === 'true'
} catch (e) {
  // localStorage not available
}

function formatTime() {
  const now = new Date()
  return `${now.toLocaleTimeString()}.${String(now.getMilliseconds()).padStart(3, '0')}`
}

function log(level, ...args) {
  if (!enabled) return
  const icon = LOG_LEVELS[level] || '📝'
  console.log(`[${formatTime()}] ${icon} [${level.toUpperCase()}]`, ...args)
}

// Performance timing helper
const timers = new Map()

function startTimer(label) {
  if (!enabled) return
  timers.set(label, performance.now())
}

function endTimer(label, ...extra) {
  if (!enabled) return
  const start = timers.get(label)
  if (start) {
    const duration = (performance.now() - start).toFixed(1)
    log('perf', `${label}: ${duration}ms`, ...extra)
    timers.delete(label)
  }
}

// Expose globally for easy console access
if (typeof window !== 'undefined') {
  window.enableDebug = () => {
    enabled = true
    localStorage.setItem('redditp2-debug', 'true')
    console.log('🔧 RedditP2 debug logging ENABLED. Refresh to see all logs.')
    console.log('   Disable with: window.disableDebug()')
  }

  window.disableDebug = () => {
    enabled = false
    localStorage.setItem('redditp2-debug', 'false')
    console.log('🔧 RedditP2 debug logging DISABLED')
  }

  window.debugStatus = () => {
    console.log(`🔧 Debug logging: ${enabled ? 'ENABLED' : 'DISABLED'}`)
  }
}

export const logger = {
  get enabled() { return enabled },

  // Fetching
  fetchStart: (url) => log('fetch', 'Fetching:', url),
  fetchEnd: (url, count) => log('fetch', `Fetched ${count} posts from:`, url),
  fetchError: (url, err) => log('error', 'Fetch failed:', url, err),

  // Navigation
  navTo: (index, total) => log('nav', `Navigate to ${index + 1}/${total}`),
  navJump: (from, to) => log('nav', `Jump from ${from + 1} to ${to + 1} (delta: ${Math.abs(to - from)})`),

  // Media loading
  mediaMount: (index, type, url) => log('media', `[${index}] Mount ${type}:`, url?.slice(0, 80)),
  mediaLoad: (index, type) => log('media', `[${index}] Loaded ${type}`),
  mediaError: (index, type, err) => log('error', `[${index}] Failed ${type}:`, err),

  // Virtualization
  visibleRange: (start, end, current) => log('nav', `Visible range: ${start}-${end}, current: ${current}`),
  slideMount: (index) => log('media', `[${index}] Slide mounted`),
  slideUnmount: (index) => log('media', `[${index}] Slide unmounted`),

  // Preloading
  preloadStart: (index, url) => log('preload', `[${index}] Preloading:`, url?.slice(0, 80)),
  preloadHit: (index) => log('preload', `[${index}] Cache hit`),

  // Timers
  startTimer,
  endTimer,

  // Raw log
  log
}
