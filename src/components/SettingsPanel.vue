<script setup>
const props = defineProps({
  settings: {
    type: Object,
    required: true
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'reset'])

const imageDelayOptions = [
  { value: 3000, label: '3 seconds' },
  { value: 5000, label: '5 seconds' },
  { value: 10000, label: '10 seconds' },
  { value: 15000, label: '15 seconds' },
  { value: 30000, label: '30 seconds' }
]

const videoModeOptions = [
  { value: 'wait', label: 'Wait for video to end' },
  { value: 'fixed', label: 'Use fixed time' },
  { value: 'skip', label: 'Skip videos' }
]

const galleryModeOptions = [
  { value: 'all', label: 'View all images' },
  { value: 'fixed', label: 'Fixed time per image' }
]

const nsfwOptions = [
  { value: 'show', label: 'Show' },
  { value: 'blur', label: 'Blur' },
  { value: 'hide', label: 'Hide' }
]
</script>

<template>
  <Teleport to="body">
    <div class="settings-overlay" v-if="visible" @click.self="emit('close')">
      <div class="settings-panel">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="close-btn" @click="emit('close')">×</button>
        </div>

        <div class="settings-content">
          <!-- Slideshow Section -->
          <section class="settings-section">
            <h3>Slideshow</h3>

            <label class="setting-row toggle">
              <span>Auto-next</span>
              <input type="checkbox" v-model="settings.autoNext.enabled" />
            </label>

            <label class="setting-row">
              <span>Image delay</span>
              <select v-model="settings.autoNext.imageDelay">
                <option
                  v-for="opt in imageDelayOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label class="setting-row">
              <span>Video behavior</span>
              <select v-model="settings.autoNext.videoMode">
                <option
                  v-for="opt in videoModeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label class="setting-row">
              <span>Gallery behavior</span>
              <select v-model="settings.autoNext.galleryMode">
                <option
                  v-for="opt in galleryModeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>
          </section>

          <!-- Display Section -->
          <section class="settings-section">
            <h3>Display</h3>

            <label class="setting-row toggle">
              <span>Show post info</span>
              <input type="checkbox" v-model="settings.display.showInfo" />
            </label>

            <label class="setting-row toggle">
              <span>Show progress bar</span>
              <input type="checkbox" v-model="settings.display.showProgress" />
            </label>

            <label class="setting-row">
              <span>Background color</span>
              <input
                type="color"
                v-model="settings.display.backgroundColor"
                class="color-input"
              />
            </label>
          </section>

          <!-- Video Section -->
          <section class="settings-section">
            <h3>Video</h3>

            <label class="setting-row toggle">
              <span>Autoplay videos</span>
              <input type="checkbox" v-model="settings.video.autoplay" />
            </label>

            <label class="setting-row toggle">
              <span>Muted by default</span>
              <input type="checkbox" v-model="settings.video.muted" />
            </label>

            <label class="setting-row toggle">
              <span>Loop videos</span>
              <input type="checkbox" v-model="settings.video.loop" />
            </label>
          </section>

          <!-- Content Section -->
          <section class="settings-section">
            <h3>Content</h3>

            <label class="setting-row">
              <span>NSFW content</span>
              <select v-model="settings.content.nsfwMode">
                <option
                  v-for="opt in nsfwOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label class="setting-row">
              <span>Min upvotes</span>
              <input
                type="number"
                v-model.number="settings.content.minUpvotes"
                min="0"
                step="100"
              />
            </label>
          </section>

          <!-- Navigation Section -->
          <section class="settings-section">
            <h3>Navigation</h3>

            <label class="setting-row toggle">
              <span>Keyboard shortcuts</span>
              <input type="checkbox" v-model="settings.navigation.keyboardEnabled" />
            </label>

            <label class="setting-row">
              <span>Swipe sensitivity</span>
              <input
                type="range"
                v-model.number="settings.navigation.swipeSensitivity"
                min="20"
                max="100"
              />
            </label>
          </section>

          <!-- Performance Section -->
          <section class="settings-section">
            <h3>Performance</h3>

            <label class="setting-row toggle">
              <span>Preload media</span>
              <input type="checkbox" v-model="settings.performance.preloadEnabled" />
            </label>
          </section>

          <!-- Reset -->
          <div class="settings-footer">
            <button class="reset-btn" @click="emit('reset')">
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-panel {
  width: 90%;
  max-width: 400px;
  max-height: 80vh;
  background: #1a1a1a;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-header h2 {
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.setting-row span {
  color: #fff;
  font-size: 14px;
}

.setting-row select,
.setting-row input[type="number"] {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  padding: 8px 12px;
  font-size: 14px;
}

.setting-row input[type="number"] {
  width: 100px;
  text-align: right;
}

.setting-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  accent-color: #4a9eff;
}

.setting-row input[type="range"] {
  width: 120px;
  accent-color: #4a9eff;
}

.setting-row .color-input {
  width: 50px;
  height: 36px;
  padding: 2px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
}

.settings-footer {
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.reset-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 100, 100, 0.2);
  border: none;
  border-radius: 8px;
  color: #ff6464;
  font-size: 14px;
  cursor: pointer;
}

.reset-btn:hover {
  background: rgba(255, 100, 100, 0.3);
}
</style>
