import type { NumericBackend } from './types'

// JE 26.3: net.minecraft.util.Mth.SIN_SCALE and its 65,536-entry float table.
// Source: versions/26.3/decompiled/src/net/minecraft/util/Mth.java
const sineTableScale = 10430.378350470453
const sineTableMask = 65535
const cosineTableOffset = 16384

const sineTable = Array.from({ length: 65536 }, (_, index) =>
  Math.fround(Math.sin(index / sineTableScale)),
)

function sineTableIndex(scaledAngle: number): number {
  // Java truncates the double to long, then masks its low 16 bits.
  return Math.trunc(scaledAngle) & sineTableMask
}

export function minecraftSin(angleRadians: number): number {
  return sineTable[sineTableIndex(angleRadians * sineTableScale)]!
}

export function minecraftCos(angleRadians: number): number {
  return sineTable[sineTableIndex(angleRadians * sineTableScale + cosineTableOffset)]!
}

/**
 * Backend for source-relevant JE 26.3 float boundaries.
 *
 * This deliberately is not a blanket Float32 mode. Positions, Vec3 lengths,
 * normalization, stored Motion, and movement remain Java doubles. Mechanics
 * code opts into `sourceFloat` only where the audited source uses `float`.
 */
export const javaPrecisionNumerics: NumericBackend = Object.freeze({
  id: 'java-precision',
  sourceFloat: Math.fround,
  sqrt: Math.sqrt,
  sin: minecraftSin,
  cos: minecraftCos,
  atan2: Math.atan2,
  clamp: (value: number, minimum: number, maximum: number) =>
    Math.min(maximum, Math.max(minimum, value)),
})
