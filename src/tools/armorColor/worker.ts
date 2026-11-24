import type { DyeMatch } from './java'
import type { ArmorRecipe } from './multiCraft'
import type { Edition } from '@/utils/color/dyeMix'
import { deltaE, rgb2lab, separateRgb } from '@/utils/color'
import { dyePalettes, getDyeMixIndex } from '@/utils/color/dyeMix'
import { distanceBound } from './distanceBound'
import { findJavaDyes } from './java'
import { createJavaRecipeFinder } from './multiCraft'

// A 16³ block of offsets packed as RGB bytes. The same offsets, multiplied by 16,
// are the lower corners of the blocks covering the full 24-bit color space.
const offsets: number[] = []
for (let r = 0; r < 16; r++) {
  for (let g = 0; g < 16; g++) {
    for (let b = 0; b < 16; b++) offsets.push((r << 16) | (g << 8) | b)
  }
}

function findCauldronDyes(target: [number, number, number]): DyeMatch {
  const packed = (target[0] << 16) | (target[1] << 8) | target[2]
  // Even white armor gets its color from a dye in the cauldron.
  if (packed === dyePalettes.bedrock.white) return [['white'], 0, target]
  const { depths, sequence } = getDyeMixIndex('bedrock')
  if (depths[packed]) return [sequence(packed), 0, target]

  const targetLab = rgb2lab(target)
  const chromaScale = 1 + 0.045 * Math.hypot(targetLab[1], targetLab[2])
  let best = dyePalettes.bedrock.white
  let bestDistance = Infinity
  function consider(rgb: number) {
    const distance = deltaE(targetLab, rgb2lab(separateRgb(rgb)))
    if (distance < bestDistance || (distance === bestDistance && depths[rgb] < depths[best])) {
      best = rgb
      bestDistance = distance
    }
  }
  for (const dye of Object.values(dyePalettes.bedrock)) consider(dye)
  for (const block of offsets) {
    const low = block * 16
    const bound = distanceBound(
      targetLab,
      chromaScale,
      separateRgb(low),
      separateRgb(low + 0x0f0f0f),
    )
    if (bound > bestDistance * bestDistance + 1e-9) continue
    for (const offset of offsets) {
      const rgb = low + offset
      if (depths[rgb]) consider(rgb)
    }
  }
  return [sequence(best), bestDistance, separateRgb(best)]
}

export function colorToSequence(target: [number, number, number], edition: Edition): DyeMatch {
  return edition === 'java' ? findJavaDyes(target) : findCauldronDyes(target)
}

const findMultiCraft = createJavaRecipeFinder()

export async function findArmorRecipe(
  target: [number, number, number],
  edition: Edition,
  multiCraft: boolean,
): Promise<ArmorRecipe> {
  if (edition === 'java' && multiCraft) return findMultiCraft(target)
  const [dyes, distance, rgb] = colorToSequence(target, edition)
  return { rounds: [dyes], distance, rgb }
}
