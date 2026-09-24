import type { DirectionProviderConfiguration } from '../resolution'
import { describe, expect, it } from 'vitest'
import { je26_3PlayerMeleeMechanics } from '../data/je26_3'
import { standardNumerics } from '../numerics/standard'
import { resolveDirectionProvider } from '../resolution'

const mechanics = je26_3PlayerMeleeMechanics

describe('horizontal base-direction provider resolution for JE 26.3', () => {
  it.each([
    {
      id: 'non-projectile source position',
      configuration: {
        kind: 'implemented',
        providerId: 'nonProjectileSourcePosition',
        sourcePosition: { x: 13, y: 4, z: -9 },
        cubeFeetPosition: { x: 10, y: 2, z: -4 },
      },
      expectedDirection: { x: 3, z: -5 },
      expectedFormula: 'sourcePositionMinusCubeFeet',
    },
    {
      id: 'base projectile motion',
      configuration: {
        kind: 'implemented',
        providerId: 'projectileMotion',
        projectileMotion: { x: 0.25, y: -0.1, z: -1.5 },
      },
      expectedDirection: { x: -0.25, z: 1.5 },
      expectedFormula: 'negativeProjectileMotion',
    },
    {
      id: 'thrown-potion position override',
      configuration: {
        kind: 'implemented',
        providerId: 'potionPosition',
        projectileFeetPosition: { x: 9.75, y: 2.5, z: -3.2 },
        cubeFeetPosition: { x: 10, y: 2, z: -4 },
      },
      expectedDirection: { x: -0.25, z: 0.8 },
      expectedFormula: 'projectilePositionMinusCubeFeet',
    },
    {
      id: 'firework position override',
      configuration: {
        kind: 'implemented',
        providerId: 'fireworkPosition',
        projectileFeetPosition: { x: 11.25, y: 2.5, z: -7 },
        cubeFeetPosition: { x: 10, y: 2, z: -4 },
      },
      expectedDirection: { x: 1.25, z: -3 },
      expectedFormula: 'projectilePositionMinusCubeFeet',
    },
    {
      id: 'caller yaw',
      configuration: {
        kind: 'implemented',
        providerId: 'callerYaw',
        callerYawDegrees: 90,
      },
      expectedDirection: { x: 1, z: 0 },
      expectedFormula: 'callerYaw',
    },
  ] as const)(
    'resolves the $id rule without using a collision point',
    ({ configuration, expectedDirection, expectedFormula }) => {
      const result = resolveDirectionProvider(configuration, mechanics, standardNumerics)

      expect(result.status).toBe('success')
      if (result.status !== 'success') return
      expect(result.horizontalBaseDirection.x).toBeCloseTo(expectedDirection.x, 7)
      expect(result.horizontalBaseDirection.z).toBeCloseTo(expectedDirection.z, 7)
      expect(result.diagnostics.formula).toBe(expectedFormula)
      expect(result.diagnostics.providerId).toBe(configuration.providerId)
      expect(result.diagnostics.sourceVersion).toBe('Java Edition 26.3')
      expect(result.diagnostics.collisionPointUsed).toBe(false)
    },
  )

  it('preserves potion/firework provenance even though both use the position formula', () => {
    const sharedPosition = {
      projectileFeetPosition: { x: -0.25, y: 0.49, z: 0.8 },
      cubeFeetPosition: { x: 0, y: 0, z: 0 },
    }
    const potion = resolveDirectionProvider(
      { kind: 'implemented', providerId: 'potionPosition', ...sharedPosition },
      mechanics,
      standardNumerics,
    )
    const firework = resolveDirectionProvider(
      { kind: 'implemented', providerId: 'fireworkPosition', ...sharedPosition },
      mechanics,
      standardNumerics,
    )

    expect(potion.status).toBe('success')
    expect(firework.status).toBe('success')
    if (potion.status !== 'success' || firework.status !== 'success') return
    expect(potion.horizontalBaseDirection).toEqual(firework.horizontalBaseDirection)
    expect(potion.providerId).toBe('potionPosition')
    expect(firework.providerId).toBe('fireworkPosition')
  })

  it('source-matches an absent non-projectile source position with a zero base', () => {
    const result = resolveDirectionProvider(
      {
        kind: 'implemented',
        providerId: 'nonProjectileSourcePosition',
        sourcePosition: null,
        cubeFeetPosition: { x: 10, y: 2, z: -4 },
      },
      mechanics,
      standardNumerics,
    )

    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.horizontalBaseDirection).toEqual({ x: 0, z: 0 })
    expect(result.diagnostics.sourcePositionAvailable).toBe(false)
  })

  it('returns explicit unsupported results instead of an incomplete direction', () => {
    const configuration: DirectionProviderConfiguration = {
      kind: 'unsupported',
      requestedProviderId: 'future_player_source',
      reason: 'providerNotImplemented',
    }
    const result = resolveDirectionProvider(configuration, mechanics, standardNumerics)

    expect(result).toEqual({
      status: 'unsupported',
      requestedProviderId: 'future_player_source',
      reason: 'providerNotImplemented',
      diagnostics: null,
    })
    expect('horizontalBaseDirection' in result).toBe(false)
  })

  it('returns all invalid sampled-state paths without producing a direction', () => {
    const result = resolveDirectionProvider(
      {
        kind: 'implemented',
        providerId: 'potionPosition',
        projectileFeetPosition: { x: Number.NaN, y: 0, z: Number.POSITIVE_INFINITY },
        cubeFeetPosition: { x: 0, y: Number.NEGATIVE_INFINITY, z: 0 },
      },
      mechanics,
      standardNumerics,
    )

    expect(result.status).toBe('invalid')
    if (result.status !== 'invalid') return
    expect(result.issues.map((issue) => issue.path)).toEqual([
      'projectileFeetPosition.x',
      'projectileFeetPosition.z',
      'cubeFeetPosition.y',
    ])
    expect('horizontalBaseDirection' in result).toBe(false)
  })

  it('validates caller-yaw mechanics only for the provider that consumes them', () => {
    const invalidMechanics = { degreesToRadians: Number.NaN }
    const projectile = resolveDirectionProvider(
      {
        kind: 'implemented',
        providerId: 'projectileMotion',
        projectileMotion: { x: 0, y: 0, z: -1 },
      },
      invalidMechanics,
      standardNumerics,
    )
    const callerYaw = resolveDirectionProvider(
      {
        kind: 'implemented',
        providerId: 'callerYaw',
        callerYawDegrees: 90,
      },
      invalidMechanics,
      standardNumerics,
    )

    expect(projectile.status).toBe('success')
    expect(callerYaw.status).toBe('invalid')
    if (callerYaw.status !== 'invalid') return
    expect(callerYaw.issues).toEqual([
      {
        path: 'mechanics.degreesToRadians',
        code: 'invalidMechanics',
        message: 'mechanics.degreesToRadians must be finite',
      },
    ])
  })

  it('snapshots sampled state so later input mutation cannot change provenance', () => {
    const projectileMotion = { x: 0.25, y: 0, z: -1.5 }
    const configuration: DirectionProviderConfiguration = {
      kind: 'implemented',
      providerId: 'projectileMotion',
      projectileMotion,
    }
    const result = resolveDirectionProvider(configuration, mechanics, standardNumerics)

    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    projectileMotion.x = 99
    expect(result.diagnostics.sampledConfiguration).toEqual({
      kind: 'implemented',
      providerId: 'projectileMotion',
      projectileMotion: { x: 0.25, y: 0, z: -1.5 },
    })
  })
})
