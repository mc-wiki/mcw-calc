import { describe, expect, it } from 'vitest'
import { createFullSulfurCubeToolUrl, parseSulfurCubeViewMode } from '../presentation/viewMode'

describe('sulfur-cube presentation mode', () => {
  it('keeps the full tool as the default and opts into the compact Wiki scene explicitly', () => {
    expect(parseSulfurCubeViewMode('')).toBe('full')
    expect(parseSulfurCubeViewMode('full')).toBe('full')
    expect(parseSulfurCubeViewMode('unknown')).toBe('full')
    expect(parseSulfurCubeViewMode('compact')).toBe('compact')
    expect(parseSulfurCubeViewMode(undefined)).toBe('full')
  })

  it('builds a standalone full-tool link without carrying iframe state', () => {
    expect(
      createFullSulfurCubeToolUrl(
        'https://tools.minecraft.wiki/tools/sulfurCube/?view=compact&preview=1#/en?id=42',
        'dark',
      ),
    ).toBe('https://tools.minecraft.wiki/tools/sulfurCube/?preview=1&theme=dark')
  })
})
