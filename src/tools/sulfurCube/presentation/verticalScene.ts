import type { ClearRayEntityReachResult } from '../model/reach'
import type { Vec2 } from '../model/types'
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import type { RadialAttackerSide } from './radialPlane'
import type { PlanePoint, RadialProjection, WorldBounds } from './types'
import { je26_3Constants } from '../data/je26_3'
import { maximumTrajectoryTicks } from '../presets/diagnostic'
import {
  createRadialProjection,
  projectPointToRadialPlane,
  projectVectorToRadialPlane,
  radialLateralOffset,
} from './radialPlane'

export const maximumRenderedTrajectoryTicks = maximumTrajectoryTicks
export const launchVectorMaximumDisplayLength = 8
export const launchVectorRootSpeedScale = 2.4
export const aimArrowLength = 3
export const thetaArcRadius = 0.78
export const launchElevationArcRadius = 0.9
export const launchElevationArcMinimumDisplayLength = launchElevationArcRadius + 0.25
export const launchElevationLabelRadialOffset = 0.34
export const thetaLabelHorizontalOffset = -0.08
export const thetaLabelVerticalOffset = -0.1
export const cubeFeetLineHalfLength = 3

export const radialSceneCamera = {
  horizontalBlocksBehindCube: 3.25,
  horizontalBlocksPastAttacker: 4.25,
  verticalBlocksBelowCubeFeet: 2.6,
  verticalBlocksAboveCubeFeet: 4.75,
} as const

export interface SceneTrajectoryPoint {
  readonly tick: number
  readonly point: PlanePoint
  readonly floorCollision: boolean
  readonly arcNumber: number | null
}

export interface RadialScenePresentation {
  readonly projection: RadialProjection
  readonly bounds: WorldBounds
  readonly cube: {
    readonly feet: PlanePoint
    readonly center: PlanePoint
    readonly top: PlanePoint
    readonly bottom: PlanePoint
    readonly width: number
    readonly minimumWidth: number
    readonly height: number
  }
  readonly attackerFeet: PlanePoint
  readonly attackerEyes: PlanePoint
  readonly attackerHitbox: {
    readonly bottomLeft: PlanePoint
    readonly topRight: PlanePoint
    readonly width: number
    readonly height: number
  }
  readonly aimPoint: PlanePoint
  readonly aimArrowEnd: PlanePoint
  readonly aimLateralOffset: number
  readonly reach: ClearRayEntityReachResult
  readonly horizontalFeetReference: PlanePoint
  readonly thetaArc: readonly PlanePoint[]
  readonly thetaLabelPoint: PlanePoint
  readonly cubeFeetLineStart: PlanePoint
  readonly cubeFeetLineEnd: PlanePoint
  readonly launchEnd: PlanePoint
  readonly launchElevationArc: readonly PlanePoint[]
  readonly launchElevationLabelPoint: PlanePoint | null
  readonly launchElevationRadians: number
  readonly launchDisplayLength: number
  readonly trajectory: readonly SceneTrajectoryPoint[]
  readonly trajectoryEndMarker: PlanePoint | null
  readonly trajectoryStatus: 'settled' | 'truncated'
  readonly airborneContactCount: number
  readonly bounceEventCount: number
  readonly firstBounce:
    | {
        readonly status: 'reached'
        readonly tick: number
        readonly horizontalDistance: number
        readonly point: PlanePoint
      }
    | { readonly status: 'stays_grounded' | 'no_bounce' | 'not_reached' }
  readonly trajectoryDistance: {
    readonly horizontalDistance: number
    readonly point: PlanePoint
  }
  readonly maximumHeight: {
    readonly heightAboveFloor: number
    readonly point: PlanePoint
  } | null
  readonly renderedTrajectoryTicks: number
  readonly requestedTrajectoryTicks: number
}

export interface RadialScenePresentationOptions {
  readonly attackerSide?: RadialAttackerSide
  readonly fallbackHorizontalAxis?: Vec2
  /** Presentation-only horizon; mechanics summaries continue to use the full evaluation. */
  readonly trajectoryTickLimit?: number
}

function addScaledVector(origin: PlanePoint, vector: PlanePoint, scale: number): PlanePoint {
  return {
    x: origin.x + vector.x * scale,
    y: origin.y + vector.y * scale,
  }
}

/**
 * Presentation-only scaling for the scene velocity arrow. It expands low speeds
 * while remaining monotonically increasing and asymptotically bounded at the maximum
 * display length. Mechanics values and trajectory calculations never use it.
 */
export function launchVectorDisplayLength(speed: number): number {
  if (!Number.isFinite(speed) || speed < 0) {
    throw new RangeError('Velocity display speed must be a finite nonnegative number')
  }

  return (
    -launchVectorMaximumDisplayLength * Math.expm1(-Math.sqrt(speed) / launchVectorRootSpeedScale)
  )
}

function setPlaneVectorLength(
  origin: PlanePoint,
  vector: PlanePoint,
  length: number,
  minimumVectorLength: number,
): PlanePoint {
  const vectorLength = Math.hypot(vector.x, vector.y)

  if (vectorLength < minimumVectorLength) {
    return origin
  }

  return addScaledVector(origin, vector, length / vectorLength)
}

function createThetaPresentation(
  attackerFeet: PlanePoint,
  cubeFeet: PlanePoint,
  theta: number,
  minimumVectorLength: number,
): { readonly arc: readonly PlanePoint[]; readonly label: PlanePoint } {
  const deltaX = cubeFeet.x - attackerFeet.x
  const deltaY = cubeFeet.y - attackerFeet.y
  const length = Math.hypot(deltaX, deltaY)

  if (length < minimumVectorLength) {
    return { arc: [], label: attackerFeet }
  }

  const startAngle = deltaX <= 0 ? Math.PI : 0
  const angleDifference = (deltaX <= 0 ? 1 : -1) * theta
  const sampleCount = 16
  const arc = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = startAngle + (angleDifference * index) / sampleCount

    return {
      x: attackerFeet.x + thetaArcRadius * Math.cos(angle),
      y: attackerFeet.y + thetaArcRadius * Math.sin(angle),
    }
  })
  const labelAngle = startAngle + angleDifference / 2
  const labelRadius = thetaArcRadius + 0.16

  return {
    arc,
    label: {
      x: attackerFeet.x + labelRadius * Math.cos(labelAngle) + thetaLabelHorizontalOffset,
      y: attackerFeet.y + labelRadius * Math.sin(labelAngle) + thetaLabelVerticalOffset,
    },
  }
}

function createLaunchElevationPresentation(
  origin: PlanePoint,
  vector: PlanePoint,
  minimumVectorLength: number,
  showArc: boolean,
): {
  readonly arc: readonly PlanePoint[]
  readonly label: PlanePoint | null
  readonly angle: number
} {
  const length = Math.hypot(vector.x, vector.y)

  if (length < minimumVectorLength) {
    return { arc: [], label: null, angle: 0 }
  }

  const startAngle = vector.x < 0 ? Math.PI : 0
  const endAngle = Math.atan2(vector.y, vector.x)
  const angle = Math.atan2(Math.sin(endAngle - startAngle), Math.cos(endAngle - startAngle))

  if (!showArc) {
    return { arc: [], label: null, angle }
  }
  const sampleCount = 20
  const arc = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const sampleAngle = startAngle + (angle * index) / sampleCount

    return {
      x: origin.x + Math.cos(sampleAngle) * launchElevationArcRadius,
      y: origin.y + Math.sin(sampleAngle) * launchElevationArcRadius,
    }
  })
  const labelAngle = startAngle + angle / 2

  return {
    arc,
    label: {
      x:
        origin.x +
        Math.cos(labelAngle) * (launchElevationArcRadius + launchElevationLabelRadialOffset),
      y:
        origin.y +
        Math.sin(labelAngle) * (launchElevationArcRadius + launchElevationLabelRadialOffset),
    },
    angle,
  }
}

function createCubeAnchoredBounds(
  cubeFeet: PlanePoint,
  cubeWidth: number,
  cubeHeight: number,
): WorldBounds {
  const halfWidth = cubeWidth / 2

  return {
    minX: cubeFeet.x - Math.max(radialSceneCamera.horizontalBlocksPastAttacker, halfWidth + 0.5),
    maxX: cubeFeet.x + Math.max(radialSceneCamera.horizontalBlocksBehindCube, halfWidth + 0.5),
    minY: cubeFeet.y - radialSceneCamera.verticalBlocksBelowCubeFeet,
    maxY: cubeFeet.y + Math.max(radialSceneCamera.verticalBlocksAboveCubeFeet, cubeHeight + 0.5),
  }
}

export function createRadialScenePresentation(
  evaluation: DiagnosticEvaluation,
  projectionOverride?: RadialProjection,
  options: RadialScenePresentationOptions = {},
): RadialScenePresentation {
  const { callResult, inputs, trajectory } = evaluation
  const { context } = callResult.input
  const projection =
    projectionOverride ??
    createRadialProjection(
      context.cube.feetPosition,
      context.attacker.feetPosition,
      context.mechanics.vectorNormalizationThreshold,
      options.attackerSide ?? -1,
      options.fallbackHorizontalAxis ?? { x: 0, y: 1 },
    )
  const cubeFeet = projectPointToRadialPlane(context.cube.feetPosition, projection)
  const cubeCenter = projectPointToRadialPlane(callResult.diagnostics.cubeCenter, projection)
  const cubeTop = projectPointToRadialPlane(callResult.diagnostics.cubeTop, projection)
  const cubeBottom = projectPointToRadialPlane(callResult.diagnostics.cubeBottom, projection)
  const attackerFeet = projectPointToRadialPlane(context.attacker.feetPosition, projection)
  const attackerEyes = projectPointToRadialPlane(context.attacker.eyePosition, projection)
  const standingPlayerDimensions = je26_3Constants.standingPlayerDimensions.value
  const attackerHitbox = {
    bottomLeft: {
      x: attackerFeet.x - standingPlayerDimensions.width / 2,
      y: attackerFeet.y,
    },
    topRight: {
      x: attackerFeet.x + standingPlayerDimensions.width / 2,
      y: attackerFeet.y + standingPlayerDimensions.height,
    },
    width: standingPlayerDimensions.width,
    height: standingPlayerDimensions.height,
  }
  const aimPoint = projectPointToRadialPlane(inputs.aimPoint, projection)
  const projectedLookDirection = projectVectorToRadialPlane(
    callResult.diagnostics.normalizedLookDirection,
    projection,
  )
  const aimArrowEnd = addScaledVector(attackerEyes, projectedLookDirection, aimArrowLength)
  const launchVector = projectVectorToRadialPlane(evaluation.launchVelocity, projection)
  const launchSpeed = Math.hypot(launchVector.x, launchVector.y)
  const launchDisplayLength = launchVectorDisplayLength(launchSpeed)
  const launchEnd = setPlaneVectorLength(
    cubeFeet,
    launchVector,
    launchDisplayLength,
    context.mechanics.vectorNormalizationThreshold,
  )
  const launchElevationPresentation = createLaunchElevationPresentation(
    cubeFeet,
    launchVector,
    context.mechanics.vectorNormalizationThreshold,
    launchDisplayLength >= launchElevationArcMinimumDisplayLength,
  )
  const trajectoryTickLimit = Math.min(
    maximumRenderedTrajectoryTicks,
    Math.max(0, Math.trunc(options.trajectoryTickLimit ?? inputs.trajectoryTicks)),
  )
  const renderedTrajectory = trajectory.ticks.slice(0, trajectoryTickLimit)
  const trajectoryPoints = [
    {
      tick: 0,
      point: projectPointToRadialPlane(trajectory.initialState.feetPosition, projection),
      floorCollision: false,
      arcNumber: null,
    },
    ...renderedTrajectory.map((tick) => ({
      tick: tick.end.tick,
      point: projectPointToRadialPlane(tick.end.feetPosition, projection),
      floorCollision: tick.collision.floorCollision,
      arcNumber: tick.arcNumber,
    })),
  ]
  const maximumHeightTick = trajectory.ticks.reduce<(typeof trajectory.ticks)[number] | null>(
    (highest, tick) =>
      highest === null || tick.end.feetPosition.y > highest.end.feetPosition.y ? tick : highest,
    null,
  )
  const maximumHeightAboveFloor =
    trajectory.maximumDiscreteFeetY - trajectory.initialState.feetPosition.y
  const maximumHeight =
    maximumHeightTick === null || maximumHeightAboveFloor < 3
      ? null
      : {
          heightAboveFloor: maximumHeightAboveFloor,
          point: projectPointToRadialPlane(maximumHeightTick.end.feetPosition, projection),
        }
  const firstBounceTick = trajectory.ticks.find((tick) => tick.rebound.emittedBounceEvent)
  const leftGround = trajectory.ticks.some(
    (tick) =>
      tick.end.feetPosition.y >
        trajectory.assumptions.floorY + context.mechanics.vectorNormalizationThreshold ||
      !tick.end.onGround,
  )
  const firstBounce =
    firstBounceTick === undefined
      ? ({
          status: !leftGround
            ? 'stays_grounded'
            : trajectory.status === 'settled'
              ? 'no_bounce'
              : 'not_reached',
        } as const)
      : ({
          status: 'reached',
          tick: firstBounceTick.end.tick,
          horizontalDistance: Math.hypot(
            firstBounceTick.end.feetPosition.x - trajectory.initialState.feetPosition.x,
            firstBounceTick.end.feetPosition.z - trajectory.initialState.feetPosition.z,
          ),
          point: projectPointToRadialPlane(
            {
              ...firstBounceTick.end.feetPosition,
              y: trajectory.assumptions.floorY,
            },
            projection,
          ),
        } as const)
  const trajectoryDistance = {
    horizontalDistance: trajectory.horizontalDisplacement,
    point: projectPointToRadialPlane(
      {
        ...trajectory.endpoint.feetPosition,
        y: trajectory.assumptions.floorY,
      },
      projection,
    ),
  }
  const horizontalFeetReference = { x: cubeFeet.x, y: attackerFeet.y }
  const thetaPresentation = createThetaPresentation(
    attackerFeet,
    cubeFeet,
    callResult.diagnostics.theta,
    context.mechanics.vectorNormalizationThreshold,
  )
  const projectedCubeWidth =
    context.cube.dimensions.width *
    (Math.abs(projection.horizontalAxis.x) + Math.abs(projection.horizontalAxis.y))
  const bounds = createCubeAnchoredBounds(
    cubeFeet,
    projectedCubeWidth,
    context.cube.dimensions.height,
  )
  const trajectoryHorizontalCoordinates = trajectoryPoints.map(({ point }) => point.x)
  const floorLineMinimumX = Math.min(
    cubeFeet.x - cubeFeetLineHalfLength,
    ...trajectoryHorizontalCoordinates,
  )
  const floorLineMaximumX = Math.max(
    cubeFeet.x + cubeFeetLineHalfLength,
    ...trajectoryHorizontalCoordinates,
  )

  return {
    projection,
    bounds,
    cube: {
      feet: cubeFeet,
      center: cubeCenter,
      top: cubeTop,
      bottom: cubeBottom,
      width: projectedCubeWidth,
      minimumWidth: context.cube.dimensions.width,
      height: context.cube.dimensions.height,
    },
    attackerFeet,
    attackerEyes,
    attackerHitbox,
    aimPoint,
    aimArrowEnd,
    aimLateralOffset: radialLateralOffset(inputs.aimPoint, projection),
    reach: evaluation.reach,
    horizontalFeetReference,
    thetaArc: thetaPresentation.arc,
    thetaLabelPoint: thetaPresentation.label,
    cubeFeetLineStart: { x: floorLineMinimumX, y: cubeFeet.y },
    cubeFeetLineEnd: { x: floorLineMaximumX, y: cubeFeet.y },
    launchEnd,
    launchElevationArc: launchElevationPresentation.arc,
    launchElevationLabelPoint: launchElevationPresentation.label,
    launchElevationRadians: launchElevationPresentation.angle,
    launchDisplayLength,
    trajectory: trajectoryPoints,
    trajectoryEndMarker:
      trajectory.ticks.length === 0
        ? null
        : (trajectoryPoints[trajectoryPoints.length - 1]?.point ?? null),
    trajectoryStatus:
      renderedTrajectory.length < trajectory.ticks.length ? 'truncated' : trajectory.status,
    airborneContactCount: trajectory.airborneContactCount,
    bounceEventCount: trajectory.bounceEventCount,
    firstBounce,
    trajectoryDistance,
    maximumHeight,
    renderedTrajectoryTicks: renderedTrajectory.length,
    requestedTrajectoryTicks: trajectoryTickLimit,
  }
}
