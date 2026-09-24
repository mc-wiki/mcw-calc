import type {
  CubeMechanicsProperties,
  KnockbackCall,
  SulfurCubeKnockbackContext,
  Vec3,
} from '../model/types'
import { describe, expect, it } from 'vitest'
import { applySulfurCubeKnockbackCall } from '../model/knockbackCall'
import { standardNumerics } from '../numerics/standard'
import { createSulfurCubeContext } from '../presets/defaults'
import { createStandingPlayerGeometry } from '../presets/standingPlayer'
import {
  createFixtureInputs,
  createLookDirection,
  directMeleeFixtures,
  verticalityFixture,
} from './experimentFixtures'

const standardExperimentTolerance = 0.00015

function expectVec3Within(actual: Vec3, expected: Vec3, tolerance: number): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(tolerance)
}

function createQZeroContext(properties?: CubeMechanicsProperties): SulfurCubeKnockbackContext {
  const feetPosition = { x: 0, y: 0, z: 2 }
  const eyePosition = { x: 0, y: 1.62, z: 2 }
  const context = createSulfurCubeContext(
    createStandingPlayerGeometry(feetPosition, { x: 0, y: 0, z: -1 }),
    { x: 0, y: 0, z: 0 },
  )
  const topY = (0.98 - eyePosition.y) / Math.hypot(0.98 - eyePosition.y, 2)
  const bottomY = (0 - eyePosition.y) / Math.hypot(0 - eyePosition.y, 2)
  const lookY = (topY + bottomY) / 2

  return {
    ...context,
    attacker: {
      feetPosition,
      eyePosition,
      lookDirection: { x: 0, y: lookY, z: -Math.sqrt(1 - lookY * lookY) },
    },
    properties: properties ?? context.properties,
  }
}

const ordinaryCall: KnockbackCall = {
  damageArgument: 1,
  horizontalBaseDirection: { x: 0, z: 1 },
  scaling: { kind: 'ordinaryDamage' },
}

describe('one sulfur cube knockback call', () => {
  it.each(directMeleeFixtures)('matches the $id experiment fixture', (fixture) => {
    const { call, context } = createFixtureInputs(fixture)
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      call,
      context,
      standardNumerics,
    )

    // The observations include source float rotations and Minecraft's sine table;
    // standard mode intentionally uses ordinary JavaScript trigonometry.
    expectVec3Within(
      result.addedVelocity,
      fixture.expectedAddedVelocity,
      standardExperimentTolerance,
    )
    expect(Math.abs(result.diagnostics.q - fixture.expectedDiagnostics.q)).toBeLessThanOrEqual(
      0.001,
    )
    expect(
      Math.abs(
        result.diagnostics.horizontalAngleDelta - fixture.expectedDiagnostics.horizontalAngleDelta,
      ),
    ).toBeLessThanOrEqual(0.001)
    expect(
      Math.abs(result.diagnostics.theta - fixture.expectedDiagnostics.theta),
    ).toBeLessThanOrEqual(0.001)
  })

  it('returns the complete named mechanics cascade', () => {
    const fixture = directMeleeFixtures[0]
    const { call, context } = createFixtureInputs(fixture)
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      call,
      context,
      standardNumerics,
    )
    const values = result.diagnostics

    expect(values.q).toBe(1)
    expect(values.theta).toBeCloseTo(0, 14)
    expect(values.h0).toBe(0.4125)
    expect(values.v0).toBe(0.105)
    expect(values.h1).toBeCloseTo(0.20625, 14)
    expect(values.v1).toBeCloseTo(0.1575, 14)
    expect(values.h2).toBeCloseTo(values.h1, 14)
    expect(values.v2).toBeCloseTo(values.v1, 14)
    expect(values.capFactor).toBeCloseTo(2 / 3, 14)
    expect(values.h3).toBeCloseTo(0.1375, 14)
    expect(values.v3).toBeCloseTo(0.105, 14)
    expect(values.effectFactor).toBe(1)
    expect(values.resistanceFactor).toBe(3)
    expect(values.m).toBe(3)
    expect(values.horizontalResult).toBeCloseTo(0.165, 14)
    expect(values.verticalResult).toBeCloseTo(0.378, 14)
  })

  it('preserves transfer-vector magnitude before the cap', () => {
    const context = createQZeroContext()
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      ordinaryCall,
      {
        ...context,
        attacker: {
          ...context.attacker,
          feetPosition: { ...context.attacker.feetPosition, y: 1 },
        },
      },
      standardNumerics,
    )
    const { h1, v1, h2, v2 } = result.diagnostics

    expect(h2 * h2 + v2 * v2).toBeCloseTo(h1 * h1 + v1 * v1, 14)
  })

  it('leaves powers unchanged when neither cap ratio exceeds one', () => {
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      ordinaryCall,
      createQZeroContext(),
      standardNumerics,
    ).diagnostics

    expect(result.maxRatio).toBeCloseTo(1, 14)
    expect(result.capFactor).toBe(1)
    expect(result.h3).toBe(result.h2)
    expect(result.v3).toBe(result.v2)
  })

  it('uses one shared cap scale when the horizontal ratio dominates', () => {
    const context = createQZeroContext({
      horizontalPower: 0.01,
      verticalPower: 1,
      knockbackResistance: 0,
    })
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      ordinaryCall,
      {
        ...context,
        attacker: {
          ...context.attacker,
          feetPosition: { ...context.attacker.feetPosition, y: 1 },
        },
      },
      standardNumerics,
    ).diagnostics

    expect(result.horizontalRatio).toBeGreaterThan(result.verticalRatio)
    expect(result.horizontalRatio).toBeGreaterThan(1)
    expect(result.capFactor).toBeCloseTo(1 / result.maxRatio, 14)
    expect(result.h3).toBeCloseTo(result.h2 * result.capFactor, 14)
    expect(result.v3).toBeCloseTo(result.v2 * result.capFactor, 14)
  })

  it('preserves the source zero-base-component ratio branch', () => {
    const context = createQZeroContext({
      horizontalPower: 0,
      verticalPower: 1,
      knockbackResistance: 0,
    })
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      ordinaryCall,
      {
        ...context,
        attacker: {
          ...context.attacker,
          feetPosition: { ...context.attacker.feetPosition, y: 1 },
        },
      },
      standardNumerics,
    ).diagnostics

    expect(result.horizontalRatio).toBe(0)
    expect(result.h2).not.toBe(0)
  })

  it('keeps capped powers within the original nonnegative archetype powers', () => {
    for (const feetY of [-3, -1, 0, 1, 3]) {
      for (const aimY of [-2, -0.5, 0, 0.5, 2]) {
        for (const aimX of [-1, 0, 1]) {
          const feet = { x: 0, y: feetY, z: 2 }
          const eye = { x: 0, y: feetY + 1.62, z: 2 }
          const attacker = {
            feetPosition: feet,
            eyePosition: eye,
            lookDirection: createLookDirection(eye, { x: aimX, y: aimY, z: 0 }),
          }
          const context = createSulfurCubeContext(attacker, { x: 0, y: 0, z: 0 })
          const { h0, v0, h3, v3 } = applySulfurCubeKnockbackCall(
            { x: 0, y: 0, z: 0 },
            ordinaryCall,
            context,
            standardNumerics,
          ).diagnostics

          expect(Math.abs(h3)).toBeLessThanOrEqual(h0 + 1e-12)
          expect(Math.abs(v3)).toBeLessThanOrEqual(v0 + 1e-12)
        }
      }
    }
  })

  it('derives ordinary and extra-effect factors as distinct call kinds', () => {
    const context = createQZeroContext()
    const ordinary = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      ordinaryCall,
      context,
      standardNumerics,
    )
    const effect = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      { ...ordinaryCall, scaling: { kind: 'extraKnockbackEffect', powerArgument: 3 } },
      context,
      standardNumerics,
    )

    expect(ordinary.diagnostics.effectFactor).toBe(1)
    expect(effect.diagnostics.effectFactor).toBe(0.75)
  })

  it('scales damage arguments 1, 4, and 9 in a 1:2:3 ratio', () => {
    const context = createQZeroContext()
    const magnitudes = [1, 4, 9].map(
      (damageArgument) =>
        applySulfurCubeKnockbackCall(
          { x: 0, y: 0, z: 0 },
          { ...ordinaryCall, damageArgument },
          context,
          standardNumerics,
        ).diagnostics.horizontalResult,
    )

    expect(magnitudes[1] / magnitudes[0]).toBeCloseTo(2, 14)
    expect(magnitudes[2] / magnitudes[0]).toBeCloseTo(3, 14)
  })

  it('places the horizontal and vertical clamps exactly around their source scalars', () => {
    const positive = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      ordinaryCall,
      createQZeroContext({
        horizontalPower: 1000,
        verticalPower: 1000,
        knockbackResistance: 0,
      }),
      standardNumerics,
    ).diagnostics
    const negative = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      ordinaryCall,
      createQZeroContext({
        horizontalPower: -1000,
        verticalPower: -1000,
        knockbackResistance: 0,
      }),
      standardNumerics,
    ).diagnostics

    expect(positive.horizontalBeforeClamp).toBeCloseTo(400, 10)
    expect(positive.horizontalResult).toBe(128)
    expect(positive.verticalBeforeClamp).toBeCloseTo(1000, 10)
    expect(positive.verticalResult).toBe(153.6)
    expect(negative.horizontalBeforeClamp).toBeCloseTo(-400, 10)
    expect(negative.horizontalResult).toBe(-128)
    expect(negative.verticalBeforeClamp).toBeCloseTo(-1000, 10)
    expect(negative.verticalResult).toBe(-153.6)
  })

  it('adds to all existing velocity components without mutating inputs', () => {
    const fixture = directMeleeFixtures[0]
    const { call, context } = createFixtureInputs(fixture)
    const existingVelocity = { x: 1, y: -0.25, z: 2 }
    const before = JSON.parse(JSON.stringify({ existingVelocity, call, context }))
    const result = applySulfurCubeKnockbackCall(existingVelocity, call, context, standardNumerics)

    expectVec3Within(
      result.resultingVelocity,
      {
        x: 1 + fixture.expectedAddedVelocity.x,
        y: -0.25 + fixture.expectedAddedVelocity.y,
        z: 2 + fixture.expectedAddedVelocity.z,
      },
      standardExperimentTolerance,
    )
    expect({ existingVelocity, call, context }).toEqual(before)
  })

  it('source-matches a degenerate horizontal direction with zero horizontal addition', () => {
    const context = createQZeroContext()
    const result = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      { ...ordinaryCall, horizontalBaseDirection: { x: 0, z: 0 } },
      context,
      standardNumerics,
    )

    expect(result.diagnostics.normalizedHorizontalDirection).toEqual({ x: 0, z: 0 })
    expect(result.addedVelocity.x).toBe(-0)
    expect(result.addedVelocity.z).toBe(-0)
    expect(result.addedVelocity.y).toBeGreaterThan(0)
  })

  it('adds the same vertical launch to grounded and airborne recorded velocity', () => {
    const eyePosition = {
      x: verticalityFixture.attackerFeetPosition.x,
      y: verticalityFixture.attackerFeetPosition.y + 1.62,
      z: verticalityFixture.attackerFeetPosition.z,
    }
    const attacker = createStandingPlayerGeometry(
      verticalityFixture.attackerFeetPosition,
      createLookDirection(eyePosition, verticalityFixture.aimPoint),
    )
    const context = createSulfurCubeContext(attacker, { x: 0, y: 0, z: 0 })
    const result = applySulfurCubeKnockbackCall(
      verticalityFixture.existingVelocity,
      ordinaryCall,
      context,
      standardNumerics,
    )

    expectVec3Within(
      result.addedVelocity,
      verticalityFixture.expectedAddedVelocity,
      standardExperimentTolerance,
    )
    expect(result.resultingVelocity.y).toBeCloseTo(0.298072, 5)
  })

  it('rejects negative damage and non-finite inputs', () => {
    const context = createQZeroContext()

    expect(() =>
      applySulfurCubeKnockbackCall(
        { x: 0, y: 0, z: 0 },
        { ...ordinaryCall, damageArgument: -1 },
        context,
        standardNumerics,
      ),
    ).toThrow(/damageArgument/)
    expect(() =>
      applySulfurCubeKnockbackCall(
        { x: Number.NaN, y: 0, z: 0 },
        ordinaryCall,
        context,
        standardNumerics,
      ),
    ).toThrow(/finite/)
  })
})
