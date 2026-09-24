import type { NumericBackend } from '../numerics/types'
import type { LaunchSummary, Vec3 } from './types'

export function summarizeLaunchVelocity(
  velocity: Vec3,
  normalizationThreshold: number,
  numerics: NumericBackend,
): LaunchSummary {
  const horizontalSpeed = numerics.sqrt(velocity.x * velocity.x + velocity.z * velocity.z)
  const totalSpeed = numerics.sqrt(horizontalSpeed * horizontalSpeed + velocity.y * velocity.y)
  const horizontalDirection =
    horizontalSpeed < normalizationThreshold
      ? { x: 0, y: 0 }
      : {
          x: velocity.x === 0 ? 0 : velocity.x / horizontalSpeed,
          y: velocity.z === 0 ? 0 : velocity.z / horizontalSpeed,
        }

  return {
    horizontalSpeed,
    totalSpeed,
    elevationAngle: numerics.atan2(velocity.y, horizontalSpeed),
    horizontalDirection,
  }
}
