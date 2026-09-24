import type { Vec2, Vec3 } from '../model/types'
import type { PlanePoint, RadialProjection } from './types'

const defaultHorizontalAxis: Vec2 = { x: 0, y: 1 }

export type RadialAttackerSide = -1 | 1

function canonicalZero(value: number): number {
  return value === 0 ? 0 : value
}

export function createRadialProjection(
  cubeFeetPosition: Vec3,
  attackerFeetPosition: Vec3,
  minimumHorizontalLength = 1e-9,
  attackerSide: RadialAttackerSide = -1,
  fallbackHorizontalAxis: Vec2 = defaultHorizontalAxis,
): RadialProjection {
  const horizontalX = attackerFeetPosition.x - cubeFeetPosition.x
  const horizontalZ = attackerFeetPosition.z - cubeFeetPosition.z
  const horizontalLength = Math.hypot(horizontalX, horizontalZ)
  const fallbackLength = Math.hypot(fallbackHorizontalAxis.x, fallbackHorizontalAxis.y)
  const fallback =
    fallbackLength < minimumHorizontalLength
      ? defaultHorizontalAxis
      : {
          x: fallbackHorizontalAxis.x / fallbackLength,
          y: fallbackHorizontalAxis.y / fallbackLength,
        }
  const horizontalAxis =
    horizontalLength < minimumHorizontalLength
      ? fallback
      : {
          x: canonicalZero((horizontalX / horizontalLength) * attackerSide),
          y: canonicalZero((horizontalZ / horizontalLength) * attackerSide),
        }

  return {
    origin: { ...cubeFeetPosition },
    horizontalAxis,
  }
}

export function projectPointToRadialPlane(point: Vec3, projection: RadialProjection): PlanePoint {
  const deltaX = point.x - projection.origin.x
  const deltaZ = point.z - projection.origin.z

  return {
    x: canonicalZero(deltaX * projection.horizontalAxis.x + deltaZ * projection.horizontalAxis.y),
    y: canonicalZero(point.y - projection.origin.y),
  }
}

export function projectVectorToRadialPlane(vector: Vec3, projection: RadialProjection): PlanePoint {
  return {
    x: canonicalZero(
      vector.x * projection.horizontalAxis.x + vector.z * projection.horizontalAxis.y,
    ),
    y: canonicalZero(vector.y),
  }
}

export function radialLateralOffset(point: Vec3, projection: RadialProjection): number {
  const deltaX = point.x - projection.origin.x
  const deltaZ = point.z - projection.origin.z

  return -deltaX * projection.horizontalAxis.y + deltaZ * projection.horizontalAxis.x
}

export function unprojectPointFromRadialPlane(
  point: PlanePoint,
  projection: RadialProjection,
  lateralOffset = 0,
): Vec3 {
  const perpendicularX = -projection.horizontalAxis.y
  const perpendicularZ = projection.horizontalAxis.x

  return {
    x: projection.origin.x + point.x * projection.horizontalAxis.x + lateralOffset * perpendicularX,
    y: projection.origin.y + point.y,
    z: projection.origin.z + point.x * projection.horizontalAxis.y + lateralOffset * perpendicularZ,
  }
}
