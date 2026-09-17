import type { Je26_3UniformFloorProfileId } from '../data/je26_3'
import type { ClearRayEntityReachResult } from '../model/reach'
import type {
  CubeLaunchProperties,
  KnockbackCallResult,
  LaunchSummary,
  SulfurCubeKnockbackContext,
  UniformFloorTrajectoryResult,
  Vec3,
} from '../model/types'
import type { NumericBackend } from '../numerics/types'
import {
  je26_3Constants,
  je26_3KnockbackMechanics,
  je26_3UniformFloorProfiles,
} from '../data/je26_3'
import { applySulfurCubeKnockbackCall } from '../model/knockbackCall'
import { summarizeLaunchVelocity } from '../model/launchSummary'
import { simulateRepeatedUniformFloorTrajectory } from '../model/trajectory'
import { lengthVec3, normalizeVec3, subtractVec3 } from '../model/vectors'
import { standardNumerics } from '../numerics/standard'
import {
  createBouncyCubeLaunchProperties,
  createRestingGroundVelocity,
  createSulfurCubeContext,
  createUniformFloorTrajectoryAssumptions,
} from './defaults'
import { resolveOrdinarySurvivalPlayerMeleeReach } from './playerMeleeReach'

export interface DiagnosticInputs {
  readonly cubeFeetPosition: Vec3
  readonly attackerFeetPosition: Vec3
  readonly attackerEyePosition: Vec3
  readonly aimPoint: Vec3
  readonly damageArgument: number
  readonly trajectoryTicks: number
  readonly floorProfileId: Je26_3UniformFloorProfileId
}

export interface DiagnosticEvaluation {
  readonly inputs: DiagnosticInputs
  readonly properties: CubeLaunchProperties
  readonly callResult: KnockbackCallResult
  /** Stored grounded Motion immediately before the attack is processed. */
  readonly preAttackVelocity: Vec3
  /** Net velocity added by every ordered operation in the attack. */
  readonly attackAddedVelocity: Vec3
  /** Resulting post-hit Motion used by the scenes and trajectory continuation. */
  readonly launchVelocity: Vec3
  readonly trajectory: UniformFloorTrajectoryResult
  readonly launchSummary: LaunchSummary
  readonly reach: ClearRayEntityReachResult
}

/** Hard safety limit for complete uniform-floor settlement calculations. */
export const maximumTrajectoryTicks = 6000
export const defaultUniformFloorProfileId: Je26_3UniformFloorProfileId = 'ordinary_full_block'

export function createDefaultDiagnosticInputs(
  numerics: NumericBackend = standardNumerics,
): DiagnosticInputs {
  const attackerFeetPosition = { x: 0, y: -0.3, z: -2.6 } as const
  const inputs: DiagnosticInputs = {
    cubeFeetPosition: { x: 0, y: 0, z: 0 },
    attackerFeetPosition,
    attackerEyePosition: {
      x: attackerFeetPosition.x,
      y:
        attackerFeetPosition.y +
        numerics.sourceFloat(je26_3Constants.standingPlayerEyeHeight.value),
      z: attackerFeetPosition.z,
    },
    aimPoint: { x: 0, y: 0.4, z: 1.7 },
    damageArgument: 1,
    trajectoryTicks: 0,
    floorProfileId: defaultUniformFloorProfileId,
  }

  return {
    ...inputs,
    trajectoryTicks: findDefaultTrajectoryTicks(inputs, numerics),
  }
}

function assertFiniteVec3(vector: Vec3, name: string): void {
  for (const [component, value] of Object.entries(vector)) {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${name}.${component} must be finite`)
    }
  }
}

export function createDiagnosticKnockbackContext(
  inputs: DiagnosticInputs,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): SulfurCubeKnockbackContext {
  assertFiniteVec3(inputs.attackerFeetPosition, 'attackerFeetPosition')
  assertFiniteVec3(inputs.attackerEyePosition, 'attackerEyePosition')
  assertFiniteVec3(inputs.aimPoint, 'aimPoint')
  assertFiniteVec3(inputs.cubeFeetPosition, 'cubeFeetPosition')
  if (attackerLookDirection !== undefined) {
    assertFiniteVec3(attackerLookDirection, 'attackerLookDirection')
  }

  if (
    !Number.isInteger(inputs.trajectoryTicks) ||
    inputs.trajectoryTicks < 0 ||
    inputs.trajectoryTicks > maximumTrajectoryTicks
  ) {
    throw new RangeError(`trajectoryTicks must be an integer from 0 to ${maximumTrajectoryTicks}`)
  }

  if (je26_3UniformFloorProfiles[inputs.floorProfileId] === undefined) {
    throw new RangeError(`unknown JE 26.3 uniform floor profile: ${inputs.floorProfileId}`)
  }

  const eyeToAim = subtractVec3(inputs.aimPoint, inputs.attackerEyePosition)
  const vectorNormalizationThreshold = numerics.sourceFloat(
    je26_3KnockbackMechanics.vectorNormalizationThreshold,
  )
  const sourceLookDirection = attackerLookDirection ?? eyeToAim

  if (lengthVec3(sourceLookDirection, numerics) < vectorNormalizationThreshold) {
    throw new RangeError('aimPoint must define a nonzero look direction from attackerEyePosition')
  }

  // A command-derived view vector is intentionally left unnormalized here:
  // SulfurCube normalizes getLookAngle exactly once. The generic target-vector
  // path retains its historical pre-normalization behavior.
  const lookDirection =
    attackerLookDirection === undefined
      ? normalizeVec3(eyeToAim, numerics, vectorNormalizationThreshold)
      : { ...attackerLookDirection }

  return createSulfurCubeContext(
    {
      feetPosition: inputs.attackerFeetPosition,
      eyePosition: inputs.attackerEyePosition,
      lookDirection,
    },
    inputs.cubeFeetPosition,
    numerics,
    properties,
  )
}

export function evaluateDiagnosticInputs(
  inputs: DiagnosticInputs,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): DiagnosticEvaluation {
  if (!Number.isFinite(inputs.damageArgument) || inputs.damageArgument < 0) {
    throw new RangeError('damageArgument must be finite and nonnegative')
  }
  const context = createDiagnosticKnockbackContext(
    inputs,
    numerics,
    properties,
    attackerLookDirection,
  )
  const initialVelocity = createRestingGroundVelocity(properties, numerics)
  const callResult = applySulfurCubeKnockbackCall(
    initialVelocity,
    {
      damageArgument: inputs.damageArgument,
      horizontalBaseDirection: {
        x: inputs.attackerFeetPosition.x - inputs.cubeFeetPosition.x,
        z: inputs.attackerFeetPosition.z - inputs.cubeFeetPosition.z,
      },
      scaling: { kind: 'ordinaryDamage' },
    },
    context,
    numerics,
  )
  const trajectory = simulateRepeatedUniformFloorTrajectory(
    {
      tick: 0,
      feetPosition: context.cube.feetPosition,
      velocity: callResult.resultingVelocity,
      onGround: true,
      supportingFloor: true,
    },
    inputs.trajectoryTicks,
    createUniformFloorTrajectoryAssumptions(
      context.cube.feetPosition.y,
      properties,
      je26_3UniformFloorProfiles[inputs.floorProfileId],
    ),
    numerics,
  )

  return {
    inputs: {
      cubeFeetPosition: { ...inputs.cubeFeetPosition },
      attackerFeetPosition: { ...inputs.attackerFeetPosition },
      attackerEyePosition: { ...inputs.attackerEyePosition },
      aimPoint: { ...inputs.aimPoint },
      damageArgument: inputs.damageArgument,
      trajectoryTicks: inputs.trajectoryTicks,
      floorProfileId: inputs.floorProfileId,
    },
    properties: { ...properties },
    callResult,
    preAttackVelocity: { ...initialVelocity },
    attackAddedVelocity: { ...callResult.addedVelocity },
    launchVelocity: { ...callResult.resultingVelocity },
    trajectory,
    launchSummary: summarizeLaunchVelocity(
      callResult.resultingVelocity,
      numerics.sourceFloat(je26_3KnockbackMechanics.vectorNormalizationThreshold),
      numerics,
    ),
    reach: resolveOrdinarySurvivalPlayerMeleeReach(context),
  }
}

export function findDefaultTrajectoryTicks(
  inputs: DiagnosticInputs,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
  attackerLookDirection?: Vec3,
): number {
  const maximumTicks = maximumTrajectoryTicks
  const evaluation = evaluateDiagnosticInputs(
    { ...inputs, trajectoryTicks: maximumTicks },
    numerics,
    properties,
    attackerLookDirection,
  )
  return evaluation.trajectory.ticks.length
}
