import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { globSync } from 'glob'
import { fileURLToPath } from 'url'

const input = globSync('./src/tools/*/index.html', {
  posix: true,
})
  .map((path) => `./${path}`)
  .reduce((acc, path) => {
    const key = path.match(/src\/tools\/(.+)\/index\.html/)![1]
    acc[key] = {
      import: path,
    }
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
    rollupOptions: {
      input,
    },
  },
  plugins: [vue()],
})
