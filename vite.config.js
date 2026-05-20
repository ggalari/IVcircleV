import { defineConfig } from 'vite'

export default defineConfig({
  base: '/IVcircleV/',
  server: {
    host: true,
    allowedHosts: true,
    port: 3030
  }
})
