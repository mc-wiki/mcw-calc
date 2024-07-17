import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueMacros from 'unplugin-vue-macros/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { visualizer } from 'rollup-plugin-visualizer'
import { comlink } from 'vite-plugin-comlink'
import vueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { globSync } from 'glob'
import { fileURLToPath } from 'url'

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
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      reportsDirectory: '../coverage',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input,
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  plugins: [
    vueMacros({
      plugins: {
        vue: vue(),
      },

      shortBind: true,
      booleanProp: true,
    }),
    vueDevTools(),
    visualizer(),
    comlink(),
    vueI18nPlugin({
      include: fileURLToPath(new URL('./src/tools/*/locale/*.json', import.meta.url)),
    }),
  ],
  worker: {
    plugins: () => [comlink()],
  },
})
