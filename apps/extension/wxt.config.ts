import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'folio',
    description: 'RSS reader with AI assistance',
    permissions: ['sidePanel', 'storage'],
  },
})
