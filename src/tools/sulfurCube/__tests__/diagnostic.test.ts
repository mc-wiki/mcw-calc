import type { Vec3 } from '../model/types'
import { describe, expect, it } from 'vitest'
import {
  createDiagnosticFormState,
  createPlayerMeleeFormState,
  parseDiagnosticFormState,
  parsePlayerMeleeFormState,
} from '../components/formState'
import {
  createDefaultDiagnosticInputs,
  evaluateDiagnosticInputs,
  findDefaultTrajectoryTicks,
} from '../presets/diagnostic'
import { createDefaultPlayerMeleeInputs } from '../presets/playerMelee'
import { directMeleeFixtures } from './experimentFixtures'
import { getRecordedLaunchPreset, recordedLaunchPresets } from './recordedLaunchPresets'

const standardExperimentTolerance = 0.00015

function expectVec3Within(actual: Vec3, expected: Vec3, tolerance: number): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(tolerance)
}

describe('diagnostic evaluation', () => {
  it('creates the reader default with standing eyes and a settled trajectory', () => {
    const inputs = createDefaultDiagnosticInputs()
    const previous = evaluateDiagnosticInputs({
      ...inputs,
      trajectoryTicks: inputs.trajectoryTicks - 1,
    })
    const current = evaluateDiagnosticInputs(inputs)

    expect(inputs.cubeFeetPosition).toEqual({ x: 0, y: 0, z: 0 })
    expect(inputs.attackerFeetPosition).toEqual({ x: 0, y: -0.3, z: -2.6 })
    expect(inputs.attackerEyePosition.x).toBe(0)
    expect(inputs.attackerEyePosition.y).toBeCloseTo(1.32, 12)
    expect(inputs.attackerEyePosition.z).toBe(-2.6)
    expect(inputs.aimPoint).toEqual({ x: 0, y: 0.4, z: 1.7 })
    expect(inputs.trajectoryTicks).toBe(80)
    expect(previous.trajectory.status).toBe('truncated')
    expect(current.trajectory.status).toBe('settled')
    expect(current.trajectory.ticks).toHaveLength(inputs.trajectoryTicks)
    expect(current.trajectory.endpoint.feetPosition.y).toBe(inputs.cubeFeetPosition.y)
    expect(current.reach.status).toBe('within_reach')
  })

  it.each(recordedLaunchPresets)('reproduces the $id direct-melee fixture', (preset) => {
    const fixture = directMeleeFixtures.find((candidate) => candidate.id.startsWith(preset.id))
    const evaluation = evaluateDiagnosticInputs({ ...preset.inputs, trajectoryTicks: 10 })

    expect(fixture).toBeDefined()
    expectVec3Within(
      evaluation.callResult.addedVelocity,
      fixture!.expectedAddedVelocity,
      standardExperimentTolerance,
    )
  })

  it('summarizes the M1 launch and requested trajectory horizon', () => {
    const evaluation = evaluateDiagnosticInputs({
      ...getRecordedLaunchPreset('M1').inputs,
      trajectoryTicks: 10,
    })

    expect(evaluation.launchSummary.horizontalSpeed).toBeCloseTo(0.165, 12)
    expect(evaluation.launchSummary.totalSpeed).toBeCloseTo(
      Math.hypot(
        evaluation.launchVelocity.x,
        evaluation.launchVelocity.y,
        evaluation.launchVelocity.z,
      ),
      12,
    )
    expect(evaluation.launchSummary.horizontalDirection).toEqual({ x: 0, y: -1 })
    expect(evaluation.preAttackVelocity.y).toBeLessThan(0)
    expect(evaluation.attackAddedVelocity).toEqual(evaluation.callResult.addedVelocity)
    expect(evaluation.launchVelocity).toEqual(evaluation.callResult.resultingVelocity)
    expect(evaluation.trajectory.ticks).toHaveLength(10)
    expect(evaluation.trajectory.endpoint.feetPosition).toEqual(
      evaluation.trajectory.ticks[9].end.feetPosition,
    )
  })

  it('finds deterministic settlement for the default trajectory length', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const tickCount = findDefaultTrajectoryTicks(inputs)
    const previous = evaluateDiagnosticInputs({ ...inputs, trajectoryTicks: tickCount - 1 })
    const current = evaluateDiagnosticInputs({ ...inputs, trajectoryTicks: tickCount })
    expect(tickCount).toBeGreaterThan(11)
    expect(previous.trajectory.status).toBe('truncated')
    expect(current.trajectory.status).toBe('settled')
    expect(current.trajectory.endpoint.feetPosition.y).toBe(inputs.cubeFeetPosition.y)
    expect(current.trajectory.firstFloorCollision?.end.tick).toBe(9)
    expect(findDefaultTrajectoryTicks(getRecordedLaunchPreset('M8').inputs)).toBeGreaterThan(
      tickCount,
    )
    expect(
      findDefaultTrajectoryTicks({
        ...createDefaultDiagnosticInputs(),
        floorProfileId: 'slime_block',
      }),
    ).toBe(552)
  })

  it('keeps the selected uniform floor independent from cube archetype properties', () => {
    const inputs = createDefaultDiagnosticInputs()
    const ordinary = evaluateDiagnosticInputs({
      ...inputs,
      trajectoryTicks: 300,
      floorProfileId: 'ordinary_full_block',
    })
    const slime = evaluateDiagnosticInputs({
      ...inputs,
      trajectoryTicks: 300,
      floorProfileId: 'slime_block',
    })
    const honey = evaluateDiagnosticInputs({
      ...inputs,
      trajectoryTicks: 300,
      floorProfileId: 'honey_block',
    })

    expect(ordinary.trajectory.bounceEventCount).toBeGreaterThan(0)
    expect(slime.trajectory.bounceEventCount).toBeGreaterThan(ordinary.trajectory.bounceEventCount)
    expect(honey.trajectory.bounceEventCount).toBe(0)
    expect(honey.trajectory.firstFloorCollision).not.toBeNull()
    expect(honey.trajectory.status).toBe('settled')
    expect(slime.trajectory.assumptions.floor.id).toBe('slime_block')
    expect(honey.properties).toEqual(ordinary.properties)
  })

  it('uses the safety cap when Default cannot reach a fixed state', () => {
    const inputs = createDefaultDiagnosticInputs()
    const customPerpetualProperties = {
      horizontalPower: 0.4125,
      verticalPower: 0.105,
      knockbackResistance: -2,
      bounciness: 1,
      frictionModifier: 0,
      airDragModifier: 0,
    }
    const tickCount = findDefaultTrajectoryTicks(
      { ...inputs, floorProfileId: 'slime_block' },
      undefined,
      customPerpetualProperties,
    )
    const evaluation = evaluateDiagnosticInputs(
      { ...inputs, floorProfileId: 'slime_block', trajectoryTicks: tickCount },
      undefined,
      customPerpetualProperties,
    )

    expect(tickCount).toBe(6000)
    expect(evaluation.trajectory.status).toBe('truncated')
  })

  it('keeps feet and eye positions independently supplied', () => {
    const preset = getRecordedLaunchPreset('M1')
    const evaluation = evaluateDiagnosticInputs({
      ...preset.inputs,
      attackerFeetPosition: { ...preset.inputs.attackerFeetPosition, y: 3 },
      attackerEyePosition: { ...preset.inputs.attackerEyePosition, y: 1.7 },
    })

    expect(evaluation.callResult.input.context.attacker.feetPosition.y).toBe(3)
    expect(evaluation.callResult.input.context.attacker.eyePosition.y).toBe(1.7)
  })

  it('evaluates melee reach from the exact 3D eye ray rather than the radial projection', () => {
    const inputs = createDefaultDiagnosticInputs()
    const evaluation = evaluateDiagnosticInputs({
      ...inputs,
      aimPoint: {
        x: inputs.attackerEyePosition.x + 1.5,
        y: inputs.attackerEyePosition.y,
        z: inputs.attackerEyePosition.z - 2.598076211353316,
      },
    })

    expect(evaluation.reach.status).toBe('ray_miss')
    expect(evaluation.reach.occlusion).toBe('not_evaluated')
  })

  it('does not mutate shared preset inputs', () => {
    const preset = getRecordedLaunchPreset('M2')
    const before = JSON.parse(JSON.stringify(preset))

    evaluateDiagnosticInputs(preset.inputs)

    expect(preset).toEqual(before)
  })

  it('round-trips a preset through the numeric form boundary', () => {
    const inputs = getRecordedLaunchPreset('M6').inputs

    expect(parseDiagnosticFormState(createDiagnosticFormState(inputs))).toEqual(inputs)
  })

  it('round-trips and validates the player-melee form boundary', () => {
    const inputs = {
      ...createDefaultPlayerMeleeInputs(),
      weapon: { type: 'sword' as const, material: 'iron' as const },
      attackStrength: 0.75,
      sprinting: true,
      sharpness: { enabled: true as const, level: 4 },
      knockback: { enabled: true as const, level: 2 },
    }
    const form = createPlayerMeleeFormState(inputs)

    expect(parsePlayerMeleeFormState(form)).toEqual(inputs)
    expect(() => parsePlayerMeleeFormState({ ...form, attackStrengthPercent: 101 })).toThrow(
      /between 0 and 100/,
    )
    expect(() => parsePlayerMeleeFormState({ ...form, knockbackLevel: 256 })).toThrow(
      /integer from 1 to 255/,
    )
  })

  it('treats transient empty numeric fields as zero and rejects nonnumeric stored states', () => {
    const form = createDiagnosticFormState(getRecordedLaunchPreset('M1').inputs)

    expect(parseDiagnosticFormState({ ...form, damageArgument: '' }).damageArgument).toBe(0)
    expect(() => parseDiagnosticFormState({ ...form, aimY: 'not-a-number' })).toThrow(/finite/)
  })

  it('rejects invalid product-facing inputs before rendering', () => {
    const preset = getRecordedLaunchPreset('M1')

    expect(() => evaluateDiagnosticInputs({ ...preset.inputs, damageArgument: -1 })).toThrow(
      /damageArgument/,
    )
    expect(() => evaluateDiagnosticInputs({ ...preset.inputs, trajectoryTicks: 6001 })).toThrow(
      /trajectoryTicks/,
    )
    expect(() =>
      evaluateDiagnosticInputs({
        ...preset.inputs,
        floorProfileId: 'not_a_floor' as 'ordinary_full_block',
      }),
    ).toThrow(/uniform floor profile/)
    expect(() =>
      evaluateDiagnosticInputs({
        ...preset.inputs,
        attackerEyePosition: { ...preset.inputs.attackerEyePosition, x: Number.NaN },
      }),
    ).toThrow(/finite/)
    expect(() =>
      evaluateDiagnosticInputs({
        ...preset.inputs,
        cubeFeetPosition: { ...preset.inputs.cubeFeetPosition, x: Number.NaN },
      }),
    ).toThrow(/cubeFeetPosition/)
    expect(() =>
      evaluateDiagnosticInputs({
        ...preset.inputs,
        aimPoint: preset.inputs.attackerEyePosition,
      }),
    ).toThrow(/look direction/)
  })
})
