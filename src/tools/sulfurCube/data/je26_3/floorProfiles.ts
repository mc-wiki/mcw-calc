import type { UniformFloorAfterTravel, UniformFloorProfile } from '../../model/types'
import type { SourcedValue } from './provenance'
import { sourcedValue } from './provenance'

export type Je26_3UniformFloorProfileId =
  | 'ordinary_full_block'
  | 'slime_block'
  | 'honey_block'
  | 'ice_0_98'
  | 'blue_ice'
  | 'soul_sand'
  | 'bed'

export interface Je26_3UniformFloorProfileDefinition {
  readonly id: Je26_3UniformFloorProfileId
  readonly representatives: readonly string[]
  readonly surfaceHeightWithinBlock: SourcedValue<number>
  readonly friction: SourcedValue<number>
  readonly bounceRestitution: SourcedValue<number>
  readonly speedFactor: SourcedValue<number>
  readonly suppressesBounce: SourcedValue<boolean>
  readonly afterTravel: SourcedValue<UniformFloorAfterTravel>
  readonly scopeNote?: string
}

const floorSource = ['uniformFloorProperties'] as const

export const je26_3UniformFloorProfileOrder = [
  'ordinary_full_block',
  'slime_block',
  'honey_block',
  'ice_0_98',
  'blue_ice',
  'soul_sand',
  'bed',
] as const satisfies readonly Je26_3UniformFloorProfileId[]

export const je26_3UniformFloorProfileDefinitions = Object.freeze({
  ordinary_full_block: {
    id: 'ordinary_full_block',
    representatives: ['minecraft:stone', 'minecraft:oak_planks'],
    surfaceHeightWithinBlock: sourcedValue(1, floorSource),
    friction: sourcedValue(0.6000000238418579, floorSource, 'Decoded from the source float 0.6F.'),
    bounceRestitution: sourcedValue(0, floorSource),
    speedFactor: sourcedValue(1, floorSource),
    suppressesBounce: sourcedValue(false, floorSource),
    afterTravel: sourcedValue('none', floorSource),
  },
  slime_block: {
    id: 'slime_block',
    representatives: ['minecraft:slime_block'],
    surfaceHeightWithinBlock: sourcedValue(1, floorSource),
    friction: sourcedValue(0.800000011920929, floorSource, 'Decoded from the source float 0.8F.'),
    bounceRestitution: sourcedValue(1, floorSource),
    speedFactor: sourcedValue(1, floorSource),
    suppressesBounce: sourcedValue(false, floorSource),
    afterTravel: sourcedValue('slimeStepOn', floorSource),
  },
  honey_block: {
    id: 'honey_block',
    representatives: ['minecraft:honey_block'],
    surfaceHeightWithinBlock: sourcedValue(0.9375, floorSource),
    friction: sourcedValue(0.6000000238418579, floorSource, 'Decoded from the source float 0.6F.'),
    bounceRestitution: sourcedValue(0, floorSource),
    speedFactor: sourcedValue(
      0.4000000059604645,
      floorSource,
      'Decoded from the source float 0.4F.',
    ),
    suppressesBounce: sourcedValue(true, floorSource),
    afterTravel: sourcedValue('none', floorSource),
    scopeNote: 'Top-surface motion only; honey side sliding is outside the uniform-floor model.',
  },
  ice_0_98: {
    id: 'ice_0_98',
    representatives: ['minecraft:ice', 'minecraft:packed_ice', 'minecraft:frosted_ice'],
    surfaceHeightWithinBlock: sourcedValue(1, floorSource),
    friction: sourcedValue(0.9800000190734863, floorSource, 'Decoded from the source float 0.98F.'),
    bounceRestitution: sourcedValue(0, floorSource),
    speedFactor: sourcedValue(1, floorSource),
    suppressesBounce: sourcedValue(false, floorSource),
    afterTravel: sourcedValue('none', floorSource),
  },
  blue_ice: {
    id: 'blue_ice',
    representatives: ['minecraft:blue_ice'],
    surfaceHeightWithinBlock: sourcedValue(1, floorSource),
    friction: sourcedValue(
      0.9890000224113464,
      floorSource,
      'Decoded from the source float 0.989F.',
    ),
    bounceRestitution: sourcedValue(0, floorSource),
    speedFactor: sourcedValue(1, floorSource),
    suppressesBounce: sourcedValue(false, floorSource),
    afterTravel: sourcedValue('none', floorSource),
  },
  soul_sand: {
    id: 'soul_sand',
    representatives: ['minecraft:soul_sand'],
    surfaceHeightWithinBlock: sourcedValue(0.875, floorSource),
    friction: sourcedValue(0.6000000238418579, floorSource, 'Decoded from the source float 0.6F.'),
    bounceRestitution: sourcedValue(0, floorSource),
    speedFactor: sourcedValue(
      0.4000000059604645,
      floorSource,
      'Decoded from the source float 0.4F.',
    ),
    suppressesBounce: sourcedValue(false, floorSource),
    afterTravel: sourcedValue('none', floorSource),
  },
  bed: {
    id: 'bed',
    representatives: ['minecraft:white_bed'],
    surfaceHeightWithinBlock: sourcedValue(0.5625, floorSource),
    friction: sourcedValue(0.6000000238418579, floorSource, 'Decoded from the source float 0.6F.'),
    bounceRestitution: sourcedValue(0.75, floorSource),
    speedFactor: sourcedValue(1, floorSource),
    suppressesBounce: sourcedValue(false, floorSource),
    afterTravel: sourcedValue('none', floorSource),
    scopeNote: 'The bed fall-damage adjustment does not change sulfur-cube motion.',
  },
} as const satisfies Record<Je26_3UniformFloorProfileId, Je26_3UniformFloorProfileDefinition>)

export function toUniformFloorProfile(
  definition: Je26_3UniformFloorProfileDefinition,
): UniformFloorProfile {
  return {
    id: definition.id,
    surfaceHeightWithinBlock: definition.surfaceHeightWithinBlock.value,
    friction: definition.friction.value,
    bounceRestitution: definition.bounceRestitution.value,
    speedFactor: definition.speedFactor.value,
    suppressesBounce: definition.suppressesBounce.value,
    afterTravel: definition.afterTravel.value,
  }
}

export const je26_3UniformFloorProfiles = Object.freeze(
  Object.fromEntries(
    je26_3UniformFloorProfileOrder.map((id) => [
      id,
      toUniformFloorProfile(je26_3UniformFloorProfileDefinitions[id]),
    ]),
  ) as Record<Je26_3UniformFloorProfileId, UniformFloorProfile>,
)
