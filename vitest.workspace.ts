import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: 'vite.config.ts',
    test: {
      setupFiles: ['../vitest.browser.setup.ts'],
      include: ['**/*.browser.{test,spec}.ts'],
      name: 'browser',
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
      },
    },
  },
  {
    extends: 'vite.config.ts',
    test: {
      setupFiles: ['./vitest.jsdom.setup.ts'],
      include: ['**/!(*.browser).{test,spec}.ts'],
      name: 'unit',
      environment: 'jsdom',
    },
  },
])
