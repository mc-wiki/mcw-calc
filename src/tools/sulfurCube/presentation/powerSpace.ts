import type { KnockbackCallResult } from '../model/types'
import type { PlanePoint, WorldBounds } from './types'
import { createWorldBounds } from './worldToSvg'

export type PowerStageId = 'base' | 'aim' | 'elevation' | 'capped'

export interface PowerStagePresentation {
  readonly id: PowerStageId
  readonly point: PlanePoint
}

export interface PowerSpacePresentation {
  readonly bounds: WorldBounds
  readonly limitBounds: WorldBounds
  readonly aimRange: {
    readonly start: PlanePoint
    readonly end: PlanePoint
  }
  readonly elevationArc: readonly PlanePoint[]
  readonly aimArrowEnd: PlanePoint
  readonly elevationArrowStart: PlanePoint
  readonly elevationArrowEnd: PlanePoint
  readonly stages: readonly PowerStagePresentation[]
  readonly capApplied: boolean
  readonly capFactor: number
}

function createStageArrowEnd(from: PlanePoint, to: PlanePoint, offset: number): PlanePoint {
  const deltaX = to.x - from.x
  const deltaY = to.y - from.y
  const length = Math.hypot(deltaX, deltaY)

  if (length === 0) {
    return to
  }

  const appliedOffset = Math.min(offset, length * 0.5)

  return {
    x: to.x - (appliedOffset * deltaX) / length,
    y: to.y - (appliedOffset * deltaY) / length,
  }
}

function createElevationArc(
  from: PlanePoint,
  to: PlanePoint,
  signedAngle: number,
): readonly PlanePoint[] {
  const startAngle = Math.atan2(from.y, from.x)
  const radius = Math.hypot(from.x, from.y)
  const sampleCount = 18

  if (radius === 0 || signedAngle === 0) {
    return [from, to]
  }

  return Array.from({ length: sampleCount + 1 }, (_, index) => {
    const angle = startAngle + (signedAngle * index) / sampleCount

    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    }
  })
}

export function createPowerSpacePresentation(
  callResult: KnockbackCallResult,
): PowerSpacePresentation {
  const values = callResult.diagnostics
  const limitBounds = {
    minX: -values.h0,
    maxX: values.h0,
    minY: -values.v0,
    maxY: values.v0,
  }
  const stages: readonly PowerStagePresentation[] = [
    { id: 'base', point: { x: values.h0, y: values.v0 } },
    { id: 'aim', point: { x: values.h1, y: values.v1 } },
    { id: 'elevation', point: { x: values.h2, y: values.v2 } },
    { id: 'capped', point: { x: values.h3, y: values.v3 } },
  ]
  const aimTransferScale = callResult.input.context.mechanics.verticalHitAngleScale
  const aimRange = {
    start: {
      x: values.h0 * (1 + aimTransferScale),
      y: values.v0 * (1 - aimTransferScale),
    },
    end: {
      x: values.h0 * (1 - aimTransferScale),
      y: values.v0 * (1 + aimTransferScale),
    },
  }
  const elevationArc = createElevationArc(
    { x: values.h1, y: values.v1 },
    { x: values.h2, y: values.v2 },
    values.powerRotationAngle,
  )
  const aimArrowEnd = createStageArrowEnd(
    { x: values.h0, y: values.v0 },
    { x: values.h1, y: values.v1 },
    values.h0 * 0.035,
  )
  const elevationArrowStart = elevationArc[Math.max(0, elevationArc.length - 2)] ?? {
    x: values.h1,
    y: values.v1,
  }
  const elevationArrowEnd = createStageArrowEnd(
    elevationArrowStart,
    { x: values.h2, y: values.v2 },
    values.h0 * 0.035,
  )
  const minimumWidth = Math.max(values.h0 * 2.8, 0.5)
  const minimumHeight = Math.max(values.v0 * 4, 0.25)
  const margin = Math.max(values.h0 * 0.12, values.v0 * 0.3, 0.025)
  const bounds = createWorldBounds(
    [
      { x: limitBounds.minX, y: limitBounds.minY },
      { x: limitBounds.maxX, y: limitBounds.maxY },
      { x: 0, y: 0 },
      aimRange.start,
      aimRange.end,
      ...elevationArc,
      ...stages.map((stage) => stage.point),
    ],
    minimumWidth,
    minimumHeight,
    margin,
  )

  return {
    bounds,
    limitBounds,
    aimRange,
    elevationArc,
    aimArrowEnd,
    elevationArrowStart,
    elevationArrowEnd,
    stages,
    capApplied: values.capFactor < 1,
    capFactor: values.capFactor,
  }
}
