import { fileURLToPath } from 'node:url'
import vueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { globSync } from 'glob'
import { visualizer } from 'rollup-plugin-visualizer'
import vueMacros from 'unplugin-vue-macros/vite'
import { defineConfig } from 'vite'
import { comlink } from 'vite-plugin-comlink'
import vueDevTools from 'vite-plugin-vue-devtools'

const input = globSync('./src/tools/*/index.html', {
  posix: true,
})
  .map((path) => `./${path}`)
  .reduce((acc, path) => {
    const key = path.match(/src\/tools\/(.+)\/index\.html/)![1]
    acc[key] = path
    return acc
  }, {})

// https://vitejs.dev/config/
export default defineConfig({
  root: fileURLToPath(new URL('./src', import.meta.url)),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: 'hidden',
    rolldownOptions: {
      input,
    },
  },
  plugins: [
    vueMacros({
      plugins: {
        vue: vue(),
      },
    }),
    vueDevTools(),
    visualizer(),
    comlink(),
    vueI18nPlugin({
      include: fileURLToPath(new URL('./src/tools/*/locale/*.json', import.meta.url)),
    }),
    tailwindcss(),
  ],
  worker: {
    plugins: () => [comlink()],
  },
})
