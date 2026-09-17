import type { HorizontalVector, SulfurCubeKnockbackContext, Vec3 } from '../model/types'
import { describe, expect, it } from 'vitest'
import { applySulfurCubeKnockbackCall } from '../model/knockbackCall'
import { standardNumerics } from '../numerics/standard'
import { createBouncyCubeLaunchProperties, createSulfurCubeContext } from '../presets/defaults'
import {
  directHorizontalDirectionFixtures,
  horizontalProviderFixtures,
  horizontalProviderSharedGeometry,
  javaDirectionFixtureTolerance,
  playerOwnedArrowDirectionFixtures,
  standardDirectionTolerance,
} from './horizontalDirectionFixtures'

function expectHorizontalWithin(
  actual: HorizontalVector,
  expected: HorizontalVector,
  tolerance: number,
): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(tolerance)
}

function expectVec3Within(actual: Vec3, expected: Vec3, tolerance: number): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(tolerance)
}

function minecraftLookDirection(yawDegrees: number, pitchDegrees: number): Vec3 {
  const yaw = (yawDegrees * Math.PI) / 180
  const pitch = (pitchDegrees * Math.PI) / 180
  const horizontalScale = Math.cos(pitch)

  return {
    x: -Math.sin(yaw) * horizontalScale,
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * horizontalScale,
  }
}

function createHorizontalFixtureContext(
  lookDirection: Vec3,
  cubeCenterOffset: HorizontalVector,
): SulfurCubeKnockbackContext {
  const cubeFeet = { x: cubeCenterOffset.x, y: 0, z: cubeCenterOffset.z }
  const context = createSulfurCubeContext(
    {
      feetPosition: { x: 0, y: 0, z: 0 },
      eyePosition: { x: 0, y: 0.49, z: 0 },
      lookDirection,
    },
    cubeFeet,
  )

  return context
}

describe('horizontal sulfur-cube direction for JE 26.3', () => {
  it.each(directHorizontalDirectionFixtures)('matches $id in standard math', (fixture) => {
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      {
        damageArgument: 1,
        horizontalBaseDirection: fixture.baseDirection,
        scaling: { kind: 'ordinaryDamage' },
      },
      createHorizontalFixtureContext(fixture.lookDirection, fixture.cubeCenterOffset),
      standardNumerics,
    )

    expect(result.diagnostics.horizontalAngleDelta).toBeCloseTo(fixture.expectedAngleDelta, 14)
    expectHorizontalWithin(
      result.diagnostics.normalizedHorizontalDirection,
      fixture.expectedNormalizedDirection,
      standardDirectionTolerance,
    )
    expect(result.diagnostics.transformedHorizontalLength).toBeCloseTo(5, 12)
  })

  it('preserves the two mechanically distinct signed-zero antiparallel branches', () => {
    const negative = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      {
        damageArgument: 1,
        horizontalBaseDirection: { x: 0, z: 1 },
        scaling: { kind: 'ordinaryDamage' },
      },
      createHorizontalFixtureContext({ x: 0, y: 0, z: 1 }, { x: 0, z: -1 }),
      standardNumerics,
    )
    const positive = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      {
        damageArgument: 1,
        horizontalBaseDirection: { x: 0, z: 1 },
        scaling: { kind: 'ordinaryDamage' },
      },
      createHorizontalFixtureContext({ x: 0, y: 0, z: -1 }, { x: 0, z: 1 }),
      standardNumerics,
    )

    expect(Object.is(negative.diagnostics.horizontalCross, -0)).toBe(true)
    expect(negative.diagnostics.horizontalAngleDelta).toBe(-Math.PI)
    expect(Object.is(positive.diagnostics.horizontalCross, 0)).toBe(true)
    expect(positive.diagnostics.horizontalAngleDelta).toBe(Math.PI)
    expect(negative.diagnostics.normalizedHorizontalDirection.x).toBeLessThan(0)
    expect(positive.diagnostics.normalizedHorizontalDirection.x).toBeGreaterThan(0)
  })

  it('uses zero rather than a random fallback below the horizontal normalization cutoff', () => {
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      {
        damageArgument: 1,
        horizontalBaseDirection: { x: 0.000009, z: 0 },
        scaling: { kind: 'ordinaryDamage' },
      },
      createHorizontalFixtureContext({ x: 1, y: 0, z: 0 }, { x: 1, z: 0 }),
      standardNumerics,
    )

    expect(result.diagnostics.transformedHorizontalLength).toBeCloseTo(0.000009, 14)
    expect(result.diagnostics.normalizedHorizontalDirection).toEqual({ x: 0, z: 0 })
    expect(result.addedVelocity.x).toBe(-0)
    expect(result.addedVelocity.z).toBe(-0)
  })

  it.each(horizontalProviderFixtures)(
    'matches source-derived base-provider fixture $id',
    (fixture) => {
      const shared = horizontalProviderSharedGeometry
      const baseContext = createSulfurCubeContext(
        {
          feetPosition: shared.causingFeet,
          eyePosition: shared.causingEye,
          lookDirection: shared.causingLook,
        },
        shared.cubeFeet,
      )
      const result = applySulfurCubeKnockbackCall(
        { x: 0, y: 0, z: 0 },
        {
          damageArgument: 1,
          horizontalBaseDirection: fixture.baseDirection,
          scaling: { kind: 'ordinaryDamage' },
        },
        {
          ...baseContext,
          cube: { feetPosition: shared.cubeFeet, dimensions: shared.cubeDimensions },
        },
        standardNumerics,
      )

      expect(result.diagnostics.originalHorizontalDirection).toEqual(fixture.baseDirection)
      expect(Math.abs(result.diagnostics.horizontalCross - shared.expectedCross)).toBeLessThan(
        javaDirectionFixtureTolerance,
      )
      expect(Math.abs(result.diagnostics.horizontalDot - shared.expectedDot)).toBeLessThan(
        javaDirectionFixtureTolerance,
      )
      expect(
        Math.abs(result.diagnostics.horizontalAngleDelta - shared.expectedAngleDelta),
      ).toBeLessThan(javaDirectionFixtureTolerance)
      expectHorizontalWithin(
        result.diagnostics.transformedHorizontalDirection,
        fixture.expectedTransformedDirection,
        javaDirectionFixtureTolerance,
      )
      expect(
        Math.abs(
          result.diagnostics.transformedHorizontalLength - fixture.expectedTransformedLength,
        ),
      ).toBeLessThan(javaDirectionFixtureTolerance)
      expectHorizontalWithin(
        result.diagnostics.normalizedHorizontalDirection,
        fixture.expectedNormalizedDirection,
        javaDirectionFixtureTolerance,
      )
    },
  )

  it.each(playerOwnedArrowDirectionFixtures)(
    'matches source-derived player-owned arrow fixture $id within standard-mode tolerance',
    (fixture) => {
      const context = createSulfurCubeContext(
        {
          feetPosition: fixture.ownerFeet,
          eyePosition: fixture.ownerEye,
          lookDirection: minecraftLookDirection(fixture.ownerYawDegrees, fixture.ownerPitchDegrees),
        },
        fixture.cubeFeet,
        standardNumerics,
        createBouncyCubeLaunchProperties(),
      )
      const result = applySulfurCubeKnockbackCall(
        { x: 0, y: 0, z: 0 },
        {
          damageArgument: fixture.damageArgument,
          horizontalBaseDirection: {
            x: -fixture.projectileMotion.x,
            z: -fixture.projectileMotion.z,
          },
          scaling: { kind: 'ordinaryDamage' },
        },
        context,
        standardNumerics,
      )

      expect(
        Math.abs(result.diagnostics.horizontalAngleDelta - fixture.expectedAngleDelta),
      ).toBeLessThanOrEqual(javaDirectionFixtureTolerance)
      expectHorizontalWithin(
        result.diagnostics.normalizedHorizontalDirection,
        fixture.expectedNormalizedDirection,
        javaDirectionFixtureTolerance,
      )
      expectVec3Within(
        result.addedVelocity,
        fixture.expectedAddedVelocity,
        javaDirectionFixtureTolerance,
      )
    },
  )

  it('keeps P1-P5 invariant when only the arrow collision-path position changes', () => {
    const pathFixtures = playerOwnedArrowDirectionFixtures.slice(0, 5)

    expect(
      new Set(pathFixtures.map((fixture) => JSON.stringify(fixture.projectileFeet))).size,
    ).toBe(5)
    expect(
      new Set(pathFixtures.map((fixture) => JSON.stringify(fixture.expectedAddedVelocity))).size,
    ).toBe(1)
  })
})
