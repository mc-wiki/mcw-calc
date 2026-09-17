import type {
  SulfurCubeKnockbackContext,
  SulfurCubeKnockbackOperation,
  Vec3,
  VelocityOperation,
} from '../model/types'
import type { NumericBackend } from '../numerics/types'
import type { AttackConfigurationIssue } from './attackValidation'
import type { SuccessfulDirectionProviderResolution } from './directionProvider'
import type {
  NoOperationPlayerOwnedBowArrowAttackResolution,
  PlayerOwnedArrowDamageSourceConfiguration,
  PlayerOwnedBowArrowAttackConfiguration,
  PlayerOwnedBowArrowAttackResolution,
  SuccessfulPlayerOwnedBowArrowAttackResolution,
} from './playerOwnedBowArrow'
import { je26_3PlayerMeleeMechanics } from '../data/je26_3'
import { addFiniteIssue, validateSulfurCubeKnockbackContext } from './attackValidation'
import { resolveDirectionProvider } from './directionProvider'
import { resolvePlayerOwnedBowArrowAttack } from './playerOwnedBowArrow'

export interface PlayerMeleeDamageSourceConfiguration {
  readonly damageType: 'minecraft:player_attack'
  readonly directEntityRole: 'attacker'
  readonly causingEntityRole: 'attacker'
  readonly directEntityFamily: 'player'
  readonly causingEntityFamily: 'player'
  readonly resolvedSourcePositionKind: 'directEntityFeet'
  readonly ownerFallback: 'notApplicable'
  readonly suppressesDefaultKnockback: false
  readonly defaultDirectionProviderId: 'nonProjectileSourcePosition'
}

export type DamageSourceConfiguration =
  | PlayerMeleeDamageSourceConfiguration
  | PlayerOwnedArrowDamageSourceConfiguration

export interface PlayerCriticalEligibilityState {
  readonly fallDistancePositive: boolean
  readonly onGround: boolean
  readonly onClimbable: boolean
  readonly inWater: boolean
  readonly mobilityRestricted: boolean
  readonly passenger: boolean
  readonly targetIsLiving: boolean
}

export interface PrimaryPlayerMeleeAttackConfiguration {
  readonly family: 'primaryPlayerMelee'
  /** Effective ATTACK_DAMAGE after attribute and held-item folding. */
  readonly effectiveAttackDamage: number
  /** Enchantment-only damage difference before attack-strength scaling. */
  readonly damageEnchantmentBonus: number
  /** Target-specific item bonus, such as future mace smash damage. */
  readonly itemSpecificDamageBonus: number
  readonly attackStrength: number
  readonly sprinting: boolean
  /** Effective ATTACK_KNOCKBACK before the Knockback enchantment. */
  readonly effectiveAttackKnockback: number
  readonly knockbackEnchantmentLevel: number
  readonly criticalEligibility: PlayerCriticalEligibilityState
  /** Minecraft yaw retained separately from the attacker's 3D look direction. */
  readonly attackerYawDegrees: number
}

export type DeferredPlayerAttackFamily =
  | 'playerSweep'
  | 'playerStab'
  | 'playerProjectile'
  | 'maceDirectTarget'
  | 'maceNearbyTarget'

export interface DeferredPlayerAttackConfiguration {
  readonly family: DeferredPlayerAttackFamily
}

export type AttackConfiguration =
  | PrimaryPlayerMeleeAttackConfiguration
  | PlayerOwnedBowArrowAttackConfiguration
  | DeferredPlayerAttackConfiguration

export interface PlayerMeleeMechanicsParameters {
  readonly baseDamageScale: number
  readonly strengthDamageScale: number
  readonly fullStrengthThreshold: number
  readonly criticalMultiplier: number
  readonly knockbackDivisor: number
  readonly sprintKnockbackBonus: number
  readonly knockbackPerEnchantmentLevel: number
  readonly maximumDecodedEnchantmentLevel: number
  readonly degreesToRadians: number
}

export type CriticalEligibilityFailure =
  | 'notFullStrength'
  | 'noPositiveFallDistance'
  | 'onGround'
  | 'onClimbable'
  | 'inWater'
  | 'mobilityRestricted'
  | 'passenger'
  | 'sprinting'
  | 'targetNotLiving'

export interface OmittedVelocityOperationDiagnostic {
  readonly kind: 'sulfurCubeKnockbackCall'
  readonly reason: 'combinedKnockbackNotPositive'
}

export interface PlayerMeleeAttackDiagnostics {
  readonly damageSource: PlayerMeleeDamageSourceConfiguration
  readonly directionResolutions: readonly SuccessfulDirectionProviderResolution[]
  readonly attackStrength: number
  readonly attackStrengthSquared: number
  readonly baseDamageScale: number
  readonly effectiveAttackDamage: number
  readonly scaledBaseDamage: number
  readonly damageEnchantmentBonus: number
  readonly magicBoost: number
  readonly itemSpecificDamageBonus: number
  readonly baseDamageBeforeCritical: number
  readonly fullStrength: boolean
  readonly critical: boolean
  readonly criticalEligibilityFailures: readonly CriticalEligibilityFailure[]
  readonly damageAfterCritical: number
  /** Damage passed to knockback; it is not health lost. */
  readonly damageArgument: number
  readonly enchantmentKnockbackAddition: number
  readonly knockbackBeforeHalving: number
  readonly knockbackAfterHalving: number
  readonly sprintKnockbackBonus: number
  readonly combinedKnockback: number
  readonly effectFactor: number
  readonly damageSourceObjectReused: boolean
  readonly hurtResult: boolean
  readonly healthDamageApplied: boolean
  readonly attackerHorizontalVelocityMultiplierAfterExtraCall: number | null
  readonly attackerSprintCleared: boolean
  readonly omittedOperations: readonly OmittedVelocityOperationDiagnostic[]
}

type NonEmptyReadonlyArray<T> = readonly [T, ...T[]]

export interface SuccessfulAttackResolution {
  readonly status: 'success'
  readonly family: 'primaryPlayerMelee'
  readonly operations: NonEmptyReadonlyArray<VelocityOperation>
  readonly diagnostics: PlayerMeleeAttackDiagnostics
}

export interface NoOperationAttackResolution {
  readonly status: 'noOperation'
  readonly family: 'primaryPlayerMelee'
  readonly operations: readonly []
  readonly reason: 'nonPositiveDamage'
  readonly diagnostics: PlayerMeleeAttackDiagnostics
}

export interface UnsupportedAttackResolution {
  readonly status: 'unsupported'
  readonly family: DeferredPlayerAttackFamily
  readonly operations: readonly []
  readonly reason: 'familyNotImplemented'
  readonly diagnostics: null
}

export interface InvalidAttackResolution {
  readonly status: 'invalid'
  readonly family: AttackConfiguration['family']
  readonly operations: readonly []
  readonly issues: readonly AttackConfigurationIssue[]
  readonly diagnostics: null
}

export type AttackResolution =
  | SuccessfulAttackResolution
  | NoOperationAttackResolution
  | SuccessfulPlayerOwnedBowArrowAttackResolution
  | NoOperationPlayerOwnedBowArrowAttackResolution
  | UnsupportedAttackResolution
  | InvalidAttackResolution

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

function validateConfiguration(
  configuration: PrimaryPlayerMeleeAttackConfiguration,
  context: SulfurCubeKnockbackContext,
  mechanics: PlayerMeleeMechanicsParameters,
): AttackConfigurationIssue[] {
  const issues: AttackConfigurationIssue[] = []
  const nonnegativeInputs = [
    ['effectiveAttackDamage', configuration.effectiveAttackDamage],
    ['damageEnchantmentBonus', configuration.damageEnchantmentBonus],
    ['itemSpecificDamageBonus', configuration.itemSpecificDamageBonus],
    ['effectiveAttackKnockback', configuration.effectiveAttackKnockback],
  ] as const

  for (const [path, value] of nonnegativeInputs) {
    addFiniteIssue(issues, value, path)
    if (Number.isFinite(value) && value < 0) {
      issues.push({ path, code: 'outOfRange', message: `${path} must not be negative` })
    }
  }

  addFiniteIssue(issues, configuration.attackStrength, 'attackStrength')
  if (
    Number.isFinite(configuration.attackStrength) &&
    (configuration.attackStrength < 0 || configuration.attackStrength > 1)
  ) {
    issues.push({
      path: 'attackStrength',
      code: 'outOfRange',
      message: 'attackStrength must be between 0 and 1',
    })
  }

  addFiniteIssue(issues, configuration.knockbackEnchantmentLevel, 'knockbackEnchantmentLevel')
  if (
    Number.isFinite(configuration.knockbackEnchantmentLevel) &&
    !Number.isInteger(configuration.knockbackEnchantmentLevel)
  ) {
    issues.push({
      path: 'knockbackEnchantmentLevel',
      code: 'notInteger',
      message: 'knockbackEnchantmentLevel must be an integer',
    })
  } else if (
    Number.isInteger(configuration.knockbackEnchantmentLevel) &&
    configuration.knockbackEnchantmentLevel < 0
  ) {
    issues.push({
      path: 'knockbackEnchantmentLevel',
      code: 'outOfRange',
      message: 'knockbackEnchantmentLevel must not be negative',
    })
  } else if (
    Number.isInteger(configuration.knockbackEnchantmentLevel) &&
    configuration.knockbackEnchantmentLevel > mechanics.maximumDecodedEnchantmentLevel
  ) {
    issues.push({
      path: 'knockbackEnchantmentLevel',
      code: 'outOfRange',
      message: `knockbackEnchantmentLevel must not exceed ${mechanics.maximumDecodedEnchantmentLevel}`,
    })
  }

  addFiniteIssue(issues, configuration.attackerYawDegrees, 'attackerYawDegrees')

  issues.push(...validateSulfurCubeKnockbackContext(context))

  for (const [name, value] of Object.entries(mechanics)) {
    addFiniteIssue(issues, value, `mechanics.${name}`)
  }
  if (mechanics.knockbackDivisor <= 0) {
    issues.push({
      path: 'mechanics.knockbackDivisor',
      code: 'invalidMechanics',
      message: 'mechanics.knockbackDivisor must be positive',
    })
  }

  return issues
}

function deriveCriticalFailures(
  fullStrength: boolean,
  sprinting: boolean,
  state: PlayerCriticalEligibilityState,
): CriticalEligibilityFailure[] {
  const failures: CriticalEligibilityFailure[] = []
  if (!fullStrength) failures.push('notFullStrength')
  if (!state.fallDistancePositive) failures.push('noPositiveFallDistance')
  if (state.onGround) failures.push('onGround')
  if (state.onClimbable) failures.push('onClimbable')
  if (state.inWater) failures.push('inWater')
  if (state.mobilityRestricted) failures.push('mobilityRestricted')
  if (state.passenger) failures.push('passenger')
  if (sprinting) failures.push('sprinting')
  if (!state.targetIsLiving) failures.push('targetNotLiving')
  return failures
}

function sourceMultiply(left: number, right: number, numerics: NumericBackend): number {
  return numerics.sourceFloat(numerics.sourceFloat(left) * numerics.sourceFloat(right))
}

function sourceAdd(left: number, right: number, numerics: NumericBackend): number {
  return numerics.sourceFloat(numerics.sourceFloat(left) + numerics.sourceFloat(right))
}

function requireSuccessfulDirectionResolution(
  resolution: ReturnType<typeof resolveDirectionProvider>,
): SuccessfulDirectionProviderResolution {
  if (resolution.status !== 'success') {
    throw new Error('validated player-melee direction provider did not resolve successfully')
  }

  return resolution
}

export function resolvePrimaryPlayerMeleeAttack(
  configuration: PrimaryPlayerMeleeAttackConfiguration,
  context: SulfurCubeKnockbackContext,
  mechanics: PlayerMeleeMechanicsParameters,
  numerics: NumericBackend,
): SuccessfulAttackResolution | NoOperationAttackResolution | InvalidAttackResolution {
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

  const attackStrength = numerics.sourceFloat(configuration.attackStrength)
  const attackStrengthSquared = sourceMultiply(attackStrength, attackStrength, numerics)
  const scaledStrengthTerm = sourceMultiply(
    mechanics.strengthDamageScale,
    attackStrengthSquared,
    numerics,
  )
  const baseDamageScale = sourceAdd(mechanics.baseDamageScale, scaledStrengthTerm, numerics)
  const effectiveAttackDamage = numerics.sourceFloat(configuration.effectiveAttackDamage)
  const scaledBaseDamage = sourceMultiply(effectiveAttackDamage, baseDamageScale, numerics)
  const damageEnchantmentBonus = numerics.sourceFloat(configuration.damageEnchantmentBonus)
  const magicBoost = sourceMultiply(damageEnchantmentBonus, attackStrength, numerics)
  const itemSpecificDamageBonus = numerics.sourceFloat(configuration.itemSpecificDamageBonus)
  const baseDamageBeforeCritical = sourceAdd(scaledBaseDamage, itemSpecificDamageBonus, numerics)
  const fullStrength = attackStrength > numerics.sourceFloat(mechanics.fullStrengthThreshold)
  const criticalEligibilityFailures = deriveCriticalFailures(
    fullStrength,
    configuration.sprinting,
    configuration.criticalEligibility,
  )
  const critical = criticalEligibilityFailures.length === 0
  const damageAfterCritical = critical
    ? sourceMultiply(baseDamageBeforeCritical, mechanics.criticalMultiplier, numerics)
    : baseDamageBeforeCritical
  const damageArgument = sourceAdd(damageAfterCritical, magicBoost, numerics)

  const enchantmentKnockbackAddition = sourceMultiply(
    configuration.knockbackEnchantmentLevel,
    mechanics.knockbackPerEnchantmentLevel,
    numerics,
  )
  const knockbackBeforeHalving = sourceAdd(
    configuration.effectiveAttackKnockback,
    enchantmentKnockbackAddition,
    numerics,
  )
  const knockbackAfterHalving = numerics.sourceFloat(
    knockbackBeforeHalving / numerics.sourceFloat(mechanics.knockbackDivisor),
  )
  const sprintKnockbackBonus =
    configuration.sprinting && fullStrength
      ? numerics.sourceFloat(mechanics.sprintKnockbackBonus)
      : 0
  const combinedKnockback = sourceAdd(knockbackAfterHalving, sprintKnockbackBonus, numerics)
  const effectFactor = sourceMultiply(combinedKnockback, 0.25, numerics)
  const hasExtraCall = combinedKnockback > 0
  const damageSource: PlayerMeleeDamageSourceConfiguration = {
    damageType: 'minecraft:player_attack',
    directEntityRole: 'attacker',
    causingEntityRole: 'attacker',
    directEntityFamily: 'player',
    causingEntityFamily: 'player',
    resolvedSourcePositionKind: 'directEntityFeet',
    ownerFallback: 'notApplicable',
    suppressesDefaultKnockback: false,
    defaultDirectionProviderId: 'nonProjectileSourcePosition',
  }
  const ordinaryDirectionResolution = requireSuccessfulDirectionResolution(
    resolveDirectionProvider(
      {
        kind: 'implemented',
        providerId: 'nonProjectileSourcePosition',
        sourcePosition: context.attacker.feetPosition,
        cubeFeetPosition: context.cube.feetPosition,
      },
      mechanics,
      numerics,
    ),
  )
  const effectDirectionResolution = hasExtraCall
    ? requireSuccessfulDirectionResolution(
        resolveDirectionProvider(
          {
            kind: 'implemented',
            providerId: 'callerYaw',
            callerYawDegrees: configuration.attackerYawDegrees,
          },
          mechanics,
          numerics,
        ),
      )
    : null
  const diagnostics: PlayerMeleeAttackDiagnostics = {
    damageSource,
    directionResolutions:
      effectDirectionResolution === null
        ? [ordinaryDirectionResolution]
        : [ordinaryDirectionResolution, effectDirectionResolution],
    attackStrength,
    attackStrengthSquared,
    baseDamageScale,
    effectiveAttackDamage,
    scaledBaseDamage,
    damageEnchantmentBonus,
    magicBoost,
    itemSpecificDamageBonus,
    baseDamageBeforeCritical,
    fullStrength,
    critical,
    criticalEligibilityFailures,
    damageAfterCritical,
    damageArgument,
    enchantmentKnockbackAddition,
    knockbackBeforeHalving,
    knockbackAfterHalving,
    sprintKnockbackBonus,
    combinedKnockback,
    effectFactor,
    damageSourceObjectReused: hasExtraCall,
    hurtResult: damageAfterCritical > 0 || magicBoost > 0,
    healthDamageApplied: false,
    attackerHorizontalVelocityMultiplierAfterExtraCall: hasExtraCall ? 0.6 : null,
    attackerSprintCleared: hasExtraCall,
    omittedOperations: hasExtraCall
      ? []
      : [{ kind: 'sulfurCubeKnockbackCall', reason: 'combinedKnockbackNotPositive' }],
  }

  if (!diagnostics.hurtResult) {
    return {
      status: 'noOperation',
      family: configuration.family,
      operations: [],
      reason: 'nonPositiveDamage',
      diagnostics,
    }
  }

  const ordinaryOperation: SulfurCubeKnockbackOperation = {
    kind: 'sulfurCubeKnockbackCall',
    providerId: 'nonProjectileSourcePosition',
    call: {
      damageArgument,
      horizontalBaseDirection: ordinaryDirectionResolution.horizontalBaseDirection,
      scaling: { kind: 'ordinaryDamage' },
    },
    context: cloneContext(context),
    provenance: {
      sourceFamily: configuration.family,
      reason: 'ordinaryAcceptedHit',
      damageSourceType: damageSource.damageType,
    },
  }

  if (!hasExtraCall) {
    return {
      status: 'success',
      family: configuration.family,
      operations: [ordinaryOperation],
      diagnostics,
    }
  }

  if (effectDirectionResolution === null) {
    throw new Error('positive combined knockback did not produce a caller-yaw direction')
  }
  const effectOperation: SulfurCubeKnockbackOperation = {
    kind: 'sulfurCubeKnockbackCall',
    providerId: 'callerYaw',
    call: {
      damageArgument,
      horizontalBaseDirection: effectDirectionResolution.horizontalBaseDirection,
      scaling: { kind: 'extraKnockbackEffect', powerArgument: combinedKnockback },
    },
    context: cloneContext(context),
    provenance: {
      sourceFamily: configuration.family,
      reason: 'combinedKnockbackAndSprint',
      damageSourceType: damageSource.damageType,
    },
  }

  return {
    status: 'success',
    family: configuration.family,
    operations: [ordinaryOperation, effectOperation],
    diagnostics,
  }
}

export function resolveAttackConfiguration(
  configuration: PrimaryPlayerMeleeAttackConfiguration,
  context: SulfurCubeKnockbackContext,
  numerics: NumericBackend,
  mechanics?: PlayerMeleeMechanicsParameters,
): SuccessfulAttackResolution | NoOperationAttackResolution | InvalidAttackResolution
export function resolveAttackConfiguration(
  configuration: PlayerOwnedBowArrowAttackConfiguration,
  context: SulfurCubeKnockbackContext,
  numerics: NumericBackend,
): PlayerOwnedBowArrowAttackResolution
export function resolveAttackConfiguration(
  configuration: DeferredPlayerAttackConfiguration,
  context: SulfurCubeKnockbackContext,
  numerics: NumericBackend,
): UnsupportedAttackResolution
export function resolveAttackConfiguration(
  configuration: AttackConfiguration,
  context: SulfurCubeKnockbackContext,
  numerics: NumericBackend,
  mechanics: PlayerMeleeMechanicsParameters = je26_3PlayerMeleeMechanics,
): AttackResolution {
  if (configuration.family === 'primaryPlayerMelee') {
    return resolvePrimaryPlayerMeleeAttack(configuration, context, mechanics, numerics)
  }

  if (configuration.family === 'playerOwnedBowArrow') {
    return resolvePlayerOwnedBowArrowAttack(configuration, context, numerics)
  }

  return {
    status: 'unsupported',
    family: configuration.family,
    operations: [],
    reason: 'familyNotImplemented',
    diagnostics: null,
  }
}
