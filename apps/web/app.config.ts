import { createApp } from 'vinxi'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'

/**
 * Vite 插件：把所有 .css 文件通过 @tailwindcss/postcss 处理。
 *
 * Vinxi SPA dev server 把 Vite configFile 设为 false，不读 vite.config.ts，
 * 所以必须在 client router plugins 里强制跑 PostCSS。
 */
const postcssTailwindPlugin = {
  name: 'vinxi-postcss-tailwind',
  enforce: 'pre' as const,
  async transform(code: string, id: string) {
    if (!id.endsWith('.css')) return null
    const result = await postcss([tailwindcss()]).process(code, {
      from: id,
      map: { inline: false },
    })
    return {
      code: result.css,
      map: result.map ? result.map.toJSON() : null,
    }
  },
}

export default createApp({
  server: {
    compatibilityDate: '2026-06-06',
    devProxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  routers: [
    {
      name: 'public',
      type: 'static',
      dir: './public',
    },
    {
      name: 'client',
      type: 'spa',
      handler: './index.html',
      target: 'browser',
      plugins: () => [postcssTailwindPlugin],
    },
  ],
})
