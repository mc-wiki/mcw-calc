import type { NumericBackend } from '../numerics/types'
import type { HorizontalVector, Vec2, Vec3 } from './types'

export function addVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z,
  }
}

export function subtractVec3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z,
  }
}

export function scaleVec3(vector: Vec3, factor: number): Vec3 {
  return {
    x: vector.x * factor,
    y: vector.y * factor,
    z: vector.z * factor,
  }
}

export function scaleVec2(vector: Vec2, factor: number): Vec2 {
  return {
    x: vector.x * factor,
    y: vector.y * factor,
  }
}

export function lengthVec2(vector: Vec2, numerics: NumericBackend): number {
  return numerics.sqrt(vector.x * vector.x + vector.y * vector.y)
}

export function lengthVec3(vector: Vec3, numerics: NumericBackend): number {
  return numerics.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z)
}

export function horizontalLengthVec3(vector: Vec3, numerics: NumericBackend): number {
  return numerics.sqrt(vector.x * vector.x + vector.z * vector.z)
}

export function lengthHorizontalVector(vector: HorizontalVector, numerics: NumericBackend): number {
  return numerics.sqrt(vector.x * vector.x + vector.z * vector.z)
}

export function normalizeHorizontalVector(
  vector: HorizontalVector,
  numerics: NumericBackend,
  minimumLength: number,
): HorizontalVector {
  const length = lengthHorizontalVector(vector, numerics)

  if (length < minimumLength) {
    return { x: 0, z: 0 }
  }

  return {
    x: vector.x / length,
    z: vector.z / length,
  }
}

export function rotateHorizontalVector(
  vector: HorizontalVector,
  angleRadians: number,
  numerics: NumericBackend,
): HorizontalVector {
  const cosine = numerics.cos(angleRadians)
  const sine = numerics.sin(angleRadians)
  const xCosine = numerics.sourceFloat(vector.x * cosine)
  const zSine = numerics.sourceFloat(vector.z * sine)
  const zCosine = numerics.sourceFloat(vector.z * cosine)
  const xSine = numerics.sourceFloat(vector.x * sine)

  return {
    x: numerics.sourceFloat(xCosine - zSine),
    z: numerics.sourceFloat(zCosine + xSine),
  }
}

export function normalizeVec3(vector: Vec3, numerics: NumericBackend, minimumLength: number): Vec3 {
  const length = lengthVec3(vector, numerics)

  if (length < minimumLength) {
    return { x: 0, y: 0, z: 0 }
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  }
}

export function rotateVec2(vector: Vec2, angleRadians: number, numerics: NumericBackend): Vec2 {
  const cosine = numerics.cos(angleRadians)
  const sine = numerics.sin(angleRadians)
  const xCosine = numerics.sourceFloat(vector.x * cosine)
  const ySine = numerics.sourceFloat(vector.y * sine)
  const yCosine = numerics.sourceFloat(vector.y * cosine)
  const xSine = numerics.sourceFloat(vector.x * sine)

  return {
    x: numerics.sourceFloat(xCosine - ySine),
    y: numerics.sourceFloat(yCosine + xSine),
  }
}
