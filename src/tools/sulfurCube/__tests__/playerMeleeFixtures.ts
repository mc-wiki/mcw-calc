import type { SulfurCubeKnockbackContext, Vec3 } from '../model/types'
import type {
  PlayerCriticalEligibilityState,
  PrimaryPlayerMeleeAttackConfiguration,
} from '../resolution'
import { je26_3KnockbackMechanics } from '../data/je26_3'

export const playerMeleeFixtureProvenance = {
  edition: 'Java Edition',
  version: '26.3',
  source: 'versions/26.3/decompiled/src/net/minecraft/world/entity/player/Player.java',
  independentDirectionSource:
    'versions/26.3/decompiled/src/net/minecraft/world/entity/monster/cubemob/SulfurCube.java',
  notes:
    'Frozen primary-player-melee results derived from the source paths recorded in data/je26_3/provenance.ts.',
} as const

export const groundedCriticalEligibility: PlayerCriticalEligibilityState = {
  fallDistancePositive: false,
  onGround: true,
  onClimbable: false,
  inWater: false,
  mobilityRestricted: false,
  passenger: false,
  targetIsLiving: true,
}

export const airborneCriticalEligibility: PlayerCriticalEligibilityState = {
  fallDistancePositive: true,
  onGround: false,
  onClimbable: false,
  inWater: false,
  mobilityRestricted: false,
  passenger: false,
  targetIsLiving: true,
}

export function createAcceptedPlayerMeleeContext(): SulfurCubeKnockbackContext {
  return {
    attacker: {
      feetPosition: { x: 0, y: 0, z: 1.5 },
      eyePosition: { x: 0, y: 1.6200000047683716, z: 1.5 },
      lookDirection: {
        x: -0.2541956249780245,
        y: -0.7179367980930479,
        z: -0.6480365253486362,
      },
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

export function createPrimaryPlayerMeleeConfiguration(
  overrides: Partial<PrimaryPlayerMeleeAttackConfiguration> = {},
): PrimaryPlayerMeleeAttackConfiguration {
  return {
    family: 'primaryPlayerMelee',
    effectiveAttackDamage: 6,
    damageEnchantmentBonus: 0,
    itemSpecificDamageBonus: 0,
    attackStrength: 1,
    sprinting: false,
    effectiveAttackKnockback: 0,
    knockbackEnchantmentLevel: 0,
    criticalEligibility: groundedCriticalEligibility,
    attackerYawDegrees: 158.5870361328125,
    ...overrides,
  }
}

export interface PlayerMeleeVelocityFixture {
  readonly id: string
  readonly configuration: PrimaryPlayerMeleeAttackConfiguration
  readonly expected: {
    readonly operationCount: number
    readonly fullStrength: boolean
    readonly critical: boolean
    readonly damageArgument: number
    readonly combinedKnockback: number
    readonly effectFactor: number
    readonly finalVelocity: Vec3
  }
}

export const playerMeleeVelocityFixtures: readonly PlayerMeleeVelocityFixture[] = [
  {
    id: 'player_iron_sword_full_no_knockback',
    configuration: createPrimaryPlayerMeleeConfiguration(),
    expected: {
      operationCount: 1,
      fullStrength: true,
      critical: false,
      damageArgument: 6,
      combinedKnockback: 0,
      effectFactor: 0,
      finalVelocity: {
        x: 0.2565921852671323,
        y: 0.925907278060913,
        z: -0.376624928317217,
      },
    },
  },
  {
    id: 'direct_melee_iron_sword_knockback_ii_sprint',
    configuration: createPrimaryPlayerMeleeConfiguration({
      sprinting: true,
      knockbackEnchantmentLevel: 2,
    }),
    expected: {
      operationCount: 2,
      fullStrength: true,
      critical: false,
      damageArgument: 6,
      combinedKnockback: 1.5,
      effectFactor: 0.375,
      finalVelocity: {
        x: 0.2945952655537251,
        y: 1.273122489452362,
        z: -0.5432430354706794,
      },
    },
  },
  {
    id: 'player_attack_strength_exact_float_0_9',
    configuration: createPrimaryPlayerMeleeConfiguration({
      attackStrength: 0.8999999761581421,
      sprinting: true,
    }),
    expected: {
      operationCount: 1,
      fullStrength: false,
      critical: false,
      damageArgument: 5.08799934387207,
      combinedKnockback: 0,
      effectFactor: 0,
      finalVelocity: {
        x: 0.23628778680114765,
        y: 0.8526392698287963,
        z: -0.3468222178067063,
      },
    },
  },
  {
    id: 'player_attack_strength_next_float_above_0_9_sprint',
    configuration: createPrimaryPlayerMeleeConfiguration({
      attackStrength: 0.9000000357627869,
      sprinting: true,
    }),
    expected: {
      operationCount: 2,
      fullStrength: true,
      critical: false,
      damageArgument: 5.088000297546387,
      combinedKnockback: 0.5,
      effectFactor: 0.125,
      finalVelocity: {
        x: 0.24795309047836778,
        y: 0.9592192590236664,
        z: -0.3979667288191986,
      },
    },
  },
  {
    id: 'player_critical_eligible_iron_sword',
    configuration: createPrimaryPlayerMeleeConfiguration({
      criticalEligibility: airborneCriticalEligibility,
    }),
    expected: {
      operationCount: 1,
      fullStrength: true,
      critical: true,
      damageArgument: 9,
      combinedKnockback: 0,
      effectFactor: 0,
      finalVelocity: {
        x: 0.31425992483300985,
        y: 1.1339999914169312,
        z: -0.46126939345399937,
      },
    },
  },
  {
    id: 'player_critical_requested_but_sprinting_ineligible',
    configuration: createPrimaryPlayerMeleeConfiguration({
      sprinting: true,
      criticalEligibility: airborneCriticalEligibility,
    }),
    expected: {
      operationCount: 2,
      fullStrength: true,
      critical: false,
      damageArgument: 6,
      combinedKnockback: 0.5,
      effectFactor: 0.125,
      finalVelocity: {
        x: 0.26925987869599655,
        y: 1.0416456878185272,
        z: -0.43216429736837114,
      },
    },
  },
]

export const knockbackCombinationFixtures = [
  {
    id: 'none',
    sprinting: false,
    knockbackEnchantmentLevel: 0,
    combinedKnockback: 0,
    operationCount: 1,
  },
  {
    id: 'knockback_ii_only',
    sprinting: false,
    knockbackEnchantmentLevel: 2,
    combinedKnockback: 1,
    operationCount: 2,
  },
  {
    id: 'sprint_only',
    sprinting: true,
    knockbackEnchantmentLevel: 0,
    combinedKnockback: 0.5,
    operationCount: 2,
  },
  {
    id: 'knockback_ii_and_sprint',
    sprinting: true,
    knockbackEnchantmentLevel: 2,
    combinedKnockback: 1.5,
    operationCount: 2,
  },
] as const
