import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/hajun-words/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '하준 영어단어',
        short_name: '영어단어',
        lang: 'ko',
        start_url: '/hajun-words/',
        scope: '/hajun-words/',
        display: 'standalone',
        background_color: '#f6f7fb',
        theme_color: '#2563eb',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: '/hajun-words/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/hajun-words/content/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'content', networkTimeoutSeconds: 3, expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
  ],
  build: { emptyOutDir: false },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
