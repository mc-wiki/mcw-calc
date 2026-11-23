import type { Color } from '@/utils/color'
import { scaleDyeChannel as channel, colorMap } from '@/utils/color/java'
import { inverseChannel } from './java'

export const dyeNames = Object.keys(colorMap) as Color[]
const palette = dyeNames.map((name) => colorMap[name])
const endOfRound = 16

interface Batch {
  rgb: number[]
  peak: number
  digits: number
  size: number
}

function makeBatches() {
  const batches: Batch[][] = Array.from({ length: 5 }, () => [])
  function add(first: number, rgb: number[], peak: number, digits: number, size: number) {
    if (size) batches[size].push({ rgb, peak, digits: digits | endOfRound, size })
    if (size === 4) return
    for (let i = first; i < palette.length; i++) {
      const color = palette[i]
      const r = color >>> 16
      const g = (color >>> 8) & 255
      const b = color & 255
      add(
        i,
        [rgb[0] + r, rgb[1] + g, rgb[2] + b],
        peak + Math.max(r, g, b),
        digits * 32 + i,
        size + 1,
      )
    }
  }
  add(0, [0, 0, 0], 0, 0, 0)
  return batches
}

export function decodeRounds(bytes: number[]): Color[][] {
  const rounds: Color[][] = []
  let round: Color[] = []
  for (const byte of bytes) {
    round.push(dyeNames[byte & 15])
    if (byte & endOfRound) {
      rounds.push(round)
      round = []
    }
  }
  // A single dye in the first craft is exactly equivalent to including it in the second craft.
  if (rounds.length > 1 && rounds[0].length === 1 && rounds[1].length < 8) {
    rounds[1].unshift(rounds[0][0])
    rounds.shift()
  }
  return rounds
}

// A leading 1 followed by five bits per dye fits all recipes of up to five dyes in a word.
function digitsOf(code: number) {
  const bytes: number[] = []
  while (code > 1) {
    bytes.push(code & 31)
    code >>>= 5
  }
  return bytes.reverse()
}

function buildSmallIndex() {
  const batches = makeBatches()
  // 1,205,541 reachable colors through five dyes. A sparse table takes 16 MiB.
  const capacity = 1 << 21
  const keys = new Uint32Array(capacity)
  const recipes = new Uint32Array(capacity)
  function slot(rgb: number) {
    const hash = Math.imul(rgb ^ (rgb >>> 13), 0x9e3779b1)
    let i = (hash ^ (hash >>> 16)) & (capacity - 1)
    while (keys[i] && keys[i] !== rgb) i = (i + 1) & (capacity - 1)
    return i
  }
  const layers: number[][] = [[], [...palette], [], [], []]
  for (const [id, rgb] of palette.entries()) {
    const i = slot(rgb)
    keys[i] = rgb
    recipes[i] = 32 + endOfRound + id
  }
  // Any first craft of two or more dyes may start with one dye followed by the rest.
  for (let total = 2; total <= 5; total++) {
    for (let k = 1; k < total; k++) {
      const n = k + 1
      for (const parent of layers[total - k]) {
        const r = parent >>> 16
        const g = (parent >>> 8) & 255
        const b = parent & 255
        const h = Math.max(r, g, b)
        const prefix = recipes[slot(parent)] * 32 ** k
        for (const batch of batches[k]) {
          const ar = Math.floor((r + batch.rgb[0]) / n)
          const ag = Math.floor((g + batch.rgb[1]) / n)
          const ab = Math.floor((b + batch.rgb[2]) / n)
          const m = Math.max(ar, ag, ab)
          const brightness = Math.fround((h + batch.peak) / n)
          const rgb =
            (channel(ar, brightness, m) << 16) |
            (channel(ag, brightness, m) << 8) |
            channel(ab, brightness, m)
          const i = slot(rgb)
          if (keys[i]) continue
          keys[i] = rgb
          recipes[i] = prefix + batch.digits
          if (total < 5) layers[total].push(rgb)
        }
      }
    }
  }
  return { batches, lookup: (rgb: number) => recipes[slot(rgb)] }
}

// With the last dyes fixed, the peak of the previous armor has at most n possible values.
// Fixing its brightest channel pins one mean. The other two channels each cover at most n integers.
function undoBatch(target: number[], batch: Batch, accept: (rgb: number) => boolean) {
  const n = batch.size + 1
  const peak = Math.max(...target)
  const sum = batch.rgb
  const maxSum = Math.max(...sum)
  const lastPeak = Math.min(255, n * (peak + 1) - 1 - batch.peak)
  for (let h = Math.max(0, n * peak - batch.peak); h <= lastPeak; h++) {
    const brightness = Math.fround((h + batch.peak) / n)
    const maxMean = Math.min(peak, Math.floor((maxSum + h) / n))
    for (let axis = 0; axis < 3; axis++) {
      const pinned = Math.floor((sum[axis] + h) / n)
      let lo = Math.max(1, pinned, Math.floor(maxSum / n))
      let hi = maxMean + 1
      while (lo < hi) {
        const mid = (lo + hi) >>> 1
        if (channel(pinned, brightness, mid) > target[axis]) lo = mid + 1
        else hi = mid
      }
      const u = (axis + 1) % 3
      const v = (axis + 2) % 3
      for (let m = lo; m <= maxMean && channel(pinned, brightness, m) === target[axis]; m++) {
        const au = inverseChannel(target[u], m, brightness)
        const av = inverseChannel(target[v], m, brightness)
        if (au < 0 || av < 0) continue
        const u0 = n * au - sum[u]
        const v0 = n * av - sum[v]
        for (let x = Math.max(0, u0); x <= Math.min(h, u0 + n - 1); x++) {
          for (let y = Math.max(0, v0); y <= Math.min(h, v0 + n - 1); y++) {
            const parent = (h << (16 - 8 * axis)) | (x << (16 - 8 * u)) | (y << (16 - 8 * v))
            if (accept(parent)) return true
          }
        }
      }
    }
  }
  return false
}

let smallIndex: ReturnType<typeof buildSmallIndex>
export function smallRecipe(rgb: number): Color[][] {
  smallIndex ??= buildSmallIndex()
  const bytes = smallIndex.lookup(rgb)
  if (bytes) return decodeRounds(digitsOf(bytes))

  function find(current: number, budget: number): number[] | undefined {
    const code = smallIndex.lookup(current)
    if (code) return 31 - Math.clz32(code) === 5 * budget ? digitsOf(code) : undefined
    if (budget <= 5) return
    const target = [current >>> 16, (current >>> 8) & 255, current & 255]
    for (let k = 1; k <= 2; k++) {
      for (const batch of smallIndex.batches[k]) {
        let prefix: number[] | undefined
        if (
          undoBatch(target, batch, (parent) => {
            prefix = find(parent, budget - k)
            return prefix !== undefined
          })
        ) {
          return prefix!.concat(digitsOf(32 ** k + batch.digits))
        }
      }
    }
  }
  const recipe = find(rgb, 6) ?? find(rgb, 7)
  if (!recipe) throw new Error('Missing Java armor dye recipe')
  return decodeRounds(recipe)
}
