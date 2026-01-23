import { vi } from 'vitest'

// Polyfill AbortSignal.any for jsdom
if (typeof AbortSignal.any !== 'function') {
  ;(AbortSignal as unknown as { any: typeof AbortSignal.any }).any = function (
    signals: AbortSignal[]
  ): AbortSignal {
    const controller = new AbortController()

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason)
        return controller.signal
      }

      signal.addEventListener('abort', () => {
        controller.abort(signal.reason)
      })
    }

    return controller.signal
  }
}

// Polyfill AbortSignal.timeout for jsdom
if (typeof AbortSignal.timeout !== 'function') {
  ;(AbortSignal as unknown as { timeout: typeof AbortSignal.timeout }).timeout = function (
    ms: number
  ): AbortSignal {
    const controller = new AbortController()
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms)
    return controller.signal
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})
