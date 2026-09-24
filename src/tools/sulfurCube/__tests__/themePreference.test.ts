import { describe, expect, it } from 'vitest'
import {
  parseSulfurCubeThemePreference,
  resolveSulfurCubeThemePreference,
  setSulfurCubeThemePreferenceInUrl,
} from '../presentation/themePreference'

describe('sulfur-cube standalone theme preference', () => {
  it('accepts only supported preferences', () => {
    expect(parseSulfurCubeThemePreference('auto')).toBe('auto')
    expect(parseSulfurCubeThemePreference('light')).toBe('light')
    expect(parseSulfurCubeThemePreference('dark')).toBe('dark')
    expect(parseSulfurCubeThemePreference('unknown')).toBeNull()
    expect(parseSulfurCubeThemePreference(undefined)).toBeNull()
  })

  it('resolves automatic mode from the system preference', () => {
    expect(resolveSulfurCubeThemePreference('auto', false)).toBe('light')
    expect(resolveSulfurCubeThemePreference('auto', true)).toBe('dark')
    expect(resolveSulfurCubeThemePreference('light', true)).toBe('light')
    expect(resolveSulfurCubeThemePreference('dark', false)).toBe('dark')
  })

  it('reflects explicit preferences in the URL and removes automatic mode', () => {
    expect(
      setSulfurCubeThemePreferenceInUrl(
        'https://tools.minecraft.wiki/tools/sulfurCube/?preview=1',
        'dark',
      ),
    ).toBe('https://tools.minecraft.wiki/tools/sulfurCube/?preview=1&theme=dark')
    expect(
      setSulfurCubeThemePreferenceInUrl(
        'https://tools.minecraft.wiki/tools/sulfurCube/?preview=1&theme=light',
        'auto',
      ),
    ).toBe('https://tools.minecraft.wiki/tools/sulfurCube/?preview=1')
  })
})
