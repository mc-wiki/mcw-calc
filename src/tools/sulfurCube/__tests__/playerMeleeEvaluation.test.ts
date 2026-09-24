import { describe, expect, it } from 'vitest'
import { projectVectorToRadialPlane } from '../presentation/radialPlane'
import {
  createRadialScenePresentation,
  launchVectorDisplayLength,
} from '../presentation/verticalScene'
import { createDefaultDiagnosticInputs, evaluateDiagnosticInputs } from '../presets/diagnostic'
import {
  createDefaultPlayerMeleeInputs,
  deriveMinecraftYawDegreesFromAim,
  evaluatePlayerMeleeInputs,
  findDefaultPlayerMeleeTrajectoryTicks,
  resolvePlayerMeleeVanillaSurvivalAvailability,
  resolveSharpnessDamageBonus,
} from '../presets/playerMelee'

describe('full-tool primary player melee evaluation', () => {
  it('distinguishes mechanically evaluable settings from vanilla-Survival availability', () => {
    expect(
      resolvePlayerMeleeVanillaSurvivalAvailability({
        weapon: { type: 'bareHand' },
        sharpness: { enabled: false },
        knockback: { enabled: true, level: 2 },
      }),
    ).toEqual({
      status: 'synthetic',
      obtainable: false,
      issues: [
        {
          code: 'enchantmentWithoutItem',
          enchantment: 'knockback',
          weaponPresetId: 'bareHand',
          selectedLevel: 2,
          maximumLevel: 2,
        },
      ],
    })
    expect(
      resolvePlayerMeleeVanillaSurvivalAvailability({
        weapon: { type: 'sword', material: 'iron' },
        sharpness: { enabled: false },
        knockback: { enabled: true, level: 2 },
      }),
    ).toEqual({ status: 'ordinarySurvival', obtainable: true, issues: [] })
  })

  it('preserves the existing one-call launch for the default bare-hand attack', () => {
    const diagnosticInputs = createDefaultDiagnosticInputs()
    const yaw = deriveMinecraftYawDegreesFromAim(diagnosticInputs, 0)
    const existing = evaluateDiagnosticInputs(diagnosticInputs)
    const melee = evaluatePlayerMeleeInputs(diagnosticInputs, createDefaultPlayerMeleeInputs(), yaw)

    expect(Math.abs(yaw)).toBe(0)
    expect(melee.attackResolution.operations).toHaveLength(1)
    expect(melee.attackResolution.diagnostics.damageArgument).toBe(1)
    expect(melee.launchVelocity).toEqual(existing.launchVelocity)
    expect(melee.trajectory).toEqual(existing.trajectory)
  })

  it('keeps a Knockback II sprint hit as two cumulative calls', () => {
    const diagnosticInputs = createDefaultDiagnosticInputs()
    const melee = evaluatePlayerMeleeInputs(
      diagnosticInputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weapon: { type: 'sword', material: 'iron' },
        sprinting: true,
        knockback: { enabled: true, level: 2 },
      },
      deriveMinecraftYawDegreesFromAim(diagnosticInputs, 0),
    )

    expect(melee.attackResolution.diagnostics).toMatchObject({
      damageArgument: 6,
      combinedKnockback: 1.5,
      effectFactor: 0.375,
    })
    expect(melee.operationSequence.operationResults).toHaveLength(2)
    expect(melee.operationSequence.initialVelocity).toEqual(melee.preAttackVelocity)
    expect(melee.preAttackVelocity.y).toBeLessThan(0)
    expect(melee.operationSequence.operationResults[1].existingVelocity).toEqual(
      melee.operationSequence.operationResults[0].resultingVelocity,
    )
    expect(melee.attackAddedVelocity).toEqual({
      x: melee.launchVelocity.x - melee.preAttackVelocity.x,
      y: melee.launchVelocity.y - melee.preAttackVelocity.y,
      z: melee.launchVelocity.z - melee.preAttackVelocity.z,
    })
    expect(melee.launchVelocity).toEqual(melee.operationSequence.resultingVelocity)
    expect(melee.launchVelocity).not.toEqual(melee.callResult.resultingVelocity)
    expect(melee.trajectory.initialState.velocity).toEqual(melee.launchVelocity)

    const scene = createRadialScenePresentation(melee)
    const projectedLaunch = projectVectorToRadialPlane(melee.launchVelocity, scene.projection)
    expect(scene.launchDisplayLength).toBeCloseTo(
      launchVectorDisplayLength(Math.hypot(projectedLaunch.x, projectedLaunch.y)),
      12,
    )
  })

  it('derives critical status rather than accepting the requested conditions as sufficient', () => {
    const diagnosticInputs = createDefaultDiagnosticInputs()
    const yaw = deriveMinecraftYawDegreesFromAim(diagnosticInputs, 0)
    const airborne = evaluatePlayerMeleeInputs(
      diagnosticInputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weapon: { type: 'sword', material: 'iron' },
        criticalHitConditions: true,
      },
      yaw,
    )
    const sprinting = evaluatePlayerMeleeInputs(
      diagnosticInputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weapon: { type: 'sword', material: 'iron' },
        criticalHitConditions: true,
        sprinting: true,
      },
      yaw,
    )

    expect(airborne.attackResolution.diagnostics.critical).toBe(true)
    expect(airborne.attackResolution.diagnostics.damageArgument).toBe(9)
    expect(sprinting.attackResolution.diagnostics.critical).toBe(false)
    expect(sprinting.attackResolution.diagnostics.criticalEligibilityFailures).toContain(
      'sprinting',
    )
  })

  it('retains the previous yaw at a vertically aimed look-direction singularity', () => {
    const inputs = createDefaultDiagnosticInputs()

    expect(
      deriveMinecraftYawDegreesFromAim(
        {
          ...inputs,
          aimPoint: {
            x: inputs.attackerEyePosition.x,
            y: inputs.attackerEyePosition.y + 3,
            z: inputs.attackerEyePosition.z,
          },
        },
        -37.5,
      ),
    ).toBe(-37.5)
  })

  it('produces and strength-scales the Sharpness bonus without critical multiplication', () => {
    const diagnosticInputs = createDefaultDiagnosticInputs()
    const evaluation = evaluatePlayerMeleeInputs(
      diagnosticInputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weapon: { type: 'axe', material: 'netherite' },
        attackStrength: 0.5,
        sharpness: { enabled: true, level: 5 },
      },
      deriveMinecraftYawDegreesFromAim(diagnosticInputs, 0),
    )

    expect(resolveSharpnessDamageBonus({ enabled: true, level: 5 })).toBe(3)
    expect(evaluation.attackResolution.diagnostics).toMatchObject({
      effectiveAttackDamage: 10,
      damageEnchantmentBonus: 3,
      magicBoost: 1.5,
      damageArgument: 5.5,
    })
  })

  it('finds settlement from the cumulative velocity', () => {
    const inputs = createDefaultDiagnosticInputs()
    const meleeInputs = {
      ...createDefaultPlayerMeleeInputs(),
      weapon: { type: 'sword' as const, material: 'iron' as const },
      sprinting: true,
      knockback: { enabled: true as const, level: 2 },
    }
    const yaw = deriveMinecraftYawDegreesFromAim(inputs, 0)
    const tickCount = findDefaultPlayerMeleeTrajectoryTicks(inputs, meleeInputs, yaw)
    const previous = evaluatePlayerMeleeInputs(
      { ...inputs, trajectoryTicks: tickCount - 1 },
      meleeInputs,
      yaw,
    )
    const current = evaluatePlayerMeleeInputs(
      { ...inputs, trajectoryTicks: tickCount },
      meleeInputs,
      yaw,
    )
    expect(previous.trajectory.status).toBe('truncated')
    expect(current.trajectory.status).toBe('settled')
    expect(current.trajectory.endpoint.feetPosition.y).toBe(inputs.cubeFeetPosition.y)
    expect(current.trajectory.firstFloorCollision).not.toBeNull()
  })
})
