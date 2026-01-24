<script setup>
defineProps({
  progress: {
    type: Number,
    default: 0
  },
  visible: {
    type: Boolean,
    default: true
  }
})
</script>

<template>
  <div class="progress-bar" :class="{ visible }">
    <div class="progress-fill" :style="{ width: progress + '%' }"></div>
  </div>
</template>

<style scoped>
.progress-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  z-index: 100;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.progress-bar.visible {
  opacity: 1;
}

.progress-fill {
  height: 100%;
  background: #fff;
  transition: width 0.1s linear;
}
</style>
