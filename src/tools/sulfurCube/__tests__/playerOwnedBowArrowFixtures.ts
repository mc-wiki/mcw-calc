import type { SulfurCubeKnockbackContext, Vec3 } from '../model/types'
import type { PlayerOwnedBowArrowAttackConfiguration } from '../resolution'
import { je26_3KnockbackMechanics } from '../data/je26_3'

export const playerOwnedBowArrowFixtureProvenance = {
  edition: 'Java Edition',
  version: '26.2',
  source:
    'versions/26.2/decompiled/src/net/minecraft/world/entity/projectile/arrow/AbstractArrow.java',
  sourceLedger: 'src/tools/sulfurCube/data/je26_3/provenance.ts',
  notes: 'Frozen player-owned arrow results derived from the recorded JE 26.2 source paths.',
} as const

export function createAcceptedPlayerOwnedBowArrowContext(): SulfurCubeKnockbackContext {
  return {
    attacker: {
      feetPosition: { x: 0, y: 0, z: 6 },
      eyePosition: { x: 0, y: 1.6200000047683716, z: 6 },
      lookDirection: { x: 0, y: 0, z: -1 },
    },
    cube: {
      feetPosition: { x: 0, y: 0, z: 0 },
      dimensions: { width: 0.9800000190734863, height: 0.9800000190734863 },
    },
    properties: {
      horizontalPower: 0.4124999940395355,
      verticalPower: 0.10499999672174454,
      knockbackResistance: -2,
    },
    mechanics: je26_3KnockbackMechanics,
  }
}

export function createPlayerOwnedBowArrowConfiguration(
  overrides: Partial<PlayerOwnedBowArrowAttackConfiguration> = {},
): PlayerOwnedBowArrowAttackConfiguration {
  return {
    family: 'playerOwnedBowArrow',
    projectileKind: 'ordinaryArrow',
    drawTicks: 19,
    powerLevel: 0,
    punchLevel: 0,
    criticalBonusRoll: null,
    impactMotion: { x: 0, y: 0, z: -2.8 },
    projectileFeetPosition: { x: 0, y: 0.49, z: 1.3 },
    ...overrides,
  }
}

export interface PlayerOwnedBowArrowVelocityFixture {
  readonly id: string
  readonly configuration: PlayerOwnedBowArrowAttackConfiguration
  readonly initialVelocity: Vec3
  readonly expected: {
    readonly operationKinds: readonly ('sulfurCubeKnockbackCall' | 'directPush')[]
    readonly damageArgument: number
    readonly finalVelocity: Vec3
  }
}

export const playerOwnedBowArrowVelocityFixtures: readonly PlayerOwnedBowArrowVelocityFixture[] = [
  {
    id: 'default_noncritical_bow_arrow_no_punch',
    configuration: createPlayerOwnedBowArrowConfiguration(),
    initialVelocity: { x: 0, y: 0, z: 0 },
    expected: {
      operationKinds: ['sulfurCubeKnockbackCall'],
      damageArgument: 6,
      finalVelocity: { x: 0, y: 0.30863570759068043, z: -1.2124974226776732 },
    },
  },
  {
    id: 'default_with_punch_i',
    configuration: createPlayerOwnedBowArrowConfiguration({ punchLevel: 1 }),
    initialVelocity: { x: 0, y: 0, z: 0 },
    expected: {
      operationKinds: ['sulfurCubeKnockbackCall', 'directPush'],
      damageArgument: 6,
      finalVelocity: { x: 0, y: 0.4086357075906804, z: -3.012497422677673 },
    },
  },
  {
    id: 'diagonal_motion_nonzero_initial_velocity_punch_ii',
    configuration: createPlayerOwnedBowArrowConfiguration({
      punchLevel: 2,
      impactMotion: { x: 0.6, y: 0.8, z: -2.4 },
      projectileFeetPosition: { x: 0.2, y: 0.7, z: 1.4 },
    }),
    initialVelocity: { x: 0.25, y: -0.4, z: 0.75 },
    expected: {
      operationKinds: ['sulfurCubeKnockbackCall', 'directPush'],
      damageArgument: 6,
      finalVelocity: {
        x: 1.417202070394871,
        y: 0.00863570759068042,
        z: -3.918808281579484,
      },
    },
  },
  {
    id: 'partial_draw_slower_impact',
    configuration: createPlayerOwnedBowArrowConfiguration({
      drawTicks: 10,
      impactMotion: { x: 0, y: 0, z: -0.75 },
    }),
    initialVelocity: { x: 0, y: 0, z: 0 },
    expected: {
      operationKinds: ['sulfurCubeKnockbackCall'],
      damageArgument: 2,
      finalVelocity: { x: 0, y: 0.17819090885901, z: -0.7000357133746821 },
    },
  },
  {
    id: 'full_draw_critical_explicit_roll',
    configuration: createPlayerOwnedBowArrowConfiguration({
      drawTicks: 20,
      criticalBonusRoll: 3,
    }),
    initialVelocity: { x: 0, y: 0, z: 0 },
    expected: {
      operationKinds: ['sulfurCubeKnockbackCall'],
      damageArgument: 9,
      finalVelocity: { x: 0, y: 0.37800000000000006, z: -1.4849999999999999 },
    },
  },
]
