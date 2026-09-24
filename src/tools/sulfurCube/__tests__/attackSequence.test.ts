import type { KnockbackCall } from '../model/types'
import { describe, expect, it } from 'vitest'
import { applySulfurCubeAttackSequence } from '../model/attackSequence'
import { applySulfurCubeKnockbackCall } from '../model/knockbackCall'
import { standardNumerics } from '../numerics/standard'
import { createFixtureInputs, directMeleeFixtures } from './experimentFixtures'

describe('ordered sulfur cube attack sequences', () => {
  const fixture = directMeleeFixtures[0]
  const inputs = createFixtureInputs(fixture)

  it('preserves initial velocity for zero calls', () => {
    const initial = { x: 1, y: 2, z: 3 }

    expect(applySulfurCubeAttackSequence(initial, [], inputs.context, standardNumerics)).toEqual({
      initialVelocity: initial,
      callResults: [],
      resultingVelocity: initial,
    })
  })

  it('matches the direct operation for one call', () => {
    const initial = { x: 0.25, y: -0.5, z: 1 }
    const direct = applySulfurCubeKnockbackCall(
      initial,
      inputs.call,
      inputs.context,
      standardNumerics,
    )
    const sequence = applySulfurCubeAttackSequence(
      initial,
      [inputs.call],
      inputs.context,
      standardNumerics,
    )

    expect(sequence.callResults).toEqual([direct])
    expect(sequence.resultingVelocity).toEqual(direct.resultingVelocity)
  })

  it('feeds each resulting velocity into the next independent call', () => {
    const secondCall: KnockbackCall = {
      damageArgument: 4,
      horizontalBaseDirection: { x: 1, z: 0 },
      scaling: { kind: 'extraKnockbackEffect', powerArgument: 2 },
    }
    const sequence = applySulfurCubeAttackSequence(
      { x: 0, y: 0, z: 0 },
      [inputs.call, secondCall],
      inputs.context,
      standardNumerics,
    )

    expect(sequence.callResults).toHaveLength(2)
    expect(sequence.callResults[1].input.existingVelocity).toEqual(
      sequence.callResults[0].resultingVelocity,
    )
    expect(sequence.callResults[0].input.call.horizontalBaseDirection).toEqual({ x: 0, z: 1.5 })
    expect(sequence.callResults[1].input.call.horizontalBaseDirection).toEqual({ x: 1, z: 0 })
  })

  it('keeps the trace ordered when calls are reversed', () => {
    const secondCall: KnockbackCall = {
      damageArgument: 4,
      horizontalBaseDirection: { x: 1, z: 0 },
      scaling: { kind: 'ordinaryDamage' },
    }
    const forward = applySulfurCubeAttackSequence(
      { x: 0, y: 0, z: 0 },
      [inputs.call, secondCall],
      inputs.context,
      standardNumerics,
    )
    const reverse = applySulfurCubeAttackSequence(
      { x: 0, y: 0, z: 0 },
      [secondCall, inputs.call],
      inputs.context,
      standardNumerics,
    )

    expect(forward.callResults[0].input.call).toEqual(inputs.call)
    expect(reverse.callResults[0].input.call).toEqual(secondCall)
    expect(forward.callResults[0].resultingVelocity).not.toEqual(
      reverse.callResults[0].resultingVelocity,
    )
  })

  it('clamps each call independently instead of merging their multiplier', () => {
    const context = {
      ...inputs.context,
      properties: {
        horizontalPower: 1000,
        verticalPower: 0,
        knockbackResistance: 0,
      },
    }
    const oneCall = applySulfurCubeAttackSequence(
      { x: 0, y: 0, z: 0 },
      [{ ...inputs.call, damageArgument: 4 }],
      context,
      standardNumerics,
    )
    const twoCalls = applySulfurCubeAttackSequence(
      { x: 0, y: 0, z: 0 },
      [inputs.call, inputs.call],
      context,
      standardNumerics,
    )

    expect(Math.hypot(oneCall.resultingVelocity.x, oneCall.resultingVelocity.z)).toBeCloseTo(
      128,
      10,
    )
    expect(Math.hypot(twoCalls.resultingVelocity.x, twoCalls.resultingVelocity.z)).toBeCloseTo(
      256,
      10,
    )
  })
})
