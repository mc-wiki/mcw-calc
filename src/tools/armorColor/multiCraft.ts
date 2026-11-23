import type { Color } from '@/utils/color'
import { deltaE, rgb2lab, separateRgb } from '@/utils/color'
import { colorMap } from '@/utils/color/java'
import { distanceBound } from './distanceBound'
import { decodeRounds, dyeNames, smallRecipe } from './smallRecipes'

export interface ArmorRecipe {
  rounds: Color[][]
  rgb: [number, number, number]
  distance: number
}

function indexGamut(mask: Uint8Array) {
  const blocks: Uint8Array[] = []
  for (let width = 32; width >= 1; width /= 2) blocks.push(new Uint8Array(width ** 3))
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const rgb = i * 8
    let r = rgb >>> 19
    let g = (rgb >>> 11) & 31
    let b = (rgb >>> 3) & 31
    for (let level = 0; level < blocks.length; level++) {
      const width = 32 >> level
      const key = (r * width + g) * width + b
      if (blocks[level][key]) break
      blocks[level][key] = 1
      r >>>= 1
      g >>>= 1
      b >>>= 1
    }
  }
  return { mask, blocks }
}

const palette = Object.values(colorMap)
function nearest(target: [number, number, number], gamut: ReturnType<typeof indexGamut>) {
  const packed = (target[0] << 16) | (target[1] << 8) | target[2]
  if (gamut.mask[packed >>> 3] & (1 << (packed & 7))) return { colors: [packed], distance: 0 }
  const lab = rgb2lab(target)
  const scale = 1 + 0.045 * Math.hypot(lab[1], lab[2])
  let distance = Infinity
  const colors = new Set<number>()
  function consider(rgb: number) {
    const d = deltaE(lab, rgb2lab(separateRgb(rgb)))
    if (d < distance) {
      distance = d
      colors.clear()
    }
    if (d === distance) colors.add(rgb)
  }
  for (const rgb of palette) consider(rgb)

  function visit(r: number, g: number, b: number, level: number) {
    const size = 8 << level
    const width = 32 >> level
    if (!gamut.blocks[level][((r / size) * width + g / size) * width + b / size]) return
    const high = size - 1
    if (
      distanceBound(lab, scale, [r, g, b], [r + high, g + high, b + high]) >
      distance * distance + 1e-9
    )
      return
    if (level === 0) {
      for (let x = r; x < r + 8; x++) {
        for (let y = g; y < g + 8; y++) {
          const row = (x << 16) | (y << 8) | b
          let bits = gamut.mask[row >>> 3]
          while (bits) {
            consider(row + 31 - Math.clz32(bits & -bits))
            bits &= bits - 1
          }
        }
      }
      return
    }
    const half = size / 2
    const first =
      (target[0] >= r + half ? 4 : 0) |
      (target[1] >= g + half ? 2 : 0) |
      (target[2] >= b + half ? 1 : 0)
    for (let i = 0; i < 8; i++) {
      const child = first ^ i
      visit(
        r + (child & 4 ? half : 0),
        g + (child & 2 ? half : 0),
        b + (child & 1 ? half : 0),
        level - 1,
      )
    }
  }
  visit(0, 0, 0, 5)
  return { colors: [...colors], distance }
}

// Shards are sorted by RGB. A record holds a variable-length gap, a dye count,
// then one byte per dye (the low four bits select the dye; bit 4 ends a craft).
function storedRecipe(bytes: Uint8Array, target: number) {
  let color = 0
  for (let i = 0; i < bytes.length;) {
    let byte: number
    let shift = 0
    do {
      byte = bytes[i++]
      color += (byte & 127) << shift
      shift += 7
    } while (byte & 128)
    if (color > target) break
    const length = bytes[i++]
    if (color === target) return decodeRounds(Array.from(bytes.subarray(i, i + length)))
    i += length
  }
}

async function fetchTable(name: string) {
  const response = await fetch(new URL(`./data/${name}.bin`, import.meta.url))
  if (!response.ok || !response.body) throw new Error('Could not load Java armor dye recipes')
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export function createJavaRecipeFinder(load = fetchTable) {
  let gamut: Promise<ReturnType<typeof indexGamut>> | undefined
  const shards = new Map<number, Promise<Uint8Array>>()
  async function recipe(rgb: number) {
    const id = rgb >>> 20
    let shard = shards.get(id)
    if (!shard) {
      shard = load(`recipes-${id}`).catch((error) => {
        shards.delete(id)
        throw error
      })
      shards.set(id, shard)
    }
    return storedRecipe(await shard, rgb & 0xfffff) ?? smallRecipe(rgb)
  }
  return async (target: [number, number, number]): Promise<ArmorRecipe> => {
    const packed = (target[0] << 16) | (target[1] << 8) | target[2]
    const dye = dyeNames.find((name) => colorMap[name] === packed)
    if (dye) return { rounds: [[dye]], rgb: target, distance: 0 }
    gamut ??= load('gamut')
      .then(indexGamut)
      .catch((error) => {
        gamut = undefined
        throw error
      })
    const { colors, distance } = nearest(target, await gamut)
    const matches = await Promise.all(
      colors.map(async (rgb) => ({ rgb, rounds: await recipe(rgb) })),
    )
    matches.sort((a, b) => a.rounds.flat().length - b.rounds.flat().length || a.rgb - b.rgb)
    const best = matches[0]
    return { rounds: best.rounds, rgb: separateRgb(best.rgb), distance }
  }
}
