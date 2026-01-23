import { reactive, watch } from 'vue'

const STORAGE_KEY = 'redditp2-settings'

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
    theme: 'dark'
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

// Singleton instance
let settingsInstance = null

export function useSettings() {
  if (settingsInstance) {
    return settingsInstance
  }

  const settings = reactive(deepClone(defaultSettings))

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const merged = deepMerge(defaultSettings, parsed)
        Object.assign(settings, merged)
      }
    } catch (e) {
      console.warn('Failed to load settings:', e)
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.warn('Failed to save settings:', e)
    }
  }

  function reset() {
    Object.assign(settings, deepClone(defaultSettings))
    save()
  }

  // Load on init
  load()

  // Auto-save on changes
  watch(settings, save, { deep: true })

  settingsInstance = { settings, save, load, reset }
  return settingsInstance
}
