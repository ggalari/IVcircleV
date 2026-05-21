import { defineConfig } from 'vite'

export default defineConfig({
  base: '/IVcircleV/',
  server: {
    host: true,
    allowedHosts: true,
    port: 3030
  },
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/**/*.test.js'],
    browser: {
      enabled: false,
      provider: 'playwright',
      instances: [
        { browser: 'chromium' }
      ],
      headless: true,
    },
  },
})
