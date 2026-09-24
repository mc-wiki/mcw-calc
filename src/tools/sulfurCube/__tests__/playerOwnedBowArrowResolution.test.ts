import type { NumericBackend } from '../numerics/types'
import { describe, expect, it } from 'vitest'
import { je26_3PlayerOwnedBowArrowMechanics, provenance } from '../data/je26_3'
import { applyVelocityOperations } from '../model/velocityOperations'
import { standardNumerics } from '../numerics/standard'
import { resolveAttackConfiguration, resolvePlayerOwnedBowArrowAttack } from '../resolution'
import {
  createAcceptedPlayerOwnedBowArrowContext,
  createPlayerOwnedBowArrowConfiguration,
  playerOwnedBowArrowFixtureProvenance,
  playerOwnedBowArrowVelocityFixtures,
} from './playerOwnedBowArrowFixtures'

const javaFixtureTolerance = 0.00015
const sourceFloatNumerics: NumericBackend = Object.freeze({
  ...standardNumerics,
  id: 'test-source-float',
  sourceFloat: Math.fround,
})

describe('player-owned bow-arrow attack resolution', () => {
  it.each(playerOwnedBowArrowVelocityFixtures)('matches accepted fixture $id', (fixture) => {
    const resolution = resolveAttackConfiguration(
      fixture.configuration,
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return

    expect(resolution.operations.map((operation) => operation.kind)).toEqual(
      fixture.expected.operationKinds,
    )
    expect(resolution.diagnostics.shot.damageArgument).toBe(fixture.expected.damageArgument)

    const sequence = applyVelocityOperations(
      fixture.initialVelocity,
      resolution.operations,
      standardNumerics,
    )
    for (const component of ['x', 'y', 'z'] as const) {
      expect(
        Math.abs(sequence.resultingVelocity[component] - fixture.expected.finalVelocity[component]),
      ).toBeLessThan(javaFixtureTolerance)
    }
  })

  it('reproduces the audited float boundaries in the bow curve and impact damage', () => {
    const resolution = resolvePlayerOwnedBowArrowAttack(
      createPlayerOwnedBowArrowConfiguration(),
      createAcceptedPlayerOwnedBowArrowContext(),
      sourceFloatNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.diagnostics.shot).toMatchObject({
      bowPower: 0.934166669845581,
      nominalLaunchSpeed: 2.802500009536743,
      critical: false,
      impactSpeed: 2.799999952316284,
      storedBaseDamage: 2,
      powerDamageAddition: 0,
      modifiedBaseDamage: 2,
      preCriticalDamage: 6,
      criticalBonusRoll: 0,
      integerDamage: 6,
      damageArgument: 6,
    })
  })

  it('keeps the accepted sulfur call before the separate Punch direct push', () => {
    const resolution = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({ punchLevel: 2 }),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.operations).toHaveLength(2)
    expect(resolution.operations[0]).toMatchObject({
      kind: 'sulfurCubeKnockbackCall',
      providerId: 'projectileMotion',
      call: { damageArgument: 6, scaling: { kind: 'ordinaryDamage' } },
    })
    expect(resolution.operations[1]).toMatchObject({
      kind: 'directPush',
      providerId: 'projectileWeaponKnockback',
      addedVelocity: { x: 0, y: 0.1, z: -3.5999999999999996 },
    })
    expect(resolution.diagnostics.damageSource).toMatchObject({
      damageType: 'minecraft:arrow',
      directEntityRole: 'projectile',
      causingEntityRole: 'resolvedOwner',
      causingEntityFamily: 'player',
      defaultDirectionProviderId: 'projectileMotion',
    })
    expect(resolution.diagnostics.healthDamageApplied).toBe(false)
    expect(resolution.diagnostics.collisionPointUsed).toBe(false)
    expect(resolution.diagnostics.projectilePositionUsed).toBe(false)
  })

  it('uses live owner look for sulfur rotation while retaining projectile motion as base', () => {
    const baseContext = createAcceptedPlayerOwnedBowArrowContext()
    const context = {
      ...baseContext,
      attacker: {
        ...baseContext.attacker,
        lookDirection: { x: 0.5, y: 0, z: -0.8660254037844386 },
      },
    }
    const resolution = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration(),
      context,
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    const operation = resolution.operations[0]
    expect(operation.kind).toBe('sulfurCubeKnockbackCall')
    if (operation.kind !== 'sulfurCubeKnockbackCall') return
    expect(operation.call.horizontalBaseDirection.x).toBeCloseTo(0)
    expect(operation.call.horizontalBaseDirection.z).toBe(2.8)

    const result = applyVelocityOperations(
      { x: 0, y: 0, z: 0 },
      resolution.operations,
      standardNumerics,
    ).resultingVelocity
    expect(Math.abs(result.x - -0.9010611855675899)).toBeLessThan(javaFixtureTolerance)
    expect(Math.abs(result.z - -0.8113191356448642)).toBeLessThan(javaFixtureTolerance)
  })

  it('keeps projectile position diagnostic-only for the declared motion-provider impact', () => {
    const base = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration(),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )
    const moved = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({
        projectileFeetPosition: { x: 0.42, y: 0.83, z: 1.01 },
      }),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )

    expect(base.status).toBe('success')
    expect(moved.status).toBe('success')
    if (base.status !== 'success' || moved.status !== 'success') return
    expect(moved.operations).toEqual(base.operations)
    expect(moved.diagnostics.projectileFeetPosition).toEqual({ x: 0.42, y: 0.83, z: 1.01 })
  })

  it('admits spectral arrows without changing ordinary bow-arrow mechanics', () => {
    const resolution = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({ projectileKind: 'spectralArrow' }),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.diagnostics.damageSource.directEntityFamily).toBe('spectralArrow')
    expect(resolution.diagnostics.shot.damageArgument).toBe(6)
  })

  it('applies Punch resistance independently of the sulfur call', () => {
    const baseContext = createAcceptedPlayerOwnedBowArrowContext()
    const context = {
      ...baseContext,
      properties: { ...baseContext.properties, knockbackResistance: 0 },
    }
    const resolution = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({ punchLevel: 2 }),
      context,
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.diagnostics.punch.resistanceFactor).toBe(1)
    expect(resolution.diagnostics.punch.addedVelocity).toEqual({ x: 0, y: 0.1, z: -1.2 })
    const result = applyVelocityOperations(
      { x: 0, y: 0, z: 0 },
      resolution.operations,
      standardNumerics,
    ).resultingVelocity
    expect(Math.abs(result.y - 0.20287856919689348)).toBeLessThan(javaFixtureTolerance)
    expect(Math.abs(result.z - -1.6041658075592244)).toBeLessThan(javaFixtureTolerance)
  })

  it('requires and bounds an explicit critical random roll', () => {
    for (const criticalBonusRoll of [null, 5]) {
      const resolution = resolveAttackConfiguration(
        createPlayerOwnedBowArrowConfiguration({ drawTicks: 20, criticalBonusRoll }),
        createAcceptedPlayerOwnedBowArrowContext(),
        standardNumerics,
      )
      expect(resolution.status).toBe('invalid')
      if (resolution.status !== 'invalid') continue
      expect(resolution.issues.some((issue) => issue.path === 'criticalBonusRoll')).toBe(true)
    }

    const noncriticalWithRoll = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({ criticalBonusRoll: 0 }),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )
    expect(noncriticalWithRoll.status).toBe('invalid')
  })

  it('distinguishes a valid zero-addition impact from invalid input', () => {
    const noOperation = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({ impactMotion: { x: 0, y: 0, z: 0 } }),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )
    expect(noOperation).toMatchObject({
      status: 'noOperation',
      family: 'playerOwnedBowArrow',
      operations: [],
      reason: 'allVelocityAdditionsZeroOrOmitted',
      diagnostics: {
        sulfurCallExecuted: true,
        hurtResult: true,
        omittedOperations: [
          { kind: 'sulfurCubeKnockbackCall', reason: 'zeroDamageProducedZeroAddition' },
          { kind: 'directPush', reason: 'noPositivePunchKnockback' },
        ],
      },
    })

    const invalid = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({
        impactMotion: { x: Number.NaN, y: 0, z: -2.8 },
      }),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )
    expect(invalid.status).toBe('invalid')
    if (invalid.status !== 'invalid') return
    expect(invalid.issues).toContainEqual({
      path: 'impactMotion.x',
      code: 'nonFinite',
      message: 'impactMotion.x must be finite',
    })
  })

  it('omits the entire Punch push below the horizontal normalization cutoff', () => {
    for (const impactMotion of [
      { x: 0, y: 1, z: 0 },
      { x: 0.000009, y: 1, z: 0 },
    ]) {
      const resolution = resolveAttackConfiguration(
        createPlayerOwnedBowArrowConfiguration({ punchLevel: 2, impactMotion }),
        createAcceptedPlayerOwnedBowArrowContext(),
        sourceFloatNumerics,
      )
      expect(resolution.status).toBe('success')
      if (resolution.status !== 'success') continue
      expect(resolution.operations).toHaveLength(1)
      expect(resolution.diagnostics.punch.addedVelocity).toBeNull()
      expect(resolution.diagnostics.omittedOperations).toContainEqual({
        kind: 'directPush',
        reason: 'horizontalMotionBelowNormalizationCutoff',
      })
    }
  })

  it('admits the exact source-float normalization cutoff', () => {
    const resolution = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({
        punchLevel: 2,
        impactMotion: { x: 0.000009999999747378752, y: 1, z: 0 },
      }),
      createAcceptedPlayerOwnedBowArrowContext(),
      sourceFloatNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.operations.map((operation) => operation.kind)).toEqual([
      'sulfurCubeKnockbackCall',
      'directPush',
    ])
    expect(resolution.diagnostics.punch.addedVelocity).toEqual({
      x: 3.5999999999999996,
      y: 0.1,
      z: 0,
    })
  })

  it('reports mechanically evaluable enchantment levels beyond ordinary Survival limits', () => {
    const resolution = resolveAttackConfiguration(
      createPlayerOwnedBowArrowConfiguration({ powerLevel: 6, punchLevel: 3 }),
      createAcceptedPlayerOwnedBowArrowContext(),
      standardNumerics,
    )

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(resolution.diagnostics.shot.damageArgument).toBe(16)
    expect(resolution.diagnostics.survivalAvailability).toEqual({
      classification: 'mechanicallyEvaluableSynthetic',
      issues: [
        { code: 'powerAboveSurvivalMaximum', selected: 6, maximum: 5 },
        { code: 'punchAboveSurvivalMaximum', selected: 3, maximum: 2 },
      ],
      impactPathReachability: 'notVerified',
    })
  })

  it('keeps accepted evidence and mechanics constants traceable to their source versions', () => {
    expect(playerOwnedBowArrowFixtureProvenance).toMatchObject({
      edition: 'Java Edition',
      version: '26.2',
    })
    expect(provenance.playerBowArrowShot.sourcePath).toContain('BowItem.java')
    expect(provenance.playerBowArrowDamage.sourcePath).toContain('AbstractArrow.java')
    expect(provenance.playerBowArrowPunch.sourcePath).toContain('AbstractArrow.java')
    expect(je26_3PlayerOwnedBowArrowMechanics).toMatchObject({
      minimumDrawTicks: 3,
      nominalSpeedScale: 3,
      storedBaseDamage: 2,
      ordinarySurvivalPowerMaximum: 5,
      ordinarySurvivalPunchMaximum: 2,
      punchHorizontalScale: 0.6,
      punchVerticalAddition: 0.1,
    })
  })

  it('does not mutate configuration, context, or operation snapshots', () => {
    const configuration = createPlayerOwnedBowArrowConfiguration({ punchLevel: 2 })
    const context = createAcceptedPlayerOwnedBowArrowContext()
    const configurationBefore = structuredClone(configuration)
    const contextBefore = structuredClone(context)
    const resolution = resolveAttackConfiguration(configuration, context, standardNumerics)

    expect(resolution.status).toBe('success')
    if (resolution.status !== 'success') return
    expect(configuration).toEqual(configurationBefore)
    expect(context).toEqual(contextBefore)
    Reflect.set(context.attacker.feetPosition, 'z', 99)
    expect(resolution.operations[0]).toMatchObject({
      context: { attacker: { feetPosition: { z: 6 } } },
    })
  })
})
