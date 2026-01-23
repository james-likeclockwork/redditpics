import { ref, onMounted, onUnmounted } from 'vue'

export function useSwipe(elementRef, options = {}) {
  const {
    threshold = 50,
    onSwipeUp = null,
    onSwipeDown = null,
    onSwipeLeft = null,
    onSwipeRight = null,
    preventScroll = true
  } = options

  const isSwiping = ref(false)
  const direction = ref(null)
  const deltaX = ref(0)
  const deltaY = ref(0)

  let startX = 0
  let startY = 0
  let startTime = 0

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return

    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
    startTime = Date.now()
    isSwiping.value = true
    direction.value = null
    deltaX.value = 0
    deltaY.value = 0
  }

  function handleTouchMove(e) {
    if (!isSwiping.value || e.touches.length !== 1) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY

    deltaX.value = currentX - startX
    deltaY.value = currentY - startY

    // Determine primary direction
    if (!direction.value) {
      if (Math.abs(deltaX.value) > Math.abs(deltaY.value)) {
        direction.value = deltaX.value > 0 ? 'right' : 'left'
      } else {
        direction.value = deltaY.value > 0 ? 'down' : 'up'
      }
    }

    // Prevent default scroll for vertical swipes
    if (preventScroll && (direction.value === 'up' || direction.value === 'down')) {
      e.preventDefault()
    }
  }

  function handleTouchEnd(e) {
    if (!isSwiping.value) return

    const elapsed = Date.now() - startTime
    const velocity = Math.sqrt(deltaX.value ** 2 + deltaY.value ** 2) / elapsed

    // Check if swipe exceeds threshold
    const absX = Math.abs(deltaX.value)
    const absY = Math.abs(deltaY.value)

    // Fast swipe or long swipe
    const isValidSwipe = velocity > 0.5 || absX > threshold || absY > threshold

    if (isValidSwipe) {
      if (absY > absX) {
        // Vertical swipe
        if (deltaY.value < 0 && onSwipeUp) {
          onSwipeUp()
        } else if (deltaY.value > 0 && onSwipeDown) {
          onSwipeDown()
        }
      } else {
        // Horizontal swipe
        if (deltaX.value < 0 && onSwipeLeft) {
          onSwipeLeft()
        } else if (deltaX.value > 0 && onSwipeRight) {
          onSwipeRight()
        }
      }
    }

    isSwiping.value = false
    direction.value = null
    deltaX.value = 0
    deltaY.value = 0
  }

  function handleTouchCancel() {
    isSwiping.value = false
    direction.value = null
    deltaX.value = 0
    deltaY.value = 0
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    el.addEventListener('touchcancel', handleTouchCancel, { passive: true })
  })

  onUnmounted(() => {
    const el = elementRef.value
    if (!el) return

    el.removeEventListener('touchstart', handleTouchStart)
    el.removeEventListener('touchmove', handleTouchMove)
    el.removeEventListener('touchend', handleTouchEnd)
    el.removeEventListener('touchcancel', handleTouchCancel)
  })

  return {
    isSwiping,
    direction,
    deltaX,
    deltaY
  }
}
