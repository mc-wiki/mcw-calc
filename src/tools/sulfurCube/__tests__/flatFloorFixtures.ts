import type { Vec3 } from '../model/types'

export interface FlatFloorFixture {
  readonly id: string
  readonly initialVelocity: Vec3
  readonly drag: number
  readonly initialGroundHorizontalFactor: number
  readonly expected: {
    readonly contactTick: number
    readonly contactPosition: Vec3
    readonly horizontalDistance: number
    readonly maximumFeetY: number
  }
}

/** JE 26.3 flat-floor contact cases, evaluated with an absolute tolerance of 1e-9. */
export const flatFloorFixtures: readonly FlatFloorFixture[] = [
  {
    id: 'immediate_zero_vertical_velocity',
    initialVelocity: { x: 0.2, y: 0, z: 0.1 },
    drag: 0.9991000294685364,
    initialGroundHorizontalFactor: 0.8792080283164978,
    expected: {
      contactTick: 0,
      contactPosition: { x: 0, y: 0, z: 0 },
      horizontalDistance: 0,
      maximumFeetY: 0,
    },
  },
  {
    id: 'immediate_negative_vertical_velocity',
    initialVelocity: { x: 0.2, y: -0.25, z: 0.1 },
    drag: 0.9991000294685364,
    initialGroundHorizontalFactor: 0.8792080283164978,
    expected: {
      contactTick: 0,
      contactPosition: { x: 0, y: 0, z: 0 },
      horizontalDistance: 0,
      maximumFeetY: 0,
    },
  },
  {
    id: 'low_bouncy_x',
    initialVelocity: { x: 0.1, y: 0.2, z: 0 },
    drag: 0.9991000294685364,
    initialGroundHorizontalFactor: 0.8792080283164978,
    expected: {
      contactTick: 6,
      contactPosition: { x: 0.5388134646332232, y: 0, z: 0 },
      horizontalDistance: 0.5388134646332232,
      maximumFeetY: 0.3597481054448251,
    },
  },
  {
    id: 'xz_bouncy',
    initialVelocity: { x: 0.3, y: 0.8, z: 0.4 },
    drag: 0.9991000294685364,
    initialGroundHorizontalFactor: 0.8792080283164978,
    expected: {
      contactTick: 21,
      contactPosition: { x: 5.530388888274578, y: 0, z: 7.373851851032772 },
      horizontalDistance: 9.217314813790964,
      maximumFeetY: 4.379536948780019,
    },
  },
  {
    id: 'high_bouncy_xz',
    initialVelocity: { x: 1.5, y: 5, z: -2 },
    drag: 0.9991000294685364,
    initialGroundHorizontalFactor: 0.8792080283164978,
    expected: {
      contactTick: 124,
      contactPosition: { x: 155.12333695810676, y: 0, z: -206.8311159441422 },
      horizontalDistance: 258.53889493017783,
      maximumFeetY: 153.19631596809603,
    },
  },
  {
    id: 'xz_default_air_drag_modifier',
    initialVelocity: { x: 0.3, y: 0.8, z: 0.4 },
    drag: 0.9100000262260437,
    initialGroundHorizontalFactor: 0.8008000254631042,
    expected: {
      contactTick: 19,
      contactPosition: { x: 2.480515017151062, y: 0, z: 3.3073533562014172 },
      horizontalDistance: 4.134191695251771,
      maximumFeetY: 2.9989427431366495,
    },
  },
  {
    id: 'no_air_drag',
    initialVelocity: { x: -0.25, y: 1.2, z: 0.75 },
    drag: 1,
    initialGroundHorizontalFactor: 0.8799999952316284,
    expected: {
      contactTick: 31,
      contactPosition: { x: -6.849999964237213, y: 0, z: 20.54999989271164 },
      horizontalDistance: 21.661601859061538,
      maximumFeetY: 9.6,
    },
  },
  {
    id: 'strict_component_cutoff',
    initialVelocity: { x: 0.0029, y: 0.55, z: -0.003 },
    drag: 0.9991000294685364,
    initialGroundHorizontalFactor: 0.8792080283164978,
    expected: {
      contactTick: 15,
      contactPosition: { x: 0, y: 0, z: -0.003 },
      horizontalDistance: 0.003,
      maximumFeetY: 2.163648253358355,
    },
  },
]
