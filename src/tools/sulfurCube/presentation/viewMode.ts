import type { Theme } from '@/utils/theme'

export type SulfurCubeViewMode = 'full' | 'compact'

export function parseSulfurCubeViewMode(view: unknown): SulfurCubeViewMode {
  return view === 'compact' ? 'compact' : 'full'
}

export function createFullSulfurCubeToolUrl(currentUrl: string, inheritedTheme: Theme): string {
  const url = new URL(currentUrl)

  url.searchParams.delete('view')
  url.searchParams.set('theme', inheritedTheme)
  url.hash = ''

  return url.toString()
}
