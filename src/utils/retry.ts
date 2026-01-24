export interface RetryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  shouldRetry?: (_error: Error, _attempt: number) => boolean
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: () => true
}

/**
 * Check if error is a rate limit (429)
 */
function isRateLimitError(error: Error): boolean {
  return error.message.includes('429') || error.message.toLowerCase().includes('rate limit')
}

/**
 * Executes a function with exponential backoff retry logic
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError, attempt)) {
        throw lastError
      }

      // Use longer delay for rate limiting (429)
      const baseDelay = isRateLimitError(lastError) ? opts.baseDelay * 5 : opts.baseDelay
      const maxDelay = isRateLimitError(lastError) ? opts.maxDelay * 3 : opts.maxDelay

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
      const jitter = Math.random() * 0.3 * exponentialDelay // 0-30% jitter
      const delay = Math.min(exponentialDelay + jitter, maxDelay)

      await sleep(delay)
    }
  }

  throw lastError || new Error('Retry failed')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Helper to check if an error is a network/temporary error worth retrying
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return true
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('aborted')) {
    return true
  }

  // HTTP 5xx errors
  if (
    message.includes('http 5') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504')
  ) {
    return true
  }

  // Rate limiting (429)
  if (message.includes('429') || message.includes('rate limit')) {
    return true
  }

  return false
}

/**
 * Pre-configured retry for API calls
 */
export async function withApiRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    shouldRetry: (error) => isRetryableError(error)
  })
}
