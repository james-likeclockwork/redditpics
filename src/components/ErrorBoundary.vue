<script setup>
import { ref, onErrorCaptured } from 'vue'
import { logger } from '../utils/logger.js'

const emit = defineEmits(['error'])

const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')

function handleRetry() {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
}

onErrorCaptured((error, instance, info) => {
  const errorObj = error instanceof Error ? error : new Error(String(error))

  hasError.value = true
  errorMessage.value = errorObj.message || 'An unexpected error occurred'
  errorDetails.value = info || ''

  // Log the error
  logger.log('error', `[ErrorBoundary] Caught error: ${errorObj.message}`, info)
  console.error('[ErrorBoundary]', error, info)

  // Emit for parent handling
  emit('error', { error: errorObj, info })

  // Prevent error from propagating
  return false
})
</script>

<template>
  <div class="error-boundary">
    <template v-if="hasError">
      <div class="error-container">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 class="error-title">Something went wrong</h2>
        <p class="error-message">{{ errorMessage }}</p>
        <button class="retry-button" @click="handleRetry">
          Try Again
        </button>
        <p v-if="errorDetails" class="error-details">
          {{ errorDetails }}
        </p>
      </div>
    </template>
    <slot v-else />
  </div>
</template>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #000;
  color: #fff;
}

.error-icon {
  color: #ff6b6b;
  margin-bottom: 16px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.error-message {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 24px 0;
  text-align: center;
  max-width: 400px;
}

.retry-button {
  padding: 12px 32px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.error-details {
  margin-top: 16px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
}
</style>
