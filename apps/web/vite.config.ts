import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
})
