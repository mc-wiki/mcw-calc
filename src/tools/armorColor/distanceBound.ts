import { rgb2lab } from '@/utils/color'

// All three XYZ components increase with each RGB channel. The two corners thus bound
// f(X), f(Y), f(Z) separately, even though the Lab a* and b* coordinates are differences.
export function distanceBound(
  targetLab: number[],
  chromaScale: number,
  low: number[],
  high: number[],
) {
  const [l0, a0, b0] = rgb2lab(low)
  const [l1, a1, b1] = rgb2lab(high)
  const spreadY = (l1 - l0) / 116
  const dl = Math.max(0, l0 - targetLab[0], targetLab[0] - l1)
  const da = Math.max(0, a0 - 500 * spreadY - targetLab[1], targetLab[1] - (a1 + 500 * spreadY))
  const db = Math.max(0, b1 - 200 * spreadY - targetLab[2], targetLab[2] - (b0 + 200 * spreadY))
  // CIE94 weights chroma and hue separately. Both divisors are at most the chroma divisor.
  return dl * dl + (da * da + db * db) / (chromaScale * chromaScale)
}
