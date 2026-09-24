import type { Vec3 } from '../model/types'
import type { PlanePoint, RadialProjection } from './types'
import { aimArrowLength } from './verticalScene'

function endpointFromDirection(eyePosition: Vec3, direction: Vec3, distance: number): Vec3 {
  return {
    x: eyePosition.x + direction.x * distance,
    y: eyePosition.y + direction.y * distance,
    z: eyePosition.z + direction.z * distance,
  }
}

/**
 * Place a scene-local handle on a projected aim axis.
 *
 * The distance is presentation state only: changing it must never alter the
 * world-space look direction or the model's independent aim point.
 */
export function pointOnProjectedAimAxis(
  origin: PlanePoint,
  projectedAimEnd: PlanePoint,
  distance: number,
  minimumLength = 1e-9,
): PlanePoint {
  if (!Number.isFinite(distance) || distance < 0) {
    throw new RangeError('Aim-handle distance must be a finite nonnegative number')
  }

  const direction = {
    x: projectedAimEnd.x - origin.x,
    y: projectedAimEnd.y - origin.y,
  }
  const length = Math.hypot(direction.x, direction.y)

  if (length < minimumLength) {
    return origin
  }

  return {
    x: origin.x + (direction.x / length) * distance,
    y: origin.y + (direction.y / length) * distance,
  }
}

/** Rotate aim in the radial plane while preserving its perpendicular component. */
export function rotateAimInRadialProjection(
  eyePosition: Vec3,
  normalizedLookDirection: Vec3,
  projection: RadialProjection,
  targetInPlane: PlanePoint,
  endpointDistance = aimArrowLength,
  minimumLength = 1e-9,
): Vec3 {
  const eyeInPlane = {
    x:
      (eyePosition.x - projection.origin.x) * projection.horizontalAxis.x +
      (eyePosition.z - projection.origin.z) * projection.horizontalAxis.y,
    y: eyePosition.y - projection.origin.y,
  }
  const pointerDirection = {
    x: targetInPlane.x - eyeInPlane.x,
    y: targetInPlane.y - eyeInPlane.y,
  }
  const pointerLength = Math.hypot(pointerDirection.x, pointerDirection.y)

  if (pointerLength < minimumLength) {
    return endpointFromDirection(eyePosition, normalizedLookDirection, endpointDistance)
  }

  const radialComponent =
    normalizedLookDirection.x * projection.horizontalAxis.x +
    normalizedLookDirection.z * projection.horizontalAxis.y
  const radialProjectionLength = Math.hypot(radialComponent, normalizedLookDirection.y)
  const lateralComponent =
    -normalizedLookDirection.x * projection.horizontalAxis.y +
    normalizedLookDirection.z * projection.horizontalAxis.x
  const nextRadial = (pointerDirection.x / pointerLength) * radialProjectionLength
  const nextVertical = (pointerDirection.y / pointerLength) * radialProjectionLength
  const perpendicularX = -projection.horizontalAxis.y
  const perpendicularZ = projection.horizontalAxis.x

  return endpointFromDirection(
    eyePosition,
    {
      x: nextRadial * projection.horizontalAxis.x + lateralComponent * perpendicularX,
      y: nextVertical,
      z: nextRadial * projection.horizontalAxis.y + lateralComponent * perpendicularZ,
    },
    endpointDistance,
  )
}

/** Rotate aim in the X/Z plane while preserving its vertical component. */
export function rotateAimInTopDownProjection(
  eyePosition: Vec3,
  normalizedLookDirection: Vec3,
  targetInPlane: PlanePoint,
  endpointDistance = aimArrowLength,
  minimumLength = 1e-9,
): Vec3 {
  const pointerDirection = {
    x: targetInPlane.x - eyePosition.x,
    y: targetInPlane.y - eyePosition.z,
  }
  const pointerLength = Math.hypot(pointerDirection.x, pointerDirection.y)

  if (pointerLength < minimumLength) {
    return endpointFromDirection(eyePosition, normalizedLookDirection, endpointDistance)
  }

  const horizontalLength = Math.hypot(normalizedLookDirection.x, normalizedLookDirection.z)

  return endpointFromDirection(
    eyePosition,
    {
      x: (pointerDirection.x / pointerLength) * horizontalLength,
      y: normalizedLookDirection.y,
      z: (pointerDirection.y / pointerLength) * horizontalLength,
    },
    endpointDistance,
  )
}
