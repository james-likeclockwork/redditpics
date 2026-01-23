<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const shortcuts = [
  { keys: ['↑', 'W', 'K'], action: 'Previous post' },
  { keys: ['↓', 'S', 'J'], action: 'Next post' },
  { keys: ['←', 'A'], action: 'Previous gallery image / Seek video -5s' },
  { keys: ['→', 'D'], action: 'Next gallery image / Seek video +5s' },
  { keys: ['Space'], action: 'Toggle slideshow' },
  { keys: ['F'], action: 'Toggle fullscreen' },
  { keys: ['M'], action: 'Toggle mute' },
  { keys: ['I'], action: 'Toggle info overlay' },
  { keys: ['Esc'], action: 'Exit fullscreen / Close modal' }
]
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
      <div class="modal">
        <button class="close-btn" @click="emit('close')">✕</button>

        <h2>How It Works</h2>

        <section class="section">
          <h3>Browsing</h3>
          <p>Swipe up/down or use the navigation buttons to browse through posts. The app automatically loads more content as you scroll.</p>
        </section>

        <section class="section">
          <h3>URL Format</h3>
          <div class="url-examples">
            <code>/r/pics</code>
            <span class="desc">Browse r/pics (hot)</span>
            <code>/r/pics/top?t=week</code>
            <span class="desc">Top posts of the week</span>
            <code>/r/pics+gifs+videos</code>
            <span class="desc">Multiple subreddits</span>
          </div>
        </section>

        <section class="section">
          <h3>Slideshow</h3>
          <p>Press the play button or <kbd>Space</kbd> to start auto-advancing through posts. Configure timing and behavior in settings (⚙).</p>
        </section>

        <section class="section">
          <h3>Keyboard Shortcuts</h3>
          <table class="shortcuts">
            <tbody>
              <tr v-for="shortcut in shortcuts" :key="shortcut.action">
                <td class="keys">
                  <kbd v-for="key in shortcut.keys" :key="key">{{ key }}</kbd>
                </td>
                <td class="action">{{ shortcut.action }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="section">
          <h3>Supported Media</h3>
          <ul>
            <li>Reddit images and videos</li>
            <li>Reddit galleries</li>
            <li>Imgur images and GIFs</li>
            <li>Redgifs</li>
          </ul>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #1a1a1a;
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  color: #fff;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

h2 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section {
  margin-bottom: 20px;
}

.section:last-child {
  margin-bottom: 0;
}

h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  line-height: 1.5;
}

.url-examples {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px 16px;
  align-items: center;
}

.url-examples code {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85rem;
}

.url-examples .desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

.shortcuts {
  width: 100%;
  border-collapse: collapse;
}

.shortcuts tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.shortcuts tr:last-child {
  border-bottom: none;
}

.shortcuts td {
  padding: 8px 0;
}

.shortcuts .keys {
  width: 140px;
}

.shortcuts kbd {
  display: inline-block;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
  margin-right: 4px;
  min-width: 24px;
  text-align: center;
}

.shortcuts .action {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}

ul {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  padding-left: 20px;
  margin: 0;
}

ul li {
  margin-bottom: 4px;
}

ul li:last-child {
  margin-bottom: 0;
}

@media (max-width: 500px) {
  .modal {
    padding: 20px;
    max-height: 85vh;
  }

  .shortcuts .keys {
    width: 100px;
  }

  .shortcuts kbd {
    padding: 3px 6px;
    font-size: 0.75rem;
    min-width: 20px;
  }
}
</style>
