import { isValidRedgifsTokenResponse } from '../utils/apiValidation'
import { logger } from '../utils/logger'

// Token expires after 24 hours, refresh at 23 hours
const TOKEN_REFRESH_MS = 23 * 60 * 60 * 1000

interface TokenState {
  token: string | null
  expiresAt: number
  pending: Promise<string> | null
}

const state: TokenState = {
  token: null,
  expiresAt: 0,
  pending: null
}

/**
 * Singleton token manager for Redgifs API
 * - Caches token for 23 hours
 * - Deduplicates concurrent token requests
 */
export async function getRedgifsToken(): Promise<string> {
  const now = Date.now()

  // Return cached token if still valid
  if (state.token && now < state.expiresAt) {
    return state.token
  }

  // If a request is already in flight, wait for it
  if (state.pending) {
    return state.pending
  }

  // Start new token fetch
  state.pending = fetchNewToken()

  try {
    const token = await state.pending
    return token
  } finally {
    state.pending = null
  }
}

async function fetchNewToken(): Promise<string> {
  logger.log('fetch', '[redgifs] Fetching new auth token')

  const response = await fetch('/api/redgifs/v2/auth/temporary', {
    signal: AbortSignal.timeout(10000)
  })

  if (!response.ok) {
    throw new Error(`Failed to get Redgifs token: HTTP ${response.status}`)
  }

  const data = await response.json()

  if (!isValidRedgifsTokenResponse(data)) {
    throw new Error('Invalid Redgifs token response')
  }

  state.token = data.token
  state.expiresAt = Date.now() + TOKEN_REFRESH_MS

  logger.log('fetch', '[redgifs] Token cached')

  return data.token
}

/**
 * Clear the cached token (useful for testing or on auth errors)
 */
export function clearRedgifsToken(): void {
  state.token = null
  state.expiresAt = 0
  state.pending = null
}

/**
 * Check if we have a valid cached token
 */
export function hasValidToken(): boolean {
  return state.token !== null && Date.now() < state.expiresAt
}
