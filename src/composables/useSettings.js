import { reactive, watch } from 'vue'
import { storage } from '../services/storage'

const STORAGE_KEY = 'settings'
const DEBOUNCE_MS = 500

const defaultSettings = {
  autoNext: {
    enabled: true,
    imageDelay: 5000,
    videoMode: 'wait', // 'wait' | 'fixed' | 'skip'
    galleryMode: 'all' // 'all' | 'fixed'
  },
  display: {
    showInfo: true,
    showProgress: true,
    theme: 'dark',
    backgroundColor: '#000000'
  },
  video: {
    autoplay: true,
    muted: true,
    loop: false
  },
  content: {
    nsfwMode: 'show', // 'show' | 'blur' | 'hide'
    minUpvotes: 0
  },
  navigation: {
    swipeSensitivity: 50,
    keyboardEnabled: true
  },
  performance: {
    preloadEnabled: true
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function deepMerge(target, source) {
  const result = { ...target }
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

/**
 * Debounce function to reduce storage writes
 */
function debounce(fn, ms) {
  let timeoutId = null
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args)
      timeoutId = null
    }, ms)
  }
}

// Singleton instance
let settingsInstance = null

export function useSettings() {
  if (settingsInstance) {
    return settingsInstance
  }

  const settings = reactive(deepClone(defaultSettings))

  function load() {
    try {
      const stored = storage.get(STORAGE_KEY)
      if (stored) {
        const merged = deepMerge(defaultSettings, stored)
        Object.assign(settings, merged)
      }
    } catch (e) {
      console.warn('Failed to load settings:', e)
    }
  }

  function saveImmediate() {
    try {
      storage.set(STORAGE_KEY, settings)
    } catch (e) {
      console.warn('Failed to save settings:', e)
    }
  }

  // Debounced save to reduce storage writes
  const save = debounce(saveImmediate, DEBOUNCE_MS)

  function reset() {
    Object.assign(settings, deepClone(defaultSettings))
    saveImmediate() // Use immediate save for explicit reset
  }

  // Load on init
  load()

  // Auto-save on changes (debounced)
  watch(settings, save, { deep: true })

  settingsInstance = { settings, save: saveImmediate, load, reset }
  return settingsInstance
}
