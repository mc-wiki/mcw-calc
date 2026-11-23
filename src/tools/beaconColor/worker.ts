import type { Color } from '@/utils/color'
import { deltaE, rgb2lab, separateRgb } from '@/utils/color'
import { colorMap } from '@/utils/color/java'

export type Edition = 'java' | 'bedrock'

export interface BeamMatch {
  rgb: number
  deltaE: number
  sequence: Color[]
}

const palettes = {
  java: colorMap,
  // https://minecraft.wiki/w/Dye#Color_values
  bedrock: { ...colorMap, white: 0xf0f0f0 },
}

const glassNames = Object.keys(colorMap) as Color[]
const depthCache: Partial<Record<Edition, Uint8Array>> = {}

function mix(beam: number, glass: number) {
  // Drop the odd bit of each channel sum before halving the packed RGB value.
  return (beam + glass - ((beam ^ glass) & 0x010101)) >>> 1
}

function buildDepths(glassColors: number[]) {
  // One byte per RGB value (16 MiB). Each pass adds one glass to the previous layer.
  const depths = new Uint8Array(1 << 24)
  for (const glass of glassColors) depths[glass] = 1

  let added = true
  for (let depth = 1; added; depth++) {
    added = false
    for (let beam = 0; beam < depths.length; beam++) {
      if (depths[beam] !== depth) continue
      for (const glass of glassColors) {
        const next = mix(beam, glass)
        if (depths[next]) continue
        depths[next] = depth + 1
        added = true
      }
    }
  }
  return depths
}

function shortestSequence(rgb: number, depths: Uint8Array, glassColors: number[]): Color[] {
  const depth = depths[rgb]
  if (depth === 1) return [glassNames[glassColors.indexOf(rgb)]]

  // Per channel, the previous beam was either 2 * result - glass or one higher.
  for (const [index, glass] of glassColors.entries()) {
    const base = 2 * rgb - glass
    for (const remainder of [0, 1, 0x100, 0x101, 0x10000, 0x10001, 0x10100, 0x10101]) {
      const previous = base + remainder
      if (depths[previous] === depth - 1 && mix(previous, glass) === rgb) {
        return [...shortestSequence(previous, depths, glassColors), glassNames[index]]
      }
    }
  }
  throw new Error('Missing predecessor for a reachable beacon color')
}

export function findBeamMatches(edition: Edition, target: number): BeamMatch[] {
  const palette = palettes[edition]
  const targetLab = rgb2lab(separateRgb(target))
  const distance = (rgb: number) => deltaE(targetLab, rgb2lab(separateRgb(rgb)))
  const matches: BeamMatch[] = [
    { rgb: palette.white, deltaE: distance(palette.white), sequence: [] },
  ]
  if (target === palette.white) return matches

  const glassColors = glassNames.map((name) => palette[name])
  const depths = (depthCache[edition] ??= buildDepths(glassColors))
  // Once the target is reached, further layers cannot improve on it.
  const exactDepth = depths[target] || Infinity
  const bestAtDepth: Pick<BeamMatch, 'rgb' | 'deltaE'>[] = []
  if (Number.isFinite(exactDepth)) bestAtDepth[exactDepth] = { rgb: target, deltaE: 0 }
  for (let rgb = 0; rgb < depths.length; rgb++) {
    const depth = depths[rgb]
    if (!depth || depth >= exactDepth) continue
    const difference = distance(rgb)
    if (difference < (bestAtDepth[depth]?.deltaE ?? Infinity)) {
      bestAtDepth[depth] = { rgb, deltaE: difference }
    }
  }

  for (const best of bestAtDepth) {
    if (best && best.deltaE < matches[matches.length - 1].deltaE) {
      matches.push({ ...best, sequence: shortestSequence(best.rgb, depths, glassColors) })
    }
  }
  return matches
}
