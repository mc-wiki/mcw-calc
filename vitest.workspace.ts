import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    extends: 'vite.config.ts',
    test: {
      include: ['**/*.browser.{test,spec}.ts'],
      name: 'browser',
      browser: {
        enabled: true,
        name: 'chrome',
      },
    },
  },
  {
    extends: 'vite.config.ts',
    test: {
      include: ['**/*.!{browser.}{test,spec}.ts'],
      name: 'unit',
      environment: 'jsdom',
    },
  },
])
