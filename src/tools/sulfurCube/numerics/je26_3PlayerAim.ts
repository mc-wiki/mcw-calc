import type { Vec3 } from '../model/types'
import { je26_3Constants } from '../data/je26_3/constants'
import { minecraftCos, minecraftSin } from './javaPrecision'

export interface Je26_3PlayerAim {
  readonly pitchDegrees: number
  readonly yawDegrees: number
  readonly lookDirection: Vec3
}

const degreesToRadiansFloat = Math.fround(Math.PI / 180)
export const radiansToDegreesFloat = je26_3Constants.commandFacingRadiansToDegreesFloat.value
const halfPi = Math.PI / 2
const oneSixth = 1 / 6
const fractionBiasBits = 4805340802404319232n
const fastInverseSqrtMagic = 6910469410427058090n

const bitBuffer = new ArrayBuffer(8)
const bitView = new DataView(bitBuffer)

function doubleToRawLongBits(value: number): bigint {
  bitView.setFloat64(0, value, false)
  return bitView.getBigInt64(0, false)
}

function longBitsToDouble(value: bigint): number {
  bitView.setBigInt64(0, value, false)
  return bitView.getFloat64(0, false)
}

function lowSignedIntBits(value: number): number {
  bitView.setFloat64(0, value, false)
  return bitView.getInt32(4, false)
}

const fractionBias = longBitsToDouble(fractionBiasBits)
const asinTable = Array.from({ length: 257 }, (_, index) => Math.asin(index / 256))
const cosineTable = asinTable.map(Math.cos)

/** JE 26.3's deprecated-but-still-used Mth.fastInvSqrt(double). */
export function minecraftFastInverseSqrt(value: number): number {
  const half = 0.5 * value
  let bits = doubleToRawLongBits(value)
  bits = fastInverseSqrtMagic - (bits >> 1n)
  const approximation = longBitsToDouble(bits)
  return approximation * (1.5 - half * approximation * approximation)
}

/**
 * JE 26.3's lookup-assisted Mth.atan2(double, double).
 *
 * SulfurCube's own power angles use Math.atan2 through NumericBackend. This
 * approximation belongs only to the command-facing Entity.lookAt conversion.
 */
export function minecraftAtan2(yInput: number, xInput: number): number {
  let y = yInput
  let x = xInput
  const squaredLength = x * x + y * y

  if (Number.isNaN(squaredLength)) return Number.NaN

  const negativeY = y < 0
  if (negativeY) y = -y

  const negativeX = x < 0
  if (negativeX) x = -x

  const steep = y > x
  if (steep) [x, y] = [y, x]

  const inverseLength = minecraftFastInverseSqrt(squaredLength)
  x *= inverseLength
  y *= inverseLength

  const biasedY = fractionBias + y
  const tableIndex = lowSignedIntBits(biasedY)
  const phi = asinTable[tableIndex]!
  const cosinePhi = cosineTable[tableIndex]!
  const sinePhi = biasedY - fractionBias
  const error = y * cosinePhi - x * sinePhi
  const correction = (6 + error * error) * error * oneSixth
  let theta = phi + correction

  if (steep) theta = halfPi - theta
  if (negativeX) theta = Math.PI - theta
  if (negativeY) theta = -theta

  return theta
}

/** JE 26.3's Mth.wrapDegrees(float), preserving Float32 operation boundaries. */
export function minecraftWrapDegreesFloat(angleDegrees: number): number {
  let normalized = Math.fround(Math.fround(angleDegrees) % Math.fround(360))

  if (normalized >= Math.fround(180)) {
    normalized = Math.fround(normalized - Math.fround(360))
  }
  if (normalized < Math.fround(-180)) {
    normalized = Math.fround(normalized + Math.fround(360))
  }

  return normalized
}

/** JE 26.3's Entity.calculateViewVector(float, float). */
export function calculateJe26_3ViewVector(pitchDegrees: number, yawDegrees: number): Vec3 {
  const pitchRadians = Math.fround(Math.fround(pitchDegrees) * degreesToRadiansFloat)
  const yawRadians = Math.fround(Math.fround(-yawDegrees) * degreesToRadiansFloat)
  const yawCosine = minecraftCos(yawRadians)
  const yawSine = minecraftSin(yawRadians)
  const pitchCosine = minecraftCos(pitchRadians)
  const pitchSine = minecraftSin(pitchRadians)

  return {
    x: Math.fround(yawSine * pitchCosine),
    y: Math.fround(-pitchSine),
    z: Math.fround(yawCosine * pitchCosine),
  }
}

/**
 * Reproduces `execute ... anchored eyes run tp ... facing ...` for the tool's
 * distinct eye-position and target-point inputs, then reconstructs getLookAngle.
 *
 * Source: JE 26.3 Entity.lookAt and Entity.calculateViewVector.
 */
export function deriveJe26_3PlayerAim(eyePosition: Vec3, aimPoint: Vec3): Je26_3PlayerAim {
  const xDifference = aimPoint.x - eyePosition.x
  const yDifference = aimPoint.y - eyePosition.y
  const zDifference = aimPoint.z - eyePosition.z
  const horizontalDistance = Math.sqrt(xDifference * xDifference + zDifference * zDifference)

  const pitchBeforeWrap = Math.fround(
    -minecraftAtan2(yDifference, horizontalDistance) * radiansToDegreesFloat,
  )
  const yawBeforeOffset = Math.fround(
    minecraftAtan2(zDifference, xDifference) * radiansToDegreesFloat,
  )
  const yawBeforeWrap = Math.fround(yawBeforeOffset - Math.fround(90))
  const pitchDegrees = minecraftWrapDegreesFloat(pitchBeforeWrap)
  const yawDegrees = minecraftWrapDegreesFloat(yawBeforeWrap)

  return {
    pitchDegrees,
    yawDegrees,
    lookDirection: calculateJe26_3ViewVector(pitchDegrees, yawDegrees),
  }
}
