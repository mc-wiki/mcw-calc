// vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { theme } from './theme'

describe('theme', () => {
  it('should have an initial value of "light"', () => {
    expect(theme.value).toBe('light')
  })

  it('should be able to change the theme to "dark"', () => {
    theme.value = 'dark'
    expect(theme.value).toBe('dark')
  })
})
