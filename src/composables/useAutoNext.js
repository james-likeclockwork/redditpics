import { ref, onUnmounted } from 'vue'

export function useAutoNext(onComplete) {
  const isPlaying = ref(false)
  const progress = ref(0)
  const timeRemaining = ref(0)

  let duration = 0
  let startTime = 0
  let pausedTime = 0
  let animationFrame = null

  function tick() {
    if (!isPlaying.value) return

    const elapsed = Date.now() - startTime
    progress.value = Math.min((elapsed / duration) * 100, 100)
    timeRemaining.value = Math.max(duration - elapsed, 0)

    if (elapsed >= duration) {
      stop()
      if (onComplete) {
        onComplete()
      }
    } else {
      animationFrame = requestAnimationFrame(tick)
    }
  }

  function start(durationMs) {
    stop()
    duration = durationMs
    startTime = Date.now()
    pausedTime = 0
    progress.value = 0
    timeRemaining.value = duration
    isPlaying.value = true
    animationFrame = requestAnimationFrame(tick)
  }

  function pause() {
    if (!isPlaying.value) return
    pausedTime = Date.now() - startTime
    isPlaying.value = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  function resume() {
    if (isPlaying.value || pausedTime === 0) return
    startTime = Date.now() - pausedTime
    isPlaying.value = true
    animationFrame = requestAnimationFrame(tick)
  }

  function stop() {
    isPlaying.value = false
    progress.value = 0
    timeRemaining.value = 0
    pausedTime = 0
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  function reset() {
    stop()
    if (duration > 0) {
      start(duration)
    }
  }

  onUnmounted(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  })

  return {
    isPlaying,
    progress,
    timeRemaining,
    start,
    pause,
    resume,
    stop,
    reset
  }
}
