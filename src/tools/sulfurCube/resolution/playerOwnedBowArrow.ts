import type {
  DirectPushOperation,
  SulfurCubeKnockbackContext,
  SulfurCubeKnockbackOperation,
  Vec3,
  VelocityOperation,
} from '../model/types'
import type { NumericBackend } from '../numerics/types'
import type { AttackConfigurationIssue } from './attackValidation'
import type { SuccessfulDirectionProviderResolution } from './directionProvider'
import { je26_3PlayerOwnedBowArrowMechanics } from '../data/je26_3'
import { lengthVec3, normalizeHorizontalVector } from '../model/vectors'
import {
  addFiniteIssue,
  addFiniteVec3Issues,
  validateSulfurCubeKnockbackContext,
} from './attackValidation'
import { resolveDirectionProvider } from './directionProvider'

export type PlayerOwnedBowArrowProjectileKind = 'ordinaryArrow' | 'spectralArrow'

export interface PlayerOwnedBowArrowAttackConfiguration {
  readonly family: 'playerOwnedBowArrow'
  readonly projectileKind: PlayerOwnedBowArrowProjectileKind
  /** Integer bow-use duration. Values at or above 20 all derive full bow power. */
  readonly drawTicks: number
  /** Stored enchantment level. Zero means absent. */
  readonly powerLevel: number
  /** Stored enchantment level. Zero means absent. */
  readonly punchLevel: number
  /** Required exactly when the source-derived full-draw critical flag is true. */
  readonly criticalBonusRoll: number | null
  /** Current projectile DeltaMovement sampled when the declared impact is processed. */
  readonly impactMotion: Vec3
  /** Diagnostic only. Projectile position is not consumed by this family. */
  readonly projectileFeetPosition: Vec3 | null
}

export interface PlayerOwnedArrowDamageSourceConfiguration {
  readonly damageType: 'minecraft:arrow'
  readonly directEntityRole: 'projectile'
  readonly causingEntityRole: 'resolvedOwner'
  readonly directEntityFamily: 'arrow' | 'spectralArrow'
  readonly causingEntityFamily: 'player'
  readonly resolvedSourcePositionKind: 'directEntityFeet'
  readonly ownerFallback: 'arrowSelfOutsideFamily'
  readonly suppressesDefaultKnockback: false
  readonly defaultDirectionProviderId: 'projectileMotion'
}

export interface PlayerOwnedBowArrowMechanicsParameters {
  readonly minimumDrawTicks: number
  readonly drawTimeDivisor: number
  readonly drawLinearFactor: number
  readonly drawCurveDivisor: number
  readonly maximumBowPower: number
  readonly nominalSpeedScale: number
  readonly storedBaseDamage: number
  readonly maximumIntegerDamage: number
  readonly firstPowerLevelDamageAddition: number
  readonly additionalPowerLevelDamageAddition: number
  readonly maximumDecodedEnchantmentLevel: number
  readonly ordinarySurvivalPowerMaximum: number
  readonly ordinarySurvivalPunchMaximum: number
  readonly punchHorizontalScale: number
  readonly punchVerticalAddition: number
}

export interface ResolvedPlayerOwnedBowArrowShot {
  readonly bowPower: number
  readonly nominalLaunchSpeed: number
  readonly critical: boolean
  readonly impactSpeed: number
  readonly storedBaseDamage: number
  readonly powerDamageAddition: number
  readonly modifiedBaseDamage: number
  readonly preCriticalDamage: number
  readonly criticalBonusRoll: number
  readonly criticalRollMinimum: number | null
  readonly criticalRollMaximum: number | null
  readonly integerDamage: number
  /** Float damage passed into the sulfur-cube knockback call, not health lost. */
  readonly damageArgument: number
}

export type PlayerOwnedBowArrowAvailabilityIssue =
  | {
      readonly code: 'powerAboveSurvivalMaximum'
      readonly selected: number
      readonly maximum: number
    }
  | {
      readonly code: 'punchAboveSurvivalMaximum'
      readonly selected: number
      readonly maximum: number
    }

export interface PlayerOwnedBowArrowAvailability {
  readonly classification: 'ordinarySurvival' | 'mechanicallyEvaluableSynthetic'
  readonly issues: readonly PlayerOwnedBowArrowAvailabilityIssue[]
  /** The declared impact is evaluated without claiming that its preceding path is reachable. */
  readonly impactPathReachability: 'notVerified'
}

export type PlayerOwnedBowArrowOmittedOperationDiagnostic =
  | {
      readonly kind: 'sulfurCubeKnockbackCall'
      readonly reason: 'zeroDamageProducedZeroAddition'
    }
  | {
      readonly kind: 'directPush'
      readonly reason: 'noPositivePunchKnockback' | 'horizontalMotionBelowNormalizationCutoff'
    }

export interface PlayerOwnedBowArrowAttackDiagnostics {
  readonly damageSource: PlayerOwnedArrowDamageSourceConfiguration
  readonly shot: ResolvedPlayerOwnedBowArrowShot
  readonly directionResolutions: readonly [SuccessfulDirectionProviderResolution]
  readonly ownerResolution: 'resolvedPlayer'
  readonly ownerAliveRequired: false
  readonly ownerSameDimensionRequired: false
  readonly declaredImpact: true
  readonly collisionPointUsed: false
  readonly projectilePositionUsed: false
  readonly projectileFeetPosition: Vec3 | null
  readonly hurtResult: true
  readonly healthDamageApplied: false
  readonly sulfurCallExecuted: true
  readonly punch: {
    readonly modifiedKnockback: number
    readonly resistanceFactor: number
    readonly horizontalMotionLength: number
    readonly normalizedDirection: Vec3 | null
    readonly addedVelocity: Vec3 | null
  }
  readonly omittedOperations: readonly PlayerOwnedBowArrowOmittedOperationDiagnostic[]
  readonly survivalAvailability: PlayerOwnedBowArrowAvailability
}

type NonEmptyReadonlyArray<T> = readonly [T, ...T[]]

export interface SuccessfulPlayerOwnedBowArrowAttackResolution {
  readonly status: 'success'
  readonly family: 'playerOwnedBowArrow'
  readonly operations: NonEmptyReadonlyArray<VelocityOperation>
  readonly diagnostics: PlayerOwnedBowArrowAttackDiagnostics
}

export interface NoOperationPlayerOwnedBowArrowAttackResolution {
  readonly status: 'noOperation'
  readonly family: 'playerOwnedBowArrow'
  readonly operations: readonly []
  readonly reason: 'allVelocityAdditionsZeroOrOmitted'
  readonly diagnostics: PlayerOwnedBowArrowAttackDiagnostics
}

export interface InvalidPlayerOwnedBowArrowAttackResolution {
  readonly status: 'invalid'
  readonly family: 'playerOwnedBowArrow'
  readonly operations: readonly []
  readonly issues: readonly AttackConfigurationIssue[]
  readonly diagnostics: null
}

export type PlayerOwnedBowArrowAttackResolution =
  | SuccessfulPlayerOwnedBowArrowAttackResolution
  | NoOperationPlayerOwnedBowArrowAttackResolution
  | InvalidPlayerOwnedBowArrowAttackResolution

function cloneVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z }
}

function cloneContext(context: SulfurCubeKnockbackContext): SulfurCubeKnockbackContext {
  return {
    attacker: {
      feetPosition: cloneVec3(context.attacker.feetPosition),
      eyePosition: cloneVec3(context.attacker.eyePosition),
      lookDirection: cloneVec3(context.attacker.lookDirection),
    },
    cube: {
      feetPosition: cloneVec3(context.cube.feetPosition),
      dimensions: { ...context.cube.dimensions },
    },
    properties: { ...context.properties },
    mechanics: { ...context.mechanics },
  }
}

function sourceMultiply(left: number, right: number, numerics: NumericBackend): number {
  return numerics.sourceFloat(numerics.sourceFloat(left) * numerics.sourceFloat(right))
}

function sourceAdd(left: number, right: number, numerics: NumericBackend): number {
  return numerics.sourceFloat(numerics.sourceFloat(left) + numerics.sourceFloat(right))
}

function validateMechanics(
  mechanics: PlayerOwnedBowArrowMechanicsParameters,
): AttackConfigurationIssue[] {
  const issues: AttackConfigurationIssue[] = []

  for (const [name, value] of Object.entries(mechanics)) {
    addFiniteIssue(issues, value, `mechanics.${name}`)
  }
  if (mechanics.minimumDrawTicks < 0) {
    issues.push({
      path: 'mechanics.minimumDrawTicks',
      code: 'invalidMechanics',
      message: 'mechanics.minimumDrawTicks must not be negative',
    })
  }
  for (const name of ['drawTimeDivisor', 'drawCurveDivisor'] as const) {
    if (mechanics[name] <= 0) {
      issues.push({
        path: `mechanics.${name}`,
        code: 'invalidMechanics',
        message: `mechanics.${name} must be positive`,
      })
    }
  }
  if (mechanics.maximumIntegerDamage < 0 || !Number.isInteger(mechanics.maximumIntegerDamage)) {
    issues.push({
      path: 'mechanics.maximumIntegerDamage',
      code: 'invalidMechanics',
      message: 'mechanics.maximumIntegerDamage must be a nonnegative integer',
    })
  }

  return issues
}

function validateConfiguration(
  configuration: PlayerOwnedBowArrowAttackConfiguration,
  context: SulfurCubeKnockbackContext,
  mechanics: PlayerOwnedBowArrowMechanicsParameters,
): AttackConfigurationIssue[] {
  const issues = [...validateSulfurCubeKnockbackContext(context), ...validateMechanics(mechanics)]

  addFiniteIssue(issues, configuration.drawTicks, 'drawTicks')
  if (Number.isFinite(configuration.drawTicks) && !Number.isInteger(configuration.drawTicks)) {
    issues.push({ path: 'drawTicks', code: 'notInteger', message: 'drawTicks must be an integer' })
  } else if (
    Number.isInteger(configuration.drawTicks) &&
    configuration.drawTicks < mechanics.minimumDrawTicks
  ) {
    issues.push({
      path: 'drawTicks',
      code: 'outOfRange',
      message: `drawTicks must be at least ${mechanics.minimumDrawTicks}`,
    })
  }

  for (const name of ['powerLevel', 'punchLevel'] as const) {
    const value = configuration[name]
    addFiniteIssue(issues, value, name)
    if (Number.isFinite(value) && !Number.isInteger(value)) {
      issues.push({ path: name, code: 'notInteger', message: `${name} must be an integer` })
    } else if (
      Number.isInteger(value) &&
      (value < 0 || value > mechanics.maximumDecodedEnchantmentLevel)
    ) {
      issues.push({
        path: name,
        code: 'outOfRange',
        message: `${name} must be between 0 and ${mechanics.maximumDecodedEnchantmentLevel}`,
      })
    }
  }

  addFiniteVec3Issues(issues, configuration.impactMotion, 'impactMotion')
  if (configuration.projectileFeetPosition !== null) {
    addFiniteVec3Issues(issues, configuration.projectileFeetPosition, 'projectileFeetPosition')
  }
  if (
    configuration.projectileKind !== 'ordinaryArrow' &&
    configuration.projectileKind !== 'spectralArrow'
  ) {
    issues.push({
      path: 'projectileKind',
      code: 'outOfRange',
      message: 'projectileKind must be ordinaryArrow or spectralArrow',
    })
  }

  return issues
}

function deriveBowPower(
  drawTicks: number,
  mechanics: PlayerOwnedBowArrowMechanicsParameters,
  numerics: NumericBackend,
): number {
  const drawFraction = numerics.sourceFloat(
    drawTicks / numerics.sourceFloat(mechanics.drawTimeDivisor),
  )
  const squared = sourceMultiply(drawFraction, drawFraction, numerics)
  const linear = sourceMultiply(drawFraction, mechanics.drawLinearFactor, numerics)
  const curved = numerics.sourceFloat(
    sourceAdd(squared, linear, numerics) / numerics.sourceFloat(mechanics.drawCurveDivisor),
  )

  return Math.min(curved, numerics.sourceFloat(mechanics.maximumBowPower))
}

function deriveShotWithoutCriticalValidation(
  configuration: PlayerOwnedBowArrowAttackConfiguration,
  mechanics: PlayerOwnedBowArrowMechanicsParameters,
  numerics: NumericBackend,
): ResolvedPlayerOwnedBowArrowShot {
  const bowPower = deriveBowPower(configuration.drawTicks, mechanics, numerics)
  const critical = bowPower === numerics.sourceFloat(mechanics.maximumBowPower)
  const impactSpeed = numerics.sourceFloat(lengthVec3(configuration.impactMotion, numerics))
  const powerDamageAddition =
    configuration.powerLevel === 0
      ? 0
      : sourceAdd(
          mechanics.firstPowerLevelDamageAddition,
          sourceMultiply(
            configuration.powerLevel - 1,
            mechanics.additionalPowerLevelDamageAddition,
            numerics,
          ),
          numerics,
        )
  const modifiedBaseDamage = sourceAdd(mechanics.storedBaseDamage, powerDamageAddition, numerics)
  const preCriticalDamage = Math.ceil(
    numerics.clamp(impactSpeed * modifiedBaseDamage, 0, mechanics.maximumIntegerDamage),
  )
  const criticalRollMaximum = critical ? Math.floor(preCriticalDamage / 2) + 1 : null
  const criticalBonusRoll = critical ? (configuration.criticalBonusRoll ?? 0) : 0
  const integerDamage = Math.min(
    preCriticalDamage + criticalBonusRoll,
    mechanics.maximumIntegerDamage,
  )

  return {
    bowPower,
    nominalLaunchSpeed: sourceMultiply(bowPower, mechanics.nominalSpeedScale, numerics),
    critical,
    impactSpeed,
    storedBaseDamage: mechanics.storedBaseDamage,
    powerDamageAddition,
    modifiedBaseDamage,
    preCriticalDamage,
    criticalBonusRoll,
    criticalRollMinimum: critical ? 0 : null,
    criticalRollMaximum,
    integerDamage,
    damageArgument: numerics.sourceFloat(integerDamage),
  }
}

function validateCriticalRoll(
  configuredRoll: number | null,
  shot: ResolvedPlayerOwnedBowArrowShot,
): AttackConfigurationIssue[] {
  if (!shot.critical) {
    return configuredRoll === null
      ? []
      : [
          {
            path: 'criticalBonusRoll',
            code: 'outOfRange',
            message: 'criticalBonusRoll must be null for a noncritical bow arrow',
          },
        ]
  }
  if (configuredRoll === null) {
    return [
      {
        path: 'criticalBonusRoll',
        code: 'outOfRange',
        message: 'criticalBonusRoll is required for a critical bow arrow',
      },
    ]
  }
  if (!Number.isFinite(configuredRoll)) {
    return [
      {
        path: 'criticalBonusRoll',
        code: 'nonFinite',
        message: 'criticalBonusRoll must be finite',
      },
    ]
  }
  if (!Number.isInteger(configuredRoll)) {
    return [
      {
        path: 'criticalBonusRoll',
        code: 'notInteger',
        message: 'criticalBonusRoll must be an integer',
      },
    ]
  }
  if (configuredRoll < 0 || configuredRoll > (shot.criticalRollMaximum ?? -1)) {
    return [
      {
        path: 'criticalBonusRoll',
        code: 'outOfRange',
        message: `criticalBonusRoll must be between 0 and ${shot.criticalRollMaximum}`,
      },
    ]
  }

  return []
}

function resolveAvailability(
  configuration: PlayerOwnedBowArrowAttackConfiguration,
  mechanics: PlayerOwnedBowArrowMechanicsParameters,
): PlayerOwnedBowArrowAvailability {
  const issues: PlayerOwnedBowArrowAvailabilityIssue[] = []

  if (configuration.powerLevel > mechanics.ordinarySurvivalPowerMaximum) {
    issues.push({
      code: 'powerAboveSurvivalMaximum',
      selected: configuration.powerLevel,
      maximum: mechanics.ordinarySurvivalPowerMaximum,
    })
  }
  if (configuration.punchLevel > mechanics.ordinarySurvivalPunchMaximum) {
    issues.push({
      code: 'punchAboveSurvivalMaximum',
      selected: configuration.punchLevel,
      maximum: mechanics.ordinarySurvivalPunchMaximum,
    })
  }

  return {
    classification: issues.length === 0 ? 'ordinarySurvival' : 'mechanicallyEvaluableSynthetic',
    issues,
    impactPathReachability: 'notVerified',
  }
}

function requireProjectileDirection(
  configuration: PlayerOwnedBowArrowAttackConfiguration,
  numerics: NumericBackend,
): SuccessfulDirectionProviderResolution {
  const resolution = resolveDirectionProvider(
    {
      kind: 'implemented',
      providerId: 'projectileMotion',
      projectileMotion: configuration.impactMotion,
    },
    { degreesToRadians: 0 },
    numerics,
  )

  if (resolution.status !== 'success') {
    throw new Error('validated bow-arrow projectile direction did not resolve successfully')
  }

  return resolution
}

export function resolvePlayerOwnedBowArrowAttack(
  configuration: PlayerOwnedBowArrowAttackConfiguration,
  context: SulfurCubeKnockbackContext,
  numerics: NumericBackend,
  mechanics: PlayerOwnedBowArrowMechanicsParameters = je26_3PlayerOwnedBowArrowMechanics,
): PlayerOwnedBowArrowAttackResolution {
  const issues = validateConfiguration(configuration, context, mechanics)

  if (issues.length > 0) {
    return {
      status: 'invalid',
      family: configuration.family,
      operations: [],
      issues,
      diagnostics: null,
    }
  }

  const shot = deriveShotWithoutCriticalValidation(configuration, mechanics, numerics)
  const criticalIssues = validateCriticalRoll(configuration.criticalBonusRoll, shot)

  if (criticalIssues.length > 0) {
    return {
      status: 'invalid',
      family: configuration.family,
      operations: [],
      issues: criticalIssues,
      diagnostics: null,
    }
  }

  const directionResolution = requireProjectileDirection(configuration, numerics)
  const damageSource: PlayerOwnedArrowDamageSourceConfiguration = {
    damageType: 'minecraft:arrow',
    directEntityRole: 'projectile',
    causingEntityRole: 'resolvedOwner',
    directEntityFamily:
      configuration.projectileKind === 'ordinaryArrow' ? 'arrow' : 'spectralArrow',
    causingEntityFamily: 'player',
    resolvedSourcePositionKind: 'directEntityFeet',
    ownerFallback: 'arrowSelfOutsideFamily',
    suppressesDefaultKnockback: false,
    defaultDirectionProviderId: 'projectileMotion',
  }
  const operations: VelocityOperation[] = []
  const omittedOperations: PlayerOwnedBowArrowOmittedOperationDiagnostic[] = []

  if (shot.damageArgument > 0) {
    const sulfurOperation: SulfurCubeKnockbackOperation = {
      kind: 'sulfurCubeKnockbackCall',
      providerId: 'projectileMotion',
      call: {
        damageArgument: shot.damageArgument,
        horizontalBaseDirection: directionResolution.horizontalBaseDirection,
        scaling: { kind: 'ordinaryDamage' },
      },
      context: cloneContext(context),
      provenance: {
        sourceFamily: configuration.family,
        reason: 'acceptedBowArrowDamage',
        damageSourceType: damageSource.damageType,
      },
    }
    operations.push(sulfurOperation)
  } else {
    omittedOperations.push({
      kind: 'sulfurCubeKnockbackCall',
      reason: 'zeroDamageProducedZeroAddition',
    })
  }

  const modifiedKnockback = numerics.sourceFloat(configuration.punchLevel)
  const threshold = numerics.sourceFloat(context.mechanics.vectorNormalizationThreshold)
  const horizontalMotion = { x: configuration.impactMotion.x, z: configuration.impactMotion.z }
  const horizontalMotionLength = numerics.sqrt(
    horizontalMotion.x * horizontalMotion.x + horizontalMotion.z * horizontalMotion.z,
  )
  const normalizedHorizontalMotion = normalizeHorizontalVector(
    horizontalMotion,
    numerics,
    threshold,
  )
  const hasHorizontalDirection =
    normalizedHorizontalMotion.x !== 0 || normalizedHorizontalMotion.z !== 0
  const resistanceFactor = Math.max(0, 1 - context.properties.knockbackResistance)
  let punchAddedVelocity: Vec3 | null = null

  if (modifiedKnockback <= 0) {
    omittedOperations.push({ kind: 'directPush', reason: 'noPositivePunchKnockback' })
  } else if (!hasHorizontalDirection) {
    omittedOperations.push({
      kind: 'directPush',
      reason: 'horizontalMotionBelowNormalizationCutoff',
    })
  } else {
    const horizontalMagnitude =
      modifiedKnockback * mechanics.punchHorizontalScale * resistanceFactor
    punchAddedVelocity = {
      x: normalizedHorizontalMotion.x * horizontalMagnitude,
      y: mechanics.punchVerticalAddition,
      z: normalizedHorizontalMotion.z * horizontalMagnitude,
    }
    const punchOperation: DirectPushOperation = {
      kind: 'directPush',
      providerId: 'projectileWeaponKnockback',
      addedVelocity: punchAddedVelocity,
      provenance: {
        sourceFamily: configuration.family,
        reason: 'Punch weapon knockback after accepted arrow damage',
        damageSourceType: damageSource.damageType,
      },
    }
    operations.push(punchOperation)
  }

  const diagnostics: PlayerOwnedBowArrowAttackDiagnostics = {
    damageSource,
    shot,
    directionResolutions: [directionResolution],
    ownerResolution: 'resolvedPlayer',
    ownerAliveRequired: false,
    ownerSameDimensionRequired: false,
    declaredImpact: true,
    collisionPointUsed: false,
    projectilePositionUsed: false,
    projectileFeetPosition:
      configuration.projectileFeetPosition === null
        ? null
        : cloneVec3(configuration.projectileFeetPosition),
    hurtResult: true,
    healthDamageApplied: false,
    sulfurCallExecuted: true,
    punch: {
      modifiedKnockback,
      resistanceFactor,
      horizontalMotionLength,
      normalizedDirection: hasHorizontalDirection
        ? {
            x: normalizedHorizontalMotion.x,
            y: 0,
            z: normalizedHorizontalMotion.z,
          }
        : null,
      addedVelocity: punchAddedVelocity === null ? null : cloneVec3(punchAddedVelocity),
    },
    omittedOperations,
    survivalAvailability: resolveAvailability(configuration, mechanics),
  }

  if (operations.length === 0) {
    return {
      status: 'noOperation',
      family: configuration.family,
      operations: [],
      reason: 'allVelocityAdditionsZeroOrOmitted',
      diagnostics,
    }
  }

  return {
    status: 'success',
    family: configuration.family,
    operations: operations as [VelocityOperation, ...VelocityOperation[]],
    diagnostics,
  }
}
