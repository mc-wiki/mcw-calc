import type { Color } from '@/utils/color'
import type { Edition } from '@/utils/color/dyeMix'
import { deltaE, rgb2lab, separateRgb } from '@/utils/color'
import { dyePalettes, getDyeMixIndex } from '@/utils/color/dyeMix'

export type { Edition } from '@/utils/color/dyeMix'

export interface BeamMatch {
  rgb: number
  deltaE: number
  sequence: Color[]
}

export function findBeamMatches(edition: Edition, target: number): BeamMatch[] {
  // In Bedrock, the bare beam is pure white until the first stained glass sets its color.
  const bareBeam = edition === 'bedrock' ? 0xffffff : dyePalettes.java.white
  const targetLab = rgb2lab(separateRgb(target))
  const distance = (rgb: number) => deltaE(targetLab, rgb2lab(separateRgb(rgb)))
  const matches: BeamMatch[] = [{ rgb: bareBeam, deltaE: distance(bareBeam), sequence: [] }]
  if (target === bareBeam) return matches

  const { depths, sequence } = getDyeMixIndex(edition)
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
      matches.push({ ...best, sequence: sequence(best.rgb) })
    }
  }
  return matches
}
