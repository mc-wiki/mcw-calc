import type { Theme } from '@/utils/theme'

export type SulfurCubeThemePreference = 'auto' | Theme

export const sulfurCubeThemePreferenceStorageKey = 'mcwCalc:sulfurCube:theme:v1'

export function parseSulfurCubeThemePreference(value: unknown): SulfurCubeThemePreference | null {
  return value === 'auto' || value === 'light' || value === 'dark' ? value : null
}

export function resolveSulfurCubeThemePreference(
  preference: SulfurCubeThemePreference,
  systemPrefersDark: boolean,
): Theme {
  if (preference === 'auto') return systemPrefersDark ? 'dark' : 'light'

  return preference
}

export function setSulfurCubeThemePreferenceInUrl(
  currentUrl: string,
  preference: SulfurCubeThemePreference,
): string {
  const url = new URL(currentUrl)

  if (preference === 'auto') url.searchParams.delete('theme')
  else url.searchParams.set('theme', preference)

  return url.toString()
}
