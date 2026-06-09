import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      '/api/reddit': {
        target: 'https://www.reddit.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reddit/, ''),
        headers: {
          'User-Agent': 'web:co.za.jameshome.pics:v1.0 (+https://pics.jameshome.co.za)'
        }
      },
      '/api/redgifs': {
        target: 'https://api.redgifs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/redgifs/, '')
      },
      '/media/redgifs': {
        target: 'https://media.redgifs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/media\/redgifs/, ''),
        headers: {
          Referer: 'https://www.redgifs.com/'
        }
      }
    }
  }
})
