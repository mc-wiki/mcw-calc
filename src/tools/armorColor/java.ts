import type { Color } from '@/utils/color'
import { deltaE, rgb2lab } from '@/utils/color'
import { scaleDyeChannel as channel, colorRgbMap } from '@/utils/color/java'
import { distanceBound } from './distanceBound'

type Rgb = [number, number, number]
interface Bounds {
  low: Rgb
  high: Rgb
}
export type DyeMatch = [Color[], number, Rgb]

const maxDyes = 8
const dyes = (Object.keys(colorRgbMap) as Color[]).map((name) => {
  const rgb = colorRgbMap[name]
  return { name, rgb, peak: Math.max(...rgb) }
})

function add(a: Rgb, b: Rgb): Rgb {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function subtract(a: Rgb, b: Rgb): Rgb {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function average(sum: Rgb, count: number): Rgb {
  return [Math.floor(sum[0] / count), Math.floor(sum[1] / count), Math.floor(sum[2] / count)]
}

function normalize(mean: Rgb, brightness: number): Rgb {
  const peak = Math.max(...mean)
  return [
    channel(mean[0], brightness, peak),
    channel(mean[1], brightness, peak),
    channel(mean[2], brightness, peak),
  ]
}

// For a suffix of the palette, dye count and sum of dye peaks, bound each channel sum.
// The two transitions skip this dye or use one copy. Repeated dyes are allowed.
function buildBounds() {
  const table: Map<number, Bounds>[][] = []
  const empty = Array.from({ length: maxDyes + 1 }, () => new Map<number, Bounds>())
  empty[0].set(0, { low: [0, 0, 0], high: [0, 0, 0] })
  table[dyes.length] = empty
  for (let i = dyes.length - 1; i >= 0; i--) {
    const row = table[i + 1].map((layer) => new Map(layer))
    const dye = dyes[i]
    for (let count = 1; count <= maxDyes; count++) {
      for (const [sumPeak, box] of row[count - 1]) {
        const key = sumPeak + dye.peak
        const low = add(box.low, dye.rgb)
        const high = add(box.high, dye.rgb)
        const other = row[count].get(key)
        if (other) {
          for (let c = 0; c < 3; c++) {
            low[c] = Math.min(low[c], other.low[c])
            high[c] = Math.max(high[c], other.high[c])
          }
        }
        row[count].set(key, { low, high })
      }
    }
    table[i] = row
  }
  return table
}

let cachedBounds: ReturnType<typeof buildBounds>

function construct(
  first: number,
  count: number,
  sumPeak: number,
  low: Rgb,
  high: Rgb,
): Color[] | undefined {
  const box = cachedBounds[first][count].get(sumPeak)
  if (!box) return
  for (let c = 0; c < 3; c++) {
    if (box.high[c] < low[c] || high[c] < box.low[c]) return
  }
  if (count === 0) return []
  const skip = construct(first + 1, count, sumPeak, low, high)
  if (skip) return skip
  const dye = dyes[first]
  const used = construct(
    first,
    count - 1,
    sumPeak - dye.peak,
    subtract(low, dye.rgb),
    subtract(high, dye.rgb),
  )
  if (used) used.push(dye.name)
  return used
}

function fromMean(count: number, sumPeak: number, mean: Rgb) {
  const low: Rgb = [mean[0] * count, mean[1] * count, mean[2] * count]
  const high: Rgb = [low[0] + count - 1, low[1] + count - 1, low[2] + count - 1]
  return construct(0, count, sumPeak, low, high)
}

// Invert the game's monotone float operation. Its scale is either exactly 1 or at
// least 1 + 1/(8*255), so successive integer inputs produce distinct channel values.
export function inverseChannel(target: number, peak: number, brightness: number) {
  let low = 0
  let high = peak
  while (low < high) {
    const mid = (low + high) >>> 1
    if (channel(mid, brightness, peak) < target) low = mid + 1
    else high = mid
  }
  return channel(low, brightness, peak) === target ? low : -1
}

function exactMatch(target: Rgb): DyeMatch | undefined {
  const targetPeak = Math.max(...target)
  for (let count = 1; count <= maxDyes; count++) {
    // The brightest output channel is floor(sumPeak / count).
    for (let sumPeak = targetPeak * count; sumPeak < (targetPeak + 1) * count; sumPeak++) {
      const box = cachedBounds[0][count].get(sumPeak)
      if (!box) continue
      const low = average(box.low, count)
      const high = average(box.high, count)
      const brightness = Math.fround(sumPeak / count)
      const maxPeak = Math.max(...high)
      for (let peak = Math.max(...low); peak <= maxPeak; peak++) {
        const mean = target.map((value) =>
          value === targetPeak ? peak : inverseChannel(value, peak, brightness),
        ) as Rgb
        if (mean.some((value, c) => value < low[c] || value > high[c])) continue
        const sequence = fromMean(count, sumPeak, mean)
        if (sequence) return [sequence, 0, target]
      }
    }
  }
}

export function findJavaDyes(target: Rgb): DyeMatch {
  cachedBounds ??= buildBounds()
  const exact = exactMatch(target)
  if (exact) return exact

  const targetLab = rgb2lab(target)
  const chromaScale = 1 + 0.045 * Math.hypot(targetLab[1], targetLab[2])
  let bestDistance = Infinity
  let bestMean: Rgb = [0, 0, 0]
  let bestCount = 0
  let bestPeakSum = 0

  // For unreachable targets, search bounded ranges of sums. A singleton mean identifies
  // its output color directly. Recover the winning recipe once at the end.
  function visit(
    first: number,
    remaining: number,
    remainingPeak: number,
    used: Rgb,
    count: number,
    sumPeak: number,
  ) {
    const box = cachedBounds[first][remaining].get(remainingPeak)
    if (!box) return
    const low = average(add(used, box.low), count)
    const high = average(add(used, box.high), count)
    const brightness = Math.fround(sumPeak / count)
    if (low[0] === high[0] && low[1] === high[1] && low[2] === high[2]) {
      const distance = deltaE(targetLab, rgb2lab(normalize(low, brightness)))
      if (distance < bestDistance) {
        bestDistance = distance
        bestMean = low
        bestCount = count
        bestPeakSum = sumPeak
      }
      return
    }
    const minPeak = Math.max(...low)
    const maxPeak = Math.max(...high)
    const minRgb = low.map((v) => channel(v, brightness, maxPeak)) as Rgb
    const maxRgb = high.map((v) => channel(Math.min(v, minPeak), brightness, minPeak)) as Rgb
    if (distanceBound(targetLab, chromaScale, minRgb, maxRgb) > bestDistance * bestDistance + 1e-9)
      return
    const dye = dyes[first]
    visit(first + 1, remaining, remainingPeak, used, count, sumPeak)
    visit(first, remaining - 1, remainingPeak - dye.peak, add(used, dye.rgb), count, sumPeak)
  }

  for (let count = 1; count <= maxDyes; count++) {
    for (const sumPeak of cachedBounds[0][count].keys()) {
      visit(0, count, sumPeak, [0, 0, 0], count, sumPeak)
    }
  }
  const dyesUsed = fromMean(bestCount, bestPeakSum, bestMean)!
  return [dyesUsed, bestDistance, normalize(bestMean, Math.fround(bestPeakSum / bestCount))]
}
