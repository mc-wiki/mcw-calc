import type { Vec2, Vec3 } from '../model/types'

export interface PlanePoint {
  readonly x: number
  readonly y: number
}

export interface RadialProjection {
  readonly origin: Vec3
  /** Unit vector in the world X/Z plane, stored as (x, z). */
  readonly horizontalAxis: Vec2
}

export interface WorldBounds {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
}

export interface SvgViewport {
  readonly width: number
  readonly height: number
  readonly padding: {
    readonly top: number
    readonly right: number
    readonly bottom: number
    readonly left: number
  }
}

export interface WorldToSvgTransform {
  readonly scale: number
  readonly bounds: WorldBounds
  readonly viewport: SvgViewport
  readonly toSvg: (point: PlanePoint) => PlanePoint
  readonly toWorld: (point: PlanePoint) => PlanePoint
}
