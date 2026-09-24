import type {
  Je26_3PlayerMeleeWeaponPreset,
  Je26_3PlayerMeleeWeaponPresetId,
  PlayerMeleeWeaponChoice,
} from '../data/je26_3'
import type { CubeLaunchProperties, Vec3, VelocityOperationSequenceResult } from '../model/types'
import type { NumericBackend } from '../numerics/types'
import type {
  PlayerCriticalEligibilityState,
  PrimaryPlayerMeleeAttackConfiguration,
  SuccessfulAttackResolution,
} from '../resolution'
import type { DiagnosticEvaluation, DiagnosticInputs } from './diagnostic'
import {
  je26_3KnockbackMechanics,
  je26_3PlayerMeleeMechanics,
  je26_3UniformFloorProfiles,
  resolveJe26_3PlayerMeleeWeaponPreset,
} from '../data/je26_3'
import { summarizeLaunchVelocity } from '../model/launchSummary'
import { simulateRepeatedUniformFloorTrajectory } from '../model/trajectory'
import { subtractVec3 } from '../model/vectors'
import { applyVelocityOperations } from '../model/velocityOperations'
import { standardNumerics } from '../numerics/standard'
import { resolveAttackConfiguration } from '../resolution'
import {
  createBouncyCubeLaunchProperties,
  createRestingGroundVelocity,
  createUniformFloorTrajectoryAssumptions,
} from './defaults'
import { createDiagnosticKnockbackContext, maximumTrajectoryTicks } from './diagnostic'
import { resolveOrdinarySurvivalPlayerMeleeReach } from './playerMeleeReach'

export type PlayerMeleeEnchantmentSelection =
  | { readonly enabled: false }
  | { readonly enabled: true; readonly level: number }

export interface PlayerMeleeInputs {
  readonly weapon: PlayerMeleeWeaponChoice
  /** Normalized cooldown strength in the inclusive range 0 to 1. */
  readonly attackStrength: number
  readonly sprinting: boolean
  /** Requests the standard airborne/falling eligibility state; the resolver still derives success. */
  readonly criticalHitConditions: boolean
  readonly sharpness: PlayerMeleeEnchantmentSelection
  readonly knockback: PlayerMeleeEnchantmentSelection
}

export interface PlayerMeleeEvaluation extends DiagnosticEvaluation {
  readonly kind: 'primaryPlayerMelee'
  readonly playerMeleeInputs: PlayerMeleeInputs
  readonly weaponPreset: Je26_3PlayerMeleeWeaponPreset
  readonly resolvedEnchantments: ResolvedOrdinaryMeleeEnchantments
  readonly availability: PlayerMeleeVanillaSurvivalAvailability
  readonly attackConfiguration: PrimaryPlayerMeleeAttackConfiguration
  readonly attackResolution: SuccessfulAttackResolution
  readonly operationSequence: VelocityOperationSequenceResult
  readonly attackerYawDegrees: number
}

export interface ResolvedOrdinaryMeleeEnchantments {
  readonly sharpnessEnabled: boolean
  readonly sharpnessLevel: number | null
  readonly sharpnessBonus: number
  readonly knockbackEnabled: boolean
  readonly knockbackLevel: number | null
  readonly enchantmentKnockbackAddition: number
}

export interface PlayerMeleeVanillaSurvivalIssue {
  readonly code:
    | 'enchantmentWithoutItem'
    | 'unsupportedEnchantmentForWeapon'
    | 'aboveVanillaSurvivalMaximum'
    | 'invalidEnchantmentLevel'
  readonly enchantment: 'sharpness' | 'knockback'
  readonly weaponPresetId: Je26_3PlayerMeleeWeaponPresetId
  readonly selectedLevel: number
  readonly maximumLevel: number
}

export interface PlayerMeleeVanillaSurvivalAvailability {
  /** Unsupported is reserved for later attack families; primary melee returns the other states. */
  readonly status: 'ordinarySurvival' | 'synthetic' | 'invalid' | 'unsupported'
  readonly obtainable: boolean
  readonly issues: readonly PlayerMeleeVanillaSurvivalIssue[]
}

const groundedEligibility: PlayerCriticalEligibilityState = {
  fallDistancePositive: false,
  onGround: true,
  onClimbable: false,
  inWater: false,
  mobilityRestricted: false,
  passenger: false,
  targetIsLiving: true,
}

const airborneEligibility: PlayerCriticalEligibilityState = {
  fallDistancePositive: true,
  onGround: false,
  onClimbable: false,
  inWater: false,
  mobilityRestricted: false,
  passenger: false,
  targetIsLiving: true,
}

export function createDefaultPlayerMeleeInputs(): PlayerMeleeInputs {
  return {
    weapon: { type: 'bareHand' },
    attackStrength: 1,
    sprinting: false,
    criticalHitConditions: false,
    sharpness: { enabled: false },
    knockback: { enabled: false },
  }
}

export function resolvePlayerMeleeVanillaSurvivalAvailability(
  inputs: Pick<PlayerMeleeInputs, 'weapon' | 'sharpness' | 'knockback'>,
): PlayerMeleeVanillaSurvivalAvailability {
  const weapon = resolveJe26_3PlayerMeleeWeaponPreset(inputs.weapon)
  const issues: PlayerMeleeVanillaSurvivalIssue[] = []
  const declaredMaximumLevels = {
    sharpness: je26_3PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum,
    knockback: je26_3PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum,
  } as const

  for (const enchantment of ['sharpness', 'knockback'] as const) {
    const selected = inputs[enchantment]
    if (!selected.enabled) continue

    const maximumLevel = declaredMaximumLevels[enchantment]
    if (
      !Number.isInteger(selected.level) ||
      selected.level < 1 ||
      selected.level > je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel
    ) {
      issues.push({
        code: 'invalidEnchantmentLevel',
        enchantment,
        weaponPresetId: weapon.id,
        selectedLevel: selected.level,
        maximumLevel,
      })
      continue
    }

    if (weapon.weaponType === 'bareHand') {
      issues.push({
        code: 'enchantmentWithoutItem',
        enchantment,
        weaponPresetId: weapon.id,
        selectedLevel: selected.level,
        maximumLevel,
      })
    } else if (!weapon[enchantment].anvilSupported.value) {
      issues.push({
        code: 'unsupportedEnchantmentForWeapon',
        enchantment,
        weaponPresetId: weapon.id,
        selectedLevel: selected.level,
        maximumLevel,
      })
    }

    if (selected.level > maximumLevel) {
      issues.push({
        code: 'aboveVanillaSurvivalMaximum',
        enchantment,
        weaponPresetId: weapon.id,
        selectedLevel: selected.level,
        maximumLevel,
      })
    }
  }

  const invalid = issues.some((issue) => issue.code === 'invalidEnchantmentLevel')
  return {
    status: invalid ? 'invalid' : issues.length > 0 ? 'synthetic' : 'ordinarySurvival',
    obtainable: issues.length === 0,
    issues,
  }
}

export function resolveSharpnessDamageBonus(
  selection: PlayerMeleeEnchantmentSelection,
  numerics: NumericBackend = standardNumerics,
): number {
  if (!selection.enabled) return 0
  assertValidEnabledEnchantment(selection, 'Sharpness')

  return numerics.sourceFloat(
    je26_3PlayerMeleeMechanics.sharpnessFirstLevelDamageAddition +
      numerics.sourceFloat(
        je26_3PlayerMeleeMechanics.sharpnessAdditionalLevelDamageAddition * (selection.level - 1),
      ),
  )
}

function assertValidEnabledEnchantment(
  selection: PlayerMeleeEnchantmentSelection,
  name: string,
): void {
  if (!selection.enabled) return
  if (
    !Number.isInteger(selection.level) ||
    selection.level < 1 ||
    selection.level > je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel
  ) {
    throw new RangeError(
      `enabled ${name} level must be an integer from 1 to ${je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel}`,
    )
  }
}

export function resolveOrdinaryMeleeEnchantments(
  inputs: Pick<PlayerMeleeInputs, 'sharpness' | 'knockback'>,
  numerics: NumericBackend = standardNumerics,
): ResolvedOrdinaryMeleeEnchantments {
  const sharpnessBonus = resolveSharpnessDamageBonus(inputs.sharpness, numerics)
  assertValidEnabledEnchantment(inputs.knockback, 'Knockback')
  const knockbackLevel = inputs.knockback.enabled ? inputs.knockback.level : null

  return {
    sharpnessEnabled: inputs.sharpness.enabled,
    sharpnessLevel: inputs.sharpness.enabled ? inputs.sharpness.level : null,
    sharpnessBonus,
    knockbackEnabled: inputs.knockback.enabled,
    knockbackLevel,
    enchantmentKnockbackAddition:
      knockbackLevel === null
        ? 0
        : numerics.sourceFloat(
            knockbackLevel * je26_3PlayerMeleeMechanics.knockbackPerEnchantmentLevel,
          ),
  }
}

export function deriveMinecraftYawDegreesFromAim(
  inputs: DiagnosticInputs,
  fallbackYawDegrees: number,
  numerics: NumericBackend = standardNumerics,
): number {
  if (!Number.isFinite(fallbackYawDegrees)) {
    throw new RangeError('fallbackYawDegrees must be finite')
  }

  const horizontalX = inputs.aimPoint.x - inputs.attackerEyePosition.x
  const horizontalZ = inputs.aimPoint.z - inputs.attackerEyePosition.z
  const horizontalLength = numerics.sqrt(horizontalX * horizontalX + horizontalZ * horizontalZ)

  if (
    horizontalLength < numerics.sourceFloat(je26_3KnockbackMechanics.vectorNormalizationThreshold)
  ) {
    return fallbackYawDegrees
  }

  return (numerics.atan2(-horizontalX, horizontalZ) * 180) / Math.PI
}

export function createPrimaryPlayerMeleeConfiguration(
  inputs: PlayerMeleeInputs,
  attackerYawDegrees: number,
  numerics: NumericBackend = standardNumerics,
): PrimaryPlayerMeleeAttackConfiguration {
  const weapon = resolveJe26_3PlayerMeleeWeaponPreset(inputs.weapon)
  const availability = resolvePlayerMeleeVanillaSurvivalAvailability(inputs)
  if (availability.status === 'invalid') {
    throw new RangeError(
      `enabled enchantment levels must be integers from 1 to ${je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel}`,
    )
  }
  const enchantments = resolveOrdinaryMeleeEnchantments(inputs, numerics)

  return {
    family: 'primaryPlayerMelee',
    effectiveAttackDamage: weapon.effectiveAttackDamage.value,
    damageEnchantmentBonus: enchantments.sharpnessBonus,
    itemSpecificDamageBonus: 0,
    attackStrength: inputs.attackStrength,
    sprinting: inputs.sprinting,
    effectiveAttackKnockback: weapon.effectiveAttackKnockback.value,
    knockbackEnchantmentLevel: enchantments.knockbackLevel ?? 0,
    criticalEligibility: inputs.criticalHitConditions ? airborneEligibility : groundedEligibility,
    attackerYawDegrees,
  }
}

export function evaluatePlayerMeleeInputs(
  diagnosticInputs: DiagnosticInputs,
  playerMeleeInputs: PlayerMeleeInputs,
  attackerYawDegrees: number,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): PlayerMeleeEvaluation {
  const context = createDiagnosticKnockbackContext(
    diagnosticInputs,
    numerics,
    properties,
    attackerLookDirection,
  )
  const attackConfiguration = createPrimaryPlayerMeleeConfiguration(
    playerMeleeInputs,
    attackerYawDegrees,
    numerics,
  )
  const attackResolution = resolveAttackConfiguration(attackConfiguration, context, numerics)

  if (attackResolution.status !== 'success') {
    throw new RangeError(`primary player melee resolution returned ${attackResolution.status}`)
  }

  const preAttackVelocity = createRestingGroundVelocity(properties, numerics)
  const operationSequence = applyVelocityOperations(
    preAttackVelocity,
    attackResolution.operations,
    numerics,
  )
  const firstOperation = operationSequence.operationResults[0]

  if (firstOperation?.kind !== 'sulfurCubeKnockbackCall') {
    throw new RangeError('primary player melee must begin with a sulfur cube knockback call')
  }

  const launchVelocity = operationSequence.resultingVelocity
  const trajectory = simulateRepeatedUniformFloorTrajectory(
    {
      tick: 0,
      feetPosition: context.cube.feetPosition,
      velocity: launchVelocity,
      onGround: true,
      supportingFloor: true,
    },
    diagnosticInputs.trajectoryTicks,
    createUniformFloorTrajectoryAssumptions(
      context.cube.feetPosition.y,
      properties,
      je26_3UniformFloorProfiles[diagnosticInputs.floorProfileId],
    ),
    numerics,
  )

  return {
    kind: 'primaryPlayerMelee',
    inputs: {
      cubeFeetPosition: { ...diagnosticInputs.cubeFeetPosition },
      attackerFeetPosition: { ...diagnosticInputs.attackerFeetPosition },
      attackerEyePosition: { ...diagnosticInputs.attackerEyePosition },
      aimPoint: { ...diagnosticInputs.aimPoint },
      damageArgument: attackResolution.diagnostics.damageArgument,
      trajectoryTicks: diagnosticInputs.trajectoryTicks,
      floorProfileId: diagnosticInputs.floorProfileId,
    },
    properties: { ...properties },
    callResult: firstOperation.knockbackResult,
    preAttackVelocity: { ...preAttackVelocity },
    attackAddedVelocity: subtractVec3(launchVelocity, preAttackVelocity),
    launchVelocity: { ...launchVelocity },
    trajectory,
    launchSummary: summarizeLaunchVelocity(
      launchVelocity,
      numerics.sourceFloat(je26_3KnockbackMechanics.vectorNormalizationThreshold),
      numerics,
    ),
    playerMeleeInputs: { ...playerMeleeInputs },
    weaponPreset: resolveJe26_3PlayerMeleeWeaponPreset(playerMeleeInputs.weapon),
    resolvedEnchantments: resolveOrdinaryMeleeEnchantments(playerMeleeInputs, numerics),
    availability: resolvePlayerMeleeVanillaSurvivalAvailability(playerMeleeInputs),
    attackConfiguration,
    attackResolution,
    operationSequence,
    attackerYawDegrees,
    reach: resolveOrdinarySurvivalPlayerMeleeReach(context),
  }
}

export function findDefaultPlayerMeleeTrajectoryTicks(
  diagnosticInputs: DiagnosticInputs,
  playerMeleeInputs: PlayerMeleeInputs,
  attackerYawDegrees: number,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): number {
  const maximumTicks = maximumTrajectoryTicks
  const evaluation = evaluatePlayerMeleeInputs(
    { ...diagnosticInputs, trajectoryTicks: maximumTicks },
    playerMeleeInputs,
    attackerYawDegrees,
    numerics,
    properties,
    attackerLookDirection,
  )
  return evaluation.trajectory.ticks.length
}
