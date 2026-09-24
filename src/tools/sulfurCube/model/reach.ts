import type { AttackerGeometry, CubeGeometry, Vec3 } from './types'

export interface Aabb {
  readonly min: Vec3
  readonly max: Vec3
}

export interface ClearRayEntityReachInput {
  readonly eye: Vec3
  readonly lookDirection: Vec3
  readonly targetAabb: Aabb
  readonly reach: number
  readonly pickRadius: number
  readonly canBePickedFromInside: boolean
  readonly clipTolerance: number
}

export type ClearRayReachStatus =
  | 'within_reach'
  | 'ray_miss'
  | 'at_or_beyond_reach'
  | 'inside_unpickable_aabb'

export interface ClearRayEntityReachResult {
  readonly status: ClearRayReachStatus
  readonly entryPoint: Vec3 | null
  readonly entryDistance: number | null
  readonly strictMaximumReach: number
  readonly occlusion: 'not_evaluated'
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

function inflateAabb(aabb: Aabb, amount: number): Aabb {
  return {
    min: {
      x: aabb.min.x - amount,
      y: aabb.min.y - amount,
      z: aabb.min.z - amount,
    },
    max: {
      x: aabb.max.x + amount,
      y: aabb.max.y + amount,
      z: aabb.max.z + amount,
    },
  }
}

function containsWithMinecraftBounds(aabb: Aabb, point: Vec3): boolean {
  return (
    point.x >= aabb.min.x &&
    point.x < aabb.max.x &&
    point.y >= aabb.min.y &&
    point.y < aabb.max.y &&
    point.z >= aabb.min.z &&
    point.z < aabb.max.z
  )
}

interface RayPlaneCandidate {
  readonly distanceAlongDirection: number
  readonly point: Vec3
}

function candidateForAxis(
  eye: Vec3,
  direction: Vec3,
  aabb: Aabb,
  axis: keyof Vec3,
  firstTransverseAxis: keyof Vec3,
  secondTransverseAxis: keyof Vec3,
  tolerance: number,
): RayPlaneCandidate | null {
  const axisDirection = direction[axis]

  if (Math.abs(axisDirection) <= tolerance) {
    return null
  }

  const entryPlane = axisDirection > 0 ? aabb.min[axis] : aabb.max[axis]
  const distanceAlongDirection = (entryPlane - eye[axis]) / axisDirection

  if (distanceAlongDirection <= 0) {
    return null
  }

  const firstTransverse =
    eye[firstTransverseAxis] + direction[firstTransverseAxis] * distanceAlongDirection
  const secondTransverse =
    eye[secondTransverseAxis] + direction[secondTransverseAxis] * distanceAlongDirection

  if (
    firstTransverse < aabb.min[firstTransverseAxis] - tolerance ||
    firstTransverse > aabb.max[firstTransverseAxis] + tolerance ||
    secondTransverse < aabb.min[secondTransverseAxis] - tolerance ||
    secondTransverse > aabb.max[secondTransverseAxis] + tolerance
  ) {
    return null
  }

  return {
    distanceAlongDirection,
    point: {
      x: eye.x + direction.x * distanceAlongDirection,
      y: eye.y + direction.y * distanceAlongDirection,
      z: eye.z + direction.z * distanceAlongDirection,
    },
  }
}

/**
 * Returns the first forward ray entry using the directional and transverse
 * tolerances from JE's AABB clipping path. The final reach comparison remains
 * strict and does not use this tolerance as an AABB inflation.
 */
function firstRayEntry(eye: Vec3, direction: Vec3, aabb: Aabb, tolerance: number): Vec3 | null {
  const candidates = [
    candidateForAxis(eye, direction, aabb, 'x', 'y', 'z', tolerance),
    candidateForAxis(eye, direction, aabb, 'y', 'x', 'z', tolerance),
    candidateForAxis(eye, direction, aabb, 'z', 'x', 'y', tolerance),
  ].filter((candidate): candidate is RayPlaneCandidate => candidate !== null)

  if (candidates.length === 0) {
    return null
  }

  return candidates.reduce((nearest, candidate) =>
    candidate.distanceAlongDirection < nearest.distanceAlongDirection ? candidate : nearest,
  ).point
}

export function createFeetAnchoredAabb(cube: CubeGeometry): Aabb {
  const halfWidth = cube.dimensions.width / 2

  return {
    min: {
      x: cube.feetPosition.x - halfWidth,
      y: cube.feetPosition.y,
      z: cube.feetPosition.z - halfWidth,
    },
    max: {
      x: cube.feetPosition.x + halfWidth,
      y: cube.feetPosition.y + cube.dimensions.height,
      z: cube.feetPosition.z + halfWidth,
    },
  }
}

export function resolveClearRayEntityReach(
  input: ClearRayEntityReachInput,
): ClearRayEntityReachResult {
  assertFiniteVec3(input.eye, 'eye')
  assertFiniteVec3(input.lookDirection, 'lookDirection')
  assertFiniteVec3(input.targetAabb.min, 'targetAabb.min')
  assertFiniteVec3(input.targetAabb.max, 'targetAabb.max')
  assertFiniteNumber(input.reach, 'reach')
  assertFiniteNumber(input.pickRadius, 'pickRadius')
  assertFiniteNumber(input.clipTolerance, 'clipTolerance')

  if (input.reach < 0) {
    throw new RangeError('reach must not be negative')
  }
  if (input.pickRadius < 0) {
    throw new RangeError('pickRadius must not be negative')
  }
  if (input.clipTolerance < 0) {
    throw new RangeError('clipTolerance must not be negative')
  }
  if (
    input.targetAabb.min.x > input.targetAabb.max.x ||
    input.targetAabb.min.y > input.targetAabb.max.y ||
    input.targetAabb.min.z > input.targetAabb.max.z
  ) {
    throw new RangeError('targetAabb minimums must not exceed maximums')
  }
  if (Math.hypot(input.lookDirection.x, input.lookDirection.y, input.lookDirection.z) === 0) {
    throw new RangeError('lookDirection must be nonzero')
  }

  const targetAabb = inflateAabb(input.targetAabb, input.pickRadius)

  if (containsWithMinecraftBounds(targetAabb, input.eye)) {
    return input.canBePickedFromInside
      ? {
          status: 'within_reach',
          entryPoint: { ...input.eye },
          entryDistance: 0,
          strictMaximumReach: input.reach,
          occlusion: 'not_evaluated',
        }
      : {
          status: 'inside_unpickable_aabb',
          entryPoint: null,
          entryDistance: null,
          strictMaximumReach: input.reach,
          occlusion: 'not_evaluated',
        }
  }

  const entryPoint = firstRayEntry(input.eye, input.lookDirection, targetAabb, input.clipTolerance)

  if (entryPoint === null) {
    return {
      status: 'ray_miss',
      entryPoint: null,
      entryDistance: null,
      strictMaximumReach: input.reach,
      occlusion: 'not_evaluated',
    }
  }

  const entryDistance = Math.hypot(
    entryPoint.x - input.eye.x,
    entryPoint.y - input.eye.y,
    entryPoint.z - input.eye.z,
  )

  return {
    status: entryDistance < input.reach ? 'within_reach' : 'at_or_beyond_reach',
    entryPoint,
    entryDistance,
    strictMaximumReach: input.reach,
    occlusion: 'not_evaluated',
  }
}

export function resolveCubeClearRayReach(
  attacker: AttackerGeometry,
  cube: CubeGeometry,
  reach: number,
  pickRadius: number,
  canBePickedFromInside: boolean,
  clipTolerance: number,
): ClearRayEntityReachResult {
  return resolveClearRayEntityReach({
    eye: attacker.eyePosition,
    lookDirection: attacker.lookDirection,
    targetAabb: createFeetAnchoredAabb(cube),
    reach,
    pickRadius,
    canBePickedFromInside,
    clipTolerance,
  })
}
