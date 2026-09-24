import type { NumericBackend } from '../numerics/types'
import type { AttackerGeometry, CubeDerivedGeometry, CubeGeometry, Vec3 } from './types'
import { horizontalLengthVec3, normalizeVec3, subtractVec3 } from './vectors'

export interface KnockbackGeometryDiagnostics extends CubeDerivedGeometry {
  readonly normalizedLookDirection: Vec3
  readonly eyeToCenterDirection: Vec3
  readonly eyeToTopDirection: Vec3
  readonly eyeToBottomDirection: Vec3
  readonly horizontalCross: number
  readonly horizontalDot: number
  readonly horizontalAngleDelta: number
  readonly q: number
  readonly feetDelta: Vec3
  readonly feetHorizontalDistance: number
  readonly theta: number
}

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function assertFiniteVec3(vector: Vec3, name: string): void {
  assertFiniteNumber(vector.x, `${name}.x`)
  assertFiniteNumber(vector.y, `${name}.y`)
  assertFiniteNumber(vector.z, `${name}.z`)
}

export function deriveCubeGeometry(cube: CubeGeometry): CubeDerivedGeometry {
  assertFiniteVec3(cube.feetPosition, 'cube.feetPosition')
  assertFiniteNumber(cube.dimensions.width, 'cube.dimensions.width')
  assertFiniteNumber(cube.dimensions.height, 'cube.dimensions.height')

  if (cube.dimensions.width <= 0 || cube.dimensions.height <= 0) {
    throw new RangeError('cube dimensions must be positive')
  }

  const halfHeight = cube.dimensions.height / 2
  const center = {
    x: cube.feetPosition.x,
    y: cube.feetPosition.y + halfHeight,
    z: cube.feetPosition.z,
  }

  return {
    center,
    top: { x: center.x, y: center.y + halfHeight, z: center.z },
    bottom: { x: center.x, y: center.y - halfHeight, z: center.z },
  }
}

export function clampedMap(
  value: number,
  fromStart: number,
  fromEnd: number,
  toStart: number,
  toEnd: number,
  numerics: NumericBackend,
): number {
  const factor = (value - fromStart) / (fromEnd - fromStart)

  if (Number.isNaN(factor)) {
    throw new RangeError('vertical aim mapping is undefined for coincident limits')
  }

  if (factor < 0) {
    return toStart
  }

  if (factor > 1) {
    return toEnd
  }

  return numerics.sourceFloat(toStart + factor * (toEnd - toStart))
}

export function deriveKnockbackGeometry(
  attacker: AttackerGeometry,
  cube: CubeGeometry,
  vectorNormalizationThreshold: number,
  numerics: NumericBackend,
): KnockbackGeometryDiagnostics {
  assertFiniteVec3(attacker.feetPosition, 'attacker.feetPosition')
  assertFiniteVec3(attacker.eyePosition, 'attacker.eyePosition')
  assertFiniteVec3(attacker.lookDirection, 'attacker.lookDirection')
  assertFiniteNumber(vectorNormalizationThreshold, 'vectorNormalizationThreshold')

  if (vectorNormalizationThreshold < 0) {
    throw new RangeError('vectorNormalizationThreshold must not be negative')
  }

  const { center, top, bottom } = deriveCubeGeometry(cube)
  const normalizedLookDirection = normalizeVec3(
    attacker.lookDirection,
    numerics,
    vectorNormalizationThreshold,
  )
  const eyeToCenterDirection = normalizeVec3(
    subtractVec3(center, attacker.eyePosition),
    numerics,
    vectorNormalizationThreshold,
  )
  const eyeToTopDirection = normalizeVec3(
    subtractVec3(top, attacker.eyePosition),
    numerics,
    vectorNormalizationThreshold,
  )
  const eyeToBottomDirection = normalizeVec3(
    subtractVec3(bottom, attacker.eyePosition),
    numerics,
    vectorNormalizationThreshold,
  )
  const horizontalCross =
    normalizedLookDirection.x * eyeToCenterDirection.z -
    normalizedLookDirection.z * eyeToCenterDirection.x
  const horizontalDot =
    normalizedLookDirection.x * eyeToCenterDirection.x +
    normalizedLookDirection.z * eyeToCenterDirection.z
  const horizontalAngleDelta = numerics.sourceFloat(numerics.atan2(horizontalCross, horizontalDot))
  const q = numerics.sourceFloat(
    clampedMap(
      normalizedLookDirection.y,
      eyeToTopDirection.y,
      eyeToBottomDirection.y,
      -1,
      1,
      numerics,
    ),
  )
  const feetDelta = subtractVec3(cube.feetPosition, attacker.feetPosition)
  const feetHorizontalDistance = horizontalLengthVec3(feetDelta, numerics)
  const theta = numerics.sourceFloat(numerics.atan2(-feetDelta.y, feetHorizontalDistance))

  return {
    center,
    top,
    bottom,
    normalizedLookDirection,
    eyeToCenterDirection,
    eyeToTopDirection,
    eyeToBottomDirection,
    horizontalCross,
    horizontalDot,
    horizontalAngleDelta,
    q,
    feetDelta,
    feetHorizontalDistance,
    theta,
  }
}
