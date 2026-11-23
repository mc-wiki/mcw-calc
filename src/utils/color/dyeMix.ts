import type { Color } from './index'
import { colorMap } from './java'

export type Edition = 'java' | 'bedrock'

export const dyePalettes = {
  java: colorMap,
  // https://minecraft.wiki/w/Dye#Color_values
  bedrock: { ...colorMap, white: 0xf0f0f0 },
}

const dyeNames = Object.keys(colorMap) as Color[]

function mix(current: number, dye: number) {
  // Drop the odd bit of each channel sum before halving the packed RGB value.
  return (current + dye - ((current ^ dye) & 0x010101)) >>> 1
}

function buildDepths(colors: number[]) {
  // One byte per RGB value (16 MiB). Each pass adds one dye to the previous layer.
  const depths = new Uint8Array(1 << 24)
  let frontier = new Uint32Array(depths.length / 32)
  let nextFrontier = new Uint32Array(frontier.length)
  for (const dye of colors) {
    depths[dye] = 1
    frontier[dye >>> 5] |= 1 << (dye & 31)
  }

  let added = true
  for (let depth = 1; added; depth++) {
    added = false
    for (let word = 0; word < frontier.length; word++) {
      let bits = frontier[word]
      if (!bits) continue
      frontier[word] = 0
      while (bits) {
        // Visit the lowest set bit, then clear it.
        const current = word * 32 + 31 - Math.clz32(bits & -bits)
        bits &= bits - 1
        for (const dye of colors) {
          const next = mix(current, dye)
          if (depths[next]) continue
          depths[next] = depth + 1
          nextFrontier[next >>> 5] |= 1 << (next & 31)
          added = true
        }
      }
    }
    const cleared = frontier
    frontier = nextFrontier
    nextFrontier = cleared
  }
  return depths
}

function shortestSequence(rgb: number, depths: Uint8Array, colors: number[]): Color[] {
  const depth = depths[rgb]
  if (depth === 1) return [dyeNames[colors.indexOf(rgb)]]

  // Per channel, the previous color was either 2 * result - dye or one higher.
  for (const [index, dye] of colors.entries()) {
    const base = 2 * rgb - dye
    for (const remainder of [0, 1, 0x100, 0x101, 0x10000, 0x10001, 0x10100, 0x10101]) {
      const previous = base + remainder
      if (depths[previous] === depth - 1 && mix(previous, dye) === rgb) {
        return [...shortestSequence(previous, depths, colors), dyeNames[index]]
      }
    }
  }
  throw new Error('Missing predecessor for a reachable mixed color')
}

interface DyeMixIndex {
  depths: Uint8Array
  sequence: (rgb: number) => Color[]
}

const indices: Partial<Record<Edition, DyeMixIndex>> = {}

// Both stained glass and Bedrock cauldron dyes set the first color, then average each channel.
export function getDyeMixIndex(edition: Edition): DyeMixIndex {
  const cached = indices[edition]
  if (cached) return cached
  const colors = dyeNames.map((name) => dyePalettes[edition][name])
  const depths = buildDepths(colors)
  return (indices[edition] = { depths, sequence: (rgb) => shortestSequence(rgb, depths, colors) })
}
