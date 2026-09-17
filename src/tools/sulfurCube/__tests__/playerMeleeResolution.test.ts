import type { DeferredPlayerAttackFamily } from '../resolution'
import { describe, expect, it } from 'vitest'
import { applyVelocityOperations } from '../model/velocityOperations'
import { standardNumerics } from '../numerics/standard'
import { resolveAttackConfiguration } from '../resolution'
import {
  airborneCriticalEligibility,
  createAcceptedPlayerMeleeContext,
  createPrimaryPlayerMeleeConfiguration,
  knockbackCombinationFixtures,
  playerMeleeFixtureProvenance,
  playerMeleeVelocityFixtures,
} from './playerMeleeFixtures'

const javaFixtureTolerance = 0.0001

describe('primary player melee attack resolution', () => {
  it.each(playerMeleeVelocityFixtures)('matches $id', (fixture) => {
    const resolution = resolveAttackConfiguration(
      fixture.configuration,
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return

    expect(resolution.operations).toHaveLength(fixture.expected.operationCount)
    expect(resolution.diagnostics.fullStrength).toBe(fixture.expected.fullStrength)
    expect(resolution.diagnostics.critical).toBe(fixture.expected.critical)
    expect(resolution.diagnostics.damageArgument).toBeCloseTo(fixture.expected.damageArgument, 5)
    expect(resolution.diagnostics.combinedKnockback).toBeCloseTo(
      fixture.expected.combinedKnockback,
      7,
    )
    expect(resolution.diagnostics.effectFactor).toBeCloseTo(fixture.expected.effectFactor, 7)

    const sequence = applyVelocityOperations(
      { x: 0, y: 0, z: 0 },
      resolution.operations,
      standardNumerics,
    )
    expect(Math.abs(sequence.resultingVelocity.x - fixture.expected.finalVelocity.x)).toBeLessThan(
      javaFixtureTolerance,
    )
    expect(Math.abs(sequence.resultingVelocity.y - fixture.expected.finalVelocity.y)).toBeLessThan(
      javaFixtureTolerance,
    )
    expect(Math.abs(sequence.resultingVelocity.z - fixture.expected.finalVelocity.z)).toBeLessThan(
      javaFixtureTolerance,
    )
  })

  it('keeps ordinary and combined-effect calls separate and ordered', () => {
    const resolution = resolveAttackConfiguration(
      createPrimaryPlayerMeleeConfiguration({
        sprinting: true,
        knockbackEnchantmentLevel: 2,
      }),
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return

    expect(resolution.operations).toHaveLength(2)
    const [ordinary, effect] = resolution.operations
    expect(ordinary.kind).toBe('sulfurCubeKnockbackCall')
    expect(effect.kind).toBe('sulfurCubeKnockbackCall')
    if (ordinary.kind !== 'sulfurCubeKnockbackCall') return
    if (effect.kind !== 'sulfurCubeKnockbackCall') return

    expect(ordinary.providerId).toBe('nonProjectileSourcePosition')
    expect(ordinary.call.horizontalBaseDirection).toEqual({ x: 0, z: 1.5 })
    expect(ordinary.call.scaling).toEqual({ kind: 'ordinaryDamage' })
    expect(effect.providerId).toBe('callerYaw')
    expect(effect.call.scaling).toEqual({
      kind: 'extraKnockbackEffect',
      powerArgument: 1.5,
    })
    expect(Math.abs(effect.call.horizontalBaseDirection.x - 0.3651668)).toBeLessThan(
      javaFixtureTolerance,
    )
    expect(Math.abs(effect.call.horizontalBaseDirection.z - 0.9309421)).toBeLessThan(
      javaFixtureTolerance,
    )
    expect(effect.call.damageArgument).toBe(ordinary.call.damageArgument)
    expect(resolution.diagnostics.damageSource).toMatchObject({
      directEntityFamily: 'player',
      causingEntityFamily: 'player',
      resolvedSourcePositionKind: 'directEntityFeet',
      ownerFallback: 'notApplicable',
      suppressesDefaultKnockback: false,
      defaultDirectionProviderId: 'nonProjectileSourcePosition',
    })
    expect(resolution.diagnostics.directionResolutions.map((entry) => entry.providerId)).toEqual([
      'nonProjectileSourcePosition',
      'callerYaw',
    ])
    expect(ordinary.context).not.toBe(effect.context)
    expect(ordinary.context).toEqual(effect.context)

    const sequence = applyVelocityOperations(
      { x: 0, y: 0, z: 0 },
      resolution.operations,
      standardNumerics,
    )
    expect(sequence.operationResults[1].existingVelocity).toEqual(
      sequence.operationResults[0].resultingVelocity,
    )
    const effectResult = sequence.operationResults[1]
    expect(effectResult.kind).toBe('sulfurCubeKnockbackCall')
    if (effectResult.kind !== 'sulfurCubeKnockbackCall') return
    expect(effectResult.knockbackResult.diagnostics.effectFactor).toBe(0.375)
  })

  it.each(knockbackCombinationFixtures)(
    'folds $id into at most one combined extra call',
    (fixture) => {
      const resolution = resolveAttackConfiguration(
        createPrimaryPlayerMeleeConfiguration({
          sprinting: fixture.sprinting,
          knockbackEnchantmentLevel: fixture.knockbackEnchantmentLevel,
        }),
        createAcceptedPlayerMeleeContext(),
        standardNumerics,
      )

      expect(resolution.status).toBe('success')
      if (resolution.status !== 'success') return
      expect(resolution.operations).toHaveLength(fixture.operationCount)
      expect(resolution.diagnostics.combinedKnockback).toBe(fixture.combinedKnockback)
      expect(
        resolution.operations.filter(
          (operation) =>
            operation.kind === 'sulfurCubeKnockbackCall' &&
            operation.call.scaling.kind === 'extraKnockbackEffect',
        ),
      ).toHaveLength(fixture.operationCount - 1)
    },
  )

  it('derives critical status and does not apply its multiplier to magic boost', () => {
    const resolution = resolveAttackConfiguration(
      createPrimaryPlayerMeleeConfiguration({
        damageEnchantmentBonus: 2,
        criticalEligibility: airborneCriticalEligibility,
      }),
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.diagnostics.critical).toBe(true)
    expect(resolution.diagnostics.damageAfterCritical).toBe(9)
    expect(resolution.diagnostics.magicBoost).toBe(2)
    expect(resolution.diagnostics.damageArgument).toBe(11)
  })

  it('records why otherwise eligible airborne sprinting is not critical', () => {
    const resolution = resolveAttackConfiguration(
      createPrimaryPlayerMeleeConfiguration({
        sprinting: true,
        criticalEligibility: airborneCriticalEligibility,
      }),
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.diagnostics.critical).toBe(false)
    expect(resolution.diagnostics.criticalEligibilityFailures).toEqual(['sprinting'])
  })

  it('returns a valid no-operation result for nonpositive damage', () => {
    const resolution = resolveAttackConfiguration(
      createPrimaryPlayerMeleeConfiguration({ effectiveAttackDamage: 0 }),
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )

    expect(resolution).toMatchObject({
      status: 'noOperation',
      family: 'primaryPlayerMelee',
      operations: [],
      reason: 'nonPositiveDamage',
    })
  })

  it('distinguishes invalid configuration from no operation', () => {
    const resolution = resolveAttackConfiguration(
      createPrimaryPlayerMeleeConfiguration({ attackStrength: Number.NaN }),
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('invalid')
    if (resolution.status !== 'invalid') return
    expect(resolution.operations).toEqual([])
    expect(resolution.issues).toContainEqual({
      path: 'attackStrength',
      code: 'nonFinite',
      message: 'attackStrength must be finite',
    })
  })

  it('rejects normalized Knockback levels above the decoded item-enchantment limit', () => {
    const resolution = resolveAttackConfiguration(
      createPrimaryPlayerMeleeConfiguration({ knockbackEnchantmentLevel: 256 }),
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('invalid')
    if (resolution.status !== 'invalid') return
    expect(resolution.issues).toContainEqual({
      path: 'knockbackEnchantmentLevel',
      code: 'outOfRange',
      message: 'knockbackEnchantmentLevel must not exceed 255',
    })
  })

  it.each<DeferredPlayerAttackFamily>([
    'playerSweep',
    'playerStab',
    'playerProjectile',
    'maceDirectTarget',
    'maceNearbyTarget',
  ])('keeps the deferred %s family explicitly unsupported', (family) => {
    expect(
      resolveAttackConfiguration({ family }, createAcceptedPlayerMeleeContext(), standardNumerics),
    ).toEqual({
      status: 'unsupported',
      family,
      operations: [],
      reason: 'familyNotImplemented',
      diagnostics: null,
    })
  })

  it('does not mutate configuration or mechanics context', () => {
    const configuration = createPrimaryPlayerMeleeConfiguration({
      sprinting: true,
      knockbackEnchantmentLevel: 2,
    })
    const context = createAcceptedPlayerMeleeContext()
    const before = structuredClone({ configuration, context })
    const resolution = resolveAttackConfiguration(configuration, context, standardNumerics)

    expect({ configuration, context }).toEqual(before)
    expect(resolution.status).toBe('success')
  })

  it('keeps fixture provenance explicit', () => {
    expect(playerMeleeFixtureProvenance).toMatchObject({
      edition: 'Java Edition',
      version: '26.3',
    })
  })
})

describe('generic ordered velocity operation application', () => {
  it('adds a resolved direct push to the velocity left by a sulfur call', () => {
    const resolved = resolveAttackConfiguration(
      createPrimaryPlayerMeleeConfiguration(),
      createAcceptedPlayerMeleeContext(),
      standardNumerics,
    )
    expect(resolved.status).toBe('success')
    if (resolved.status !== 'success') return

    const operations = [
      ...resolved.operations,
      {
        kind: 'directPush' as const,
        providerId: 'testDirectPush',
        addedVelocity: { x: 1, y: -0.25, z: 0.5 },
        provenance: {
          sourceFamily: 'test',
          reason: 'operationCompositionRegression',
          damageSourceType: null,
        },
      },
    ]
    const sequence = applyVelocityOperations({ x: 0, y: 0, z: 0 }, operations, standardNumerics)
    const beforePush = sequence.operationResults[0].resultingVelocity

    expect(sequence.operationResults[1].existingVelocity).toEqual(beforePush)
    expect(sequence.resultingVelocity).toEqual({
      x: beforePush.x + 1,
      y: beforePush.y - 0.25,
      z: beforePush.z + 0.5,
    })
  })
})
