<script setup>
import { watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useSettings } from '../composables/useSettings.js'

defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'reset'])

// Use the singleton settings directly to avoid prop mutation warnings
const { settings } = useSettings()

// Store user's colors before frame presets override them
let savedBackgroundColor = null
let savedFrameColor = null

// Frame styles that override colors
const framePresets = {
  'mat': { bg: '#ffffff', frame: '#000000' }
}

// Save and restore colors when switching frame styles
watch(() => settings.display.frameStyle, (newStyle, oldStyle) => {
  const oldHadPreset = oldStyle && framePresets[oldStyle]
  const newHasPreset = framePresets[newStyle]

  // If leaving a non-preset style, save current colors
  if (!oldHadPreset && oldStyle !== undefined) {
    savedBackgroundColor = settings.display.backgroundColor
    savedFrameColor = settings.display.frameColor
  }

  if (newHasPreset) {
    // Apply preset colors
    if (newHasPreset.bg) {
      settings.display.backgroundColor = newHasPreset.bg
    }
    if (newHasPreset.frame) {
      settings.display.frameColor = newHasPreset.frame
    }
  } else if (oldHadPreset && savedBackgroundColor !== null) {
    // Restore saved colors when leaving a preset style
    settings.display.backgroundColor = savedBackgroundColor
    settings.display.frameColor = savedFrameColor
  }
})

const imageDelayOptions = [
  { value: 3000, label: '3 seconds' },
  { value: 5000, label: '5 seconds' },
  { value: 10000, label: '10 seconds' },
  { value: 15000, label: '15 seconds' },
  { value: 30000, label: '30 seconds' },
  { value: 60000, label: '1 minute' },
  { value: 120000, label: '2 minutes' },
  { value: 300000, label: '5 minutes' },
  { value: 600000, label: '10 minutes' },
  { value: 1800000, label: '30 minutes' },
  { value: 3600000, label: '1 hour' }
]

const videoModeOptions = [
  { value: 'once', label: 'Play once (then advance)' },
  { value: 'wait', label: 'Wait for video to end' },
  { value: 'fixed', label: 'Use fixed time' },
  { value: 'skip', label: 'Skip videos' }
]

const nsfwOptions = [
  { value: 'show', label: 'Show' },
  { value: 'blur', label: 'Blur' },
  { value: 'hide', label: 'Hide' }
]

const animationTypeOptions = [
  { value: 'none', label: 'None (instant)' },
  { value: 'slide', label: 'Slide' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide-fade', label: 'Slide + Fade' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'kenburns', label: 'Ken Burns' },
  { value: 'blur', label: 'Blur' }
]

const animationDurationOptions = [
  { value: 200, label: '200ms' },
  { value: 300, label: '300ms' },
  { value: 400, label: '400ms' },
  { value: 500, label: '500ms' },
  { value: 600, label: '600ms' },
  { value: 800, label: '800ms' },
  { value: 1000, label: '1 second' },
  { value: 1500, label: '1.5 seconds' },
  { value: 2000, label: '2 seconds' },
  { value: 3000, label: '3 seconds' }
]

const animationEasingOptions = [
  { value: 'ease', label: 'Ease' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'snappy', label: 'Snappy' },
  { value: 'bounce', label: 'Bounce' }
]

const inactivityTimeoutOptions = [
  { value: 0, label: 'Never hide' },
  { value: 3000, label: '3 seconds' },
  { value: 5000, label: '5 seconds' },
  { value: 10000, label: '10 seconds' },
  { value: 30000, label: '30 seconds' },
  { value: 60000, label: '1 minute' }
]

const frameStyleOptions = [
  { value: 'none', label: 'None' },
  { value: 'shadow-soft', label: 'Soft glow' },
  { value: 'mat', label: 'Gallery' }
]
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="settings-overlay" @click.self="emit('close')">
      <div class="settings-panel">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="close-btn" @click="emit('close')"><X :size="20" /></button>
        </div>

        <div class="settings-content">
          <!-- Slideshow Section -->
          <section class="settings-section">
            <h3>Slideshow</h3>

            <label class="setting-row toggle">
              <span>Auto-next</span>
              <input v-model="settings.autoNext.enabled" type="checkbox" />
            </label>

            <label class="setting-row">
              <span>Slide duration</span>
              <select v-model="settings.autoNext.imageDelay">
                <option v-for="opt in imageDelayOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <p class="setting-hint">Time per image and gallery slide</p>

            <label class="setting-row">
              <span>Video behavior</span>
              <select v-model="settings.autoNext.videoMode">
                <option v-for="opt in videoModeOptions" :key="opt.value" :value="opt.value">
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
              <input v-model="settings.display.showInfo" type="checkbox" />
            </label>

            <label class="setting-row toggle">
              <span>Show progress bar</span>
              <input v-model="settings.display.showProgress" type="checkbox" />
            </label>

            <label class="setting-row">
              <span>Background color</span>
              <input v-model="settings.display.backgroundColor" type="color" class="color-input" />
            </label>

            <label class="setting-row">
              <span>Hide UI after</span>
              <select v-model="settings.display.inactivityTimeout">
                <option v-for="opt in inactivityTimeoutOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label class="setting-row">
              <span>Frame style</span>
              <select v-model="settings.display.frameStyle">
                <option v-for="opt in frameStyleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label v-if="settings.display.frameStyle !== 'none'" class="setting-row">
              <span>Frame color</span>
              <input v-model="settings.display.frameColor" type="color" class="color-input" />
            </label>
            <p class="setting-hint">Adds decorative frame around media</p>
          </section>

          <!-- Video Section -->
          <section class="settings-section">
            <h3>Video</h3>

            <label class="setting-row toggle">
              <span>Autoplay videos</span>
              <input v-model="settings.video.autoplay" type="checkbox" />
            </label>

            <label class="setting-row toggle">
              <span>Muted by default</span>
              <input v-model="settings.video.muted" type="checkbox" />
            </label>

            <label class="setting-row toggle">
              <span>Loop videos</span>
              <input v-model="settings.video.loop" type="checkbox" />
            </label>
          </section>

          <!-- Content Section -->
          <section class="settings-section">
            <h3>Content</h3>

            <label class="setting-row">
              <span>NSFW content</span>
              <select v-model="settings.content.nsfwMode">
                <option v-for="opt in nsfwOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label class="setting-row">
              <span>Min upvotes</span>
              <input
                v-model.number="settings.content.minUpvotes"
                type="number"
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
              <input v-model="settings.navigation.keyboardEnabled" type="checkbox" />
            </label>

            <label class="setting-row">
              <span>Swipe sensitivity</span>
              <input
                v-model.number="settings.navigation.swipeSensitivity"
                type="range"
                min="20"
                max="100"
              />
            </label>
          </section>

          <!-- Animation Section -->
          <section class="settings-section">
            <h3>Animation</h3>

            <label class="setting-row">
              <span>Transition type</span>
              <select v-model="settings.animation.type">
                <option v-for="opt in animationTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label v-if="settings.animation.type !== 'none'" class="setting-row">
              <span>Speed</span>
              <select v-model.number="settings.animation.duration">
                <option v-for="opt in animationDurationOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>

            <label v-if="settings.animation.type !== 'none'" class="setting-row">
              <span>Easing</span>
              <select v-model="settings.animation.easing">
                <option v-for="opt in animationEasingOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
          </section>

          <!-- Performance Section -->
          <section class="settings-section">
            <h3>Performance</h3>

            <label class="setting-row toggle">
              <span>Preload media</span>
              <input v-model="settings.performance.preloadEnabled" type="checkbox" />
            </label>
          </section>

          <!-- Reset -->
          <div class="settings-footer">
            <button class="reset-btn" @click="emit('reset')">Reset to defaults</button>
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

.setting-hint {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  margin: -8px 0 8px 0;
  padding: 0;
}

.setting-row select,
.setting-row input[type='number'] {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: #fff;
  padding: 8px 12px;
  font-size: 14px;
}

.setting-row input[type='number'] {
  width: 100px;
  text-align: right;
}

.setting-row input[type='checkbox'] {
  width: 20px;
  height: 20px;
  accent-color: #4a9eff;
}

.setting-row input[type='range'] {
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
