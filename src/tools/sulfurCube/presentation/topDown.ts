import type { ClearRayEntityReachResult } from '../model/reach'
import type {
  HorizontalVector,
  KnockbackCallResult,
  SulfurCubeKnockbackOperationResult,
  VelocityOperationSequenceResult,
} from '../model/types'
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import type { PlanePoint, WorldBounds } from './types'
import { je26_3Constants } from '../data/je26_3'
import {
  aimArrowLength,
  launchVectorDisplayLength,
  maximumRenderedTrajectoryTicks,
} from './verticalScene'

export const topDownDirectionVectorLength = 2.25
export const topDownAimArcRadius = 1.15
export const topDownDirectionAdjustmentArcRadius = 0.82
export const topDownLaunchOffsetArcRadius = 0.82
export const topDownSceneCameraHalfWidth = 6
export const topDownSceneCameraHalfHeight = 4.75

export interface TopDownCallDirectionPresentation {
  readonly index: number
  readonly providerId: string | null
  readonly baseEnd: PlanePoint
  readonly rotatedEnd: PlanePoint
  readonly addedVelocityDisplayEnd: PlanePoint
  readonly horizontalAngleDelta: number
  readonly horizontalRotationAngle: number
}

export interface TopDownScenePresentation {
  readonly bounds: WorldBounds
  readonly cube: {
    readonly center: PlanePoint
    readonly width: number
  }
  readonly attacker: {
    readonly center: PlanePoint
    readonly width: number
  }
  readonly aimPoint: PlanePoint
  readonly aimArrowEnd: PlanePoint
  readonly targetBearingEnd: PlanePoint
  readonly aimErrorArc: readonly PlanePoint[]
  readonly aimErrorLabelPoint: PlanePoint | null
  readonly aimErrorRadians: number
  readonly directionAdjustmentArc: readonly PlanePoint[]
  readonly directionAdjustmentLabelPoint: PlanePoint | null
  readonly horizontalDirectionAdjustmentRadians: number
  readonly feetAxisBeyondCubeEnd: PlanePoint
  readonly launchOffsetArc: readonly PlanePoint[]
  readonly launchOffsetLabelPoint: PlanePoint | null
  readonly launchOffsetRadians: number
  readonly reach: ClearRayEntityReachResult
  readonly calls: readonly TopDownCallDirectionPresentation[]
  readonly launchEnd: PlanePoint
  readonly launchDisplayLength: number
  readonly trajectory: readonly {
    readonly tick: number
    readonly point: PlanePoint
    readonly floorCollision: boolean
  }[]
  readonly trajectoryEndMarker: PlanePoint | null
  readonly trajectoryStatus: 'settled' | 'truncated'
}

function createAnglePresentation(
  origin: PlanePoint,
  start: HorizontalVector,
  end: HorizontalVector,
  radius: number,
  minimumLength: number,
): {
  readonly arc: readonly PlanePoint[]
  readonly label: PlanePoint | null
  readonly angle: number
} {
  const startLength = Math.hypot(start.x, start.z)
  const endLength = Math.hypot(end.x, end.z)

  if (startLength < minimumLength || endLength < minimumLength) {
    return { arc: [], label: null, angle: 0 }
  }

  const angle = Math.atan2(start.x * end.z - start.z * end.x, start.x * end.x + start.z * end.z)
  const startAngle = Math.atan2(start.z, start.x)
  const sampleCount = 20
  const arc = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const sampleAngle = startAngle + (angle * index) / sampleCount

    return {
      x: origin.x + Math.cos(sampleAngle) * radius,
      y: origin.y + Math.sin(sampleAngle) * radius,
    }
  })
  const labelAngle = startAngle + angle / 2

  return {
    arc,
    label: {
      x: origin.x + Math.cos(labelAngle) * (radius + 0.24),
      y: origin.y + Math.sin(labelAngle) * (radius + 0.24),
    },
    angle,
  }
}

function createDirectionAdjustmentPresentation(
  origin: PlanePoint,
  baseDirection: HorizontalVector,
  angle: number,
  minimumLength: number,
): { readonly arc: readonly PlanePoint[]; readonly label: PlanePoint | null } {
  if (
    Math.hypot(baseDirection.x, baseDirection.z) < minimumLength ||
    Math.abs(angle) < minimumLength
  ) {
    return { arc: [], label: null }
  }

  const startAngle = Math.atan2(baseDirection.z, baseDirection.x)
  const sampleCount = 20
  const arc = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const sampleAngle = startAngle + (angle * index) / sampleCount

    return {
      x: origin.x + Math.cos(sampleAngle) * topDownDirectionAdjustmentArcRadius,
      y: origin.y + Math.sin(sampleAngle) * topDownDirectionAdjustmentArcRadius,
    }
  })
  const labelAngle = startAngle + angle / 2
  const labelRadius = topDownDirectionAdjustmentArcRadius + 0.24

  return {
    arc,
    label: {
      x: origin.x + Math.cos(labelAngle) * labelRadius,
      y: origin.y + Math.sin(labelAngle) * labelRadius,
    },
  }
}

function toTopDownPoint(vector: { readonly x: number; readonly z: number }): PlanePoint {
  return { x: vector.x, y: vector.z }
}

function addScaledHorizontalVector(
  origin: PlanePoint,
  vector: HorizontalVector,
  displayLength: number,
  minimumLength: number,
): PlanePoint {
  const length = Math.hypot(vector.x, vector.z)

  if (length < minimumLength) {
    return origin
  }

  return {
    x: origin.x + (vector.x / length) * displayLength,
    y: origin.y + (vector.z / length) * displayLength,
  }
}

function addProjectedHorizontalVector(
  origin: PlanePoint,
  vector: HorizontalVector,
  scale: number,
): PlanePoint {
  return {
    x: origin.x + vector.x * scale,
    y: origin.y + vector.z * scale,
  }
}

function getCallResults(evaluation: DiagnosticEvaluation): readonly {
  readonly providerId: string | null
  readonly result: KnockbackCallResult
}[] {
  if (hasOperationSequence(evaluation)) {
    return evaluation.operationSequence.operationResults
      .filter(
        (result): result is SulfurCubeKnockbackOperationResult =>
          result.kind === 'sulfurCubeKnockbackCall',
      )
      .map((result) => ({
        providerId: result.operation.providerId,
        result: result.knockbackResult,
      }))
  }

  return [{ providerId: null, result: evaluation.callResult }]
}

function hasOperationSequence(
  evaluation: DiagnosticEvaluation,
): evaluation is DiagnosticEvaluation & {
  readonly operationSequence: VelocityOperationSequenceResult
} {
  return 'operationSequence' in evaluation
}

function createAimErrorPresentation(
  origin: PlanePoint,
  look: HorizontalVector,
  target: HorizontalVector,
  angleDelta: number,
  minimumLength: number,
): { readonly arc: readonly PlanePoint[]; readonly label: PlanePoint | null } {
  if (
    Math.hypot(look.x, look.z) < minimumLength ||
    Math.hypot(target.x, target.z) < minimumLength
  ) {
    return { arc: [], label: null }
  }

  const startAngle = Math.atan2(look.z, look.x)
  const sampleCount = 20
  const arc = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = startAngle + (angleDelta * index) / sampleCount

    return {
      x: origin.x + Math.cos(angle) * topDownAimArcRadius,
      y: origin.y + Math.sin(angle) * topDownAimArcRadius,
    }
  })
  const labelAngle = startAngle + angleDelta / 2
  const labelRadius = topDownAimArcRadius + 0.28

  return {
    arc,
    label: {
      x: origin.x + Math.cos(labelAngle) * labelRadius,
      y: origin.y + Math.sin(labelAngle) * labelRadius,
    },
  }
}

export function createTopDownScenePresentation(
  evaluation: DiagnosticEvaluation,
): TopDownScenePresentation {
  const { context } = evaluation.callResult.input
  const minimumLength = context.mechanics.vectorNormalizationThreshold
  const cubeCenter = toTopDownPoint(evaluation.callResult.diagnostics.cubeCenter)
  const attackerCenter = toTopDownPoint(context.attacker.feetPosition)
  const aimPoint = toTopDownPoint(evaluation.inputs.aimPoint)
  const lookHorizontal = {
    x: evaluation.callResult.diagnostics.normalizedLookDirection.x,
    z: evaluation.callResult.diagnostics.normalizedLookDirection.z,
  }
  const targetHorizontal = {
    x: evaluation.callResult.diagnostics.eyeToCenterDirection.x,
    z: evaluation.callResult.diagnostics.eyeToCenterDirection.z,
  }
  const aimArrowEnd = addProjectedHorizontalVector(attackerCenter, lookHorizontal, aimArrowLength)
  const targetBearingEnd = addScaledHorizontalVector(
    attackerCenter,
    targetHorizontal,
    aimArrowLength,
    minimumLength,
  )
  const aimError = createAimErrorPresentation(
    attackerCenter,
    lookHorizontal,
    targetHorizontal,
    evaluation.callResult.diagnostics.horizontalAngleDelta,
    minimumLength,
  )
  const callResults = getCallResults(evaluation)
  const calls = callResults.map(({ providerId, result }, index) => ({
    index,
    providerId,
    baseEnd: addScaledHorizontalVector(
      cubeCenter,
      result.diagnostics.originalHorizontalDirection,
      topDownDirectionVectorLength,
      minimumLength,
    ),
    rotatedEnd: addScaledHorizontalVector(
      cubeCenter,
      result.diagnostics.normalizedHorizontalDirection,
      topDownDirectionVectorLength,
      minimumLength,
    ),
    addedVelocityDisplayEnd: addScaledHorizontalVector(
      cubeCenter,
      { x: result.addedVelocity.x, z: result.addedVelocity.z },
      launchVectorDisplayLength(Math.hypot(result.addedVelocity.x, result.addedVelocity.z)),
      minimumLength,
    ),
    horizontalAngleDelta: result.diagnostics.horizontalAngleDelta,
    horizontalRotationAngle: result.diagnostics.horizontalRotationAngle,
  }))
  const primaryDirectionAdjustment = callResults[0]
    ? createDirectionAdjustmentPresentation(
        cubeCenter,
        callResults[0].result.diagnostics.originalHorizontalDirection,
        callResults[0].result.diagnostics.horizontalRotationAngle,
        minimumLength,
      )
    : { arc: [], label: null }
  const horizontalLaunch = { x: evaluation.launchVelocity.x, z: evaluation.launchVelocity.z }
  const horizontalSpeed = Math.hypot(horizontalLaunch.x, horizontalLaunch.z)
  const launchDisplayLength = launchVectorDisplayLength(horizontalSpeed)
  const launchEnd = addScaledHorizontalVector(
    cubeCenter,
    horizontalLaunch,
    launchDisplayLength,
    minimumLength,
  )
  const attackerToCube = {
    x: context.cube.feetPosition.x - context.attacker.feetPosition.x,
    z: context.cube.feetPosition.z - context.attacker.feetPosition.z,
  }
  const feetAxisBeyondCubeEnd = addScaledHorizontalVector(
    cubeCenter,
    attackerToCube,
    topDownDirectionVectorLength * 1.15,
    minimumLength,
  )
  const launchOffset = createAnglePresentation(
    cubeCenter,
    attackerToCube,
    horizontalLaunch,
    topDownLaunchOffsetArcRadius,
    minimumLength,
  )
  const trajectory = [
    {
      tick: 0,
      point: toTopDownPoint(evaluation.trajectory.initialState.feetPosition),
      floorCollision: false,
    },
    ...evaluation.trajectory.ticks.slice(0, maximumRenderedTrajectoryTicks).map((tick) => ({
      tick: tick.end.tick,
      point: toTopDownPoint(tick.end.feetPosition),
      floorCollision: tick.collision.floorCollision,
    })),
  ]

  return {
    bounds: {
      minX: cubeCenter.x - topDownSceneCameraHalfWidth,
      maxX: cubeCenter.x + topDownSceneCameraHalfWidth,
      minY: cubeCenter.y - topDownSceneCameraHalfHeight,
      maxY: cubeCenter.y + topDownSceneCameraHalfHeight,
    },
    cube: { center: cubeCenter, width: context.cube.dimensions.width },
    attacker: {
      center: attackerCenter,
      width: je26_3Constants.standingPlayerDimensions.value.width,
    },
    aimPoint,
    aimArrowEnd,
    targetBearingEnd,
    aimErrorArc: aimError.arc,
    aimErrorLabelPoint: aimError.label,
    aimErrorRadians: evaluation.callResult.diagnostics.horizontalAngleDelta,
    directionAdjustmentArc: primaryDirectionAdjustment.arc,
    directionAdjustmentLabelPoint: primaryDirectionAdjustment.label,
    horizontalDirectionAdjustmentRadians: evaluation.callResult.diagnostics.horizontalRotationAngle,
    feetAxisBeyondCubeEnd,
    launchOffsetArc: launchOffset.arc,
    launchOffsetLabelPoint: launchOffset.label,
    launchOffsetRadians: launchOffset.angle,
    reach: evaluation.reach,
    calls,
    launchEnd,
    launchDisplayLength,
    trajectory,
    trajectoryEndMarker: trajectory.length <= 1 ? null : trajectory[trajectory.length - 1]!.point,
    trajectoryStatus: evaluation.trajectory.status,
  }
}
