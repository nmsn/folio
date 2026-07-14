import { createApp } from 'vinxi'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

/**
 * Vite 插件：把所有 .css 文件通过 postcss + tailwindcss + autoprefixer 链处理。
 *
 * 为什么需要：Vinxi 0.4.3 的 SPA dev server 内部把 Vite configFile 设为 false
 * （见 node_modules/vinxi/lib/dev-server.js:64），不读 vite.config.ts，所以
 * vite.config.ts 里的 `css.postcss: './postcss.config.js'` 配置没生效。
 * 结果：@tailwind 指令没被处理，app.css 里的 :root token 和
 * .folio-app grid 规则在浏览器里完全失效（CSS 规范不识别 @tailwind 指令）。
 *
 * 修复：在 client router 的 plugins 钩子里返回这个 Vite 插件，强制对所有
 * .css 文件跑 postcss 链。等价于手写 vite.config.ts 的 css.postcss。
 */
const postcssTailwindPlugin = {
  name: 'vinxi-postcss-tailwind',
  enforce: 'pre' as const,
  async transform(code: string, id: string) {
    if (!id.endsWith('.css')) return null
    const result = await postcss([tailwindcss(), autoprefixer()]).process(code, {
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
        // API 没有 /api 全局前缀，剥离 web 端的 /api 前缀
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
