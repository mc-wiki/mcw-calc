import { fileURLToPath } from 'node:url'
import vueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
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
  test: {
    globals: true,
    includeTaskLocation: true,
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reportsDirectory: '../coverage',
    },
  },
  server: {
    port: process.env.VITEST ? 50179 : undefined,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: 'hidden',
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
