/**
 * Storage adapter interface for abstracting storage backends
 */
export interface StorageAdapter {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
  clear(): void
}

/**
 * LocalStorage implementation
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string

  constructor(prefix = '') {
    this.prefix = prefix
  }

  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}-${key}` : key
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.getKey(key))
      if (item === null) {
        return null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.warn(`Failed to get item from localStorage: ${key}`, error)
      return null
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value))
    } catch (error) {
      console.warn(`Failed to set item in localStorage: ${key}`, error)
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key))
    } catch (error) {
      console.warn(`Failed to remove item from localStorage: ${key}`, error)
    }
  }

  clear(): void {
    try {
      if (this.prefix) {
        // Only clear items with our prefix
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(this.prefix)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key))
      } else {
        localStorage.clear()
      }
    } catch (error) {
      console.warn('Failed to clear localStorage', error)
    }
  }
}

/**
 * In-memory storage implementation (for testing/SSR)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, string> = new Map()

  get<T>(key: string): T | null {
    const item = this.store.get(key)
    if (item === undefined) {
      return null
    }
    try {
      return JSON.parse(item) as T
    } catch {
      return null
    }
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, JSON.stringify(value))
  }

  remove(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

/**
 * Create appropriate storage adapter based on environment
 */
export function createStorageAdapter(prefix = ''): StorageAdapter {
  // Check if localStorage is available
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return new LocalStorageAdapter(prefix)
    } catch {
      // localStorage not available or quota exceeded
    }
  }

  // Fallback to memory storage
  return new MemoryStorageAdapter()
}

// Default storage instance for the app
export const storage = createStorageAdapter('redditp2')
