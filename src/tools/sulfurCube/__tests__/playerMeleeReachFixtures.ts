import type { Aabb, ClearRayReachStatus } from '../model/reach'
import type { Vec3 } from '../model/types'

export interface PlayerMeleeClearRayFixture {
  readonly id: string
  readonly eye: Vec3
  readonly lookDirection: Vec3
  readonly reach: number
  readonly expectedStatus: ClearRayReachStatus
  readonly expectedEntryPoint?: Vec3
  readonly expectedEntryDistance?: number
}

const halfWidth = 0.49000000953674316
const height = 0.9800000190734863

export const adultCubeReachFixtureAabb: Aabb = {
  min: { x: -halfWidth, y: 0, z: -halfWidth },
  max: { x: halfWidth, y: height, z: halfWidth },
}

/** Boundary cases derived from the JE 26.3 client entity-picking path. */
export const playerMeleeClearRayFixtures: readonly PlayerMeleeClearRayFixture[] = [
  {
    id: 'survival_face_hit_2_99',
    eye: { x: 0, y: 0.49, z: -3.4800000095367434 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 3,
    expectedStatus: 'within_reach',
    expectedEntryPoint: { x: 0, y: 0.49, z: -halfWidth },
    expectedEntryDistance: 2.99,
  },
  {
    id: 'survival_face_exact_boundary',
    eye: { x: 0, y: 0.49, z: -3.490000009536743 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 3,
    expectedStatus: 'at_or_beyond_reach',
    expectedEntryPoint: { x: 0, y: 0.49, z: -halfWidth },
    expectedEntryDistance: 3,
  },
  {
    id: 'survival_face_beyond_boundary',
    eye: { x: 0, y: 0.49, z: -3.491000009536743 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 3,
    expectedStatus: 'at_or_beyond_reach',
    expectedEntryPoint: { x: 0, y: 0.49, z: -halfWidth },
    expectedEntryDistance: 3.001,
  },
  {
    id: 'survival_exact_edge_touch',
    eye: { x: halfWidth, y: 0.49, z: -2.990000009536743 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 3,
    expectedStatus: 'within_reach',
    expectedEntryPoint: { x: halfWidth, y: 0.49, z: -halfWidth },
    expectedEntryDistance: 2.5,
  },
  {
    id: 'survival_exact_corner_touch',
    eye: { x: halfWidth, y: height, z: -2.990000009536743 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 3,
    expectedStatus: 'within_reach',
    expectedEntryPoint: { x: halfWidth, y: height, z: -halfWidth },
    expectedEntryDistance: 2.5,
  },
  {
    id: 'survival_beyond_edge_tolerance',
    eye: { x: halfWidth + 2e-7, y: 0.49, z: -2.990000009536743 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 3,
    expectedStatus: 'ray_miss',
  },
  {
    id: 'absorbed_eye_inside_aabb',
    eye: { x: 0, y: 0.49, z: 0 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 3,
    expectedStatus: 'inside_unpickable_aabb',
  },
  {
    id: 'creative_face_hit_4_999',
    eye: { x: 0, y: 0.49, z: -5.489000009536743 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 5,
    expectedStatus: 'within_reach',
    expectedEntryPoint: { x: 0, y: 0.49, z: -halfWidth },
    expectedEntryDistance: 4.999,
  },
  {
    id: 'creative_face_exact_boundary',
    eye: { x: 0, y: 0.49, z: -5.490000009536743 },
    lookDirection: { x: 0, y: 0, z: 1 },
    reach: 5,
    expectedStatus: 'at_or_beyond_reach',
    expectedEntryPoint: { x: 0, y: 0.49, z: -halfWidth },
    expectedEntryDistance: 5,
  },
]
