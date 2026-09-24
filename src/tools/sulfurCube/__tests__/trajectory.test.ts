import type { Vec3 } from '../model/types'
import { describe, expect, it } from 'vitest'
import { applySulfurCubeKnockbackCall } from '../model/knockbackCall'
import {
  computeModifiedFriction,
  simulateFlatFloorFirstContactTrajectory,
  simulateFreeFlightTrajectory,
} from '../model/trajectory'
import { standardNumerics } from '../numerics/standard'
import { createBouncyTrajectoryAssumptions } from '../presets/defaults'
import { createFixtureInputs, directMeleeFixtures, m1TenTickFixture } from './experimentFixtures'
import { flatFloorFixtures } from './flatFloorFixtures'

function expectVec3Close(actual: Vec3, expected: Vec3, digits = 5): void {
  expect(actual.x).toBeCloseTo(expected.x, digits)
  expect(actual.y).toBeCloseTo(expected.y, digits)
  expect(actual.z).toBeCloseTo(expected.z, digits)
}

describe('simplified absorbed-cube free flight', () => {
  it('uses strict per-component movement cutoffs', () => {
    const result = simulateFreeFlightTrajectory(
      { x: 0, y: 0, z: 0 },
      { x: 0.002999, y: 0.003, z: -0.003 },
      1,
      { gravity: 0, drag: 1, movementCutoff: 0.003 },
    )

    expect(result.ticks[0].effectiveVelocity).toEqual({ x: 0, y: 0.003, z: -0.003 })
    expect(result.resultingPosition).toEqual({ x: 0, y: 0.003, z: -0.003 })
  })

  it('moves before applying gravity and drag', () => {
    const result = simulateFreeFlightTrajectory(
      { x: 1, y: 2, z: 3 },
      { x: 0.5, y: 1, z: -0.25 },
      1,
      { gravity: 0.08, drag: 0.9, movementCutoff: 0.003 },
    )

    expect(result.resultingPosition).toEqual({ x: 1.5, y: 3, z: 2.75 })
    expect(result.resultingVelocity).toEqual({ x: 0.45, y: 0.8280000000000001, z: -0.225 })
  })

  it('derives Bouncy omnidirectional air drag from the attribute modifier', () => {
    const assumptions = createBouncyTrajectoryAssumptions(standardNumerics)

    expect(computeModifiedFriction(0.91, 1 * (1 - 0.9900000002235174), standardNumerics)).toBe(
      assumptions.drag,
    )
    expect(assumptions.drag).toBeCloseTo(0.9991000294685364, 7)
  })

  it('matches the recorded M1 ten-tick position and velocity', () => {
    const fixture = directMeleeFixtures[0]
    const { call, context } = createFixtureInputs(fixture)
    const launch = applySulfurCubeKnockbackCall(
      { x: 0, y: 0, z: 0 },
      call,
      context,
      standardNumerics,
    )
    const initialPosition = { ...m1TenTickFixture.initialPosition }
    const initialVelocity = { ...launch.resultingVelocity }
    const result = simulateFreeFlightTrajectory(
      initialPosition,
      initialVelocity,
      10,
      createBouncyTrajectoryAssumptions(standardNumerics),
    )

    expectVec3Close(result.resultingPosition, m1TenTickFixture.expectedPosition)
    expectVec3Close(result.resultingVelocity, m1TenTickFixture.expectedVelocity)
    expect(result.ticks[0].resultingPosition).toEqual(initialVelocity)
    expect(initialPosition).toEqual(m1TenTickFixture.initialPosition)
    expect(initialVelocity).toEqual(launch.resultingVelocity)
  })

  it('validates tick counts and assumptions', () => {
    expect(() =>
      simulateFreeFlightTrajectory({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, -1, {
        gravity: 0.08,
        drag: 1,
        movementCutoff: 0.003,
      }),
    ).toThrow(/tickCount/)
  })
})

describe('source-audited first return to an ordinary flat floor', () => {
  for (const fixture of flatFloorFixtures) {
    it(`matches ${fixture.id}`, () => {
      const result = simulateFlatFloorFirstContactTrajectory(
        { x: 0, y: 0, z: 0 },
        fixture.initialVelocity,
        200,
        {
          gravity: 0.08,
          drag: fixture.drag,
          movementCutoff: 0.003,
          floorY: 0,
          floorBlockFriction: 0.6000000238418579,
          entityFrictionModifier: 0.30000001192092896,
          initialGroundHorizontalFactor: fixture.initialGroundHorizontalFactor,
        },
      )

      expect(result.contact?.tick).toBe(fixture.expected.contactTick)
      expect(
        Math.abs(result.resultingPosition.x - fixture.expected.contactPosition.x),
      ).toBeLessThanOrEqual(1e-9)
      expect(
        Math.abs(result.resultingPosition.y - fixture.expected.contactPosition.y),
      ).toBeLessThanOrEqual(1e-9)
      expect(
        Math.abs(result.resultingPosition.z - fixture.expected.contactPosition.z),
      ).toBeLessThanOrEqual(1e-9)
      expect(
        Math.abs(result.horizontalDistance - fixture.expected.horizontalDistance),
      ).toBeLessThanOrEqual(1e-9)
      expect(Math.abs(result.maximumFeetY - fixture.expected.maximumFeetY)).toBeLessThanOrEqual(
        1e-9,
      )
    })
  }

  it('applies full horizontal movement on the vertically clipped contact tick', () => {
    const result = simulateFlatFloorFirstContactTrajectory(
      { x: 0, y: 0, z: 0 },
      { x: 0.3, y: 0.8, z: 0.4 },
      200,
      {
        gravity: 0.08,
        drag: 0.9991000294685364,
        movementCutoff: 0.003,
        floorY: 0,
        floorBlockFriction: 0.6000000238418579,
        entityFrictionModifier: 0.30000001192092896,
        initialGroundHorizontalFactor: 0.8792080283164978,
      },
    )

    expect(result.contact?.appliedMovement.x).toBe(result.contact?.effectiveVelocity.x)
    expect(result.contact?.appliedMovement.z).toBe(result.contact?.effectiveVelocity.z)
    expect(result.contact?.appliedMovement.y).not.toBe(result.contact?.effectiveVelocity.y)
    expect(result.resultingVelocity).toBeNull()
  })
})
