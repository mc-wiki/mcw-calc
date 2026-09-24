import { describe, expect, it } from 'vitest'
import {
  rotateAimInRadialProjection,
  rotateAimInTopDownProjection,
} from '../presentation/aimInteraction'

const eye = { x: 0, y: 1.62, z: 0 }
const look = { x: 0.6, y: 0.3, z: Math.sqrt(0.55) }

function directionTo(point: { x: number; y: number; z: number }) {
  return {
    x: (point.x - eye.x) / 3,
    y: (point.y - eye.y) / 3,
    z: (point.z - eye.z) / 3,
  }
}

describe('projected aim interaction', () => {
  it('rotates a fixed-length radial projection and preserves the lateral component', () => {
    const endpoint = rotateAimInRadialProjection(
      eye,
      look,
      { origin: { x: 0, y: 0, z: 0 }, horizontalAxis: { x: 1, y: 0 } },
      { x: 0, y: 4 },
    )
    const result = directionTo(endpoint)

    expect(Math.hypot(result.x, result.y)).toBeCloseTo(Math.hypot(look.x, look.y), 12)
    expect(result.z).toBeCloseTo(look.z, 12)
    expect(Math.hypot(result.x, result.y, result.z)).toBeCloseTo(1, 12)
    expect(Math.hypot(endpoint.x - eye.x, endpoint.y - eye.y, endpoint.z - eye.z)).toBeCloseTo(
      3,
      12,
    )
  })

  it('rotates a fixed-length top-down projection and preserves the vertical component', () => {
    const endpoint = rotateAimInTopDownProjection(eye, look, { x: 0, y: 4 })
    const result = directionTo(endpoint)

    expect(Math.hypot(result.x, result.z)).toBeCloseTo(Math.hypot(look.x, look.z), 12)
    expect(result.y).toBeCloseTo(look.y, 12)
    expect(Math.hypot(result.x, result.y, result.z)).toBeCloseTo(1, 12)
    expect(Math.hypot(endpoint.x - eye.x, endpoint.y - eye.y, endpoint.z - eye.z)).toBeCloseTo(
      3,
      12,
    )
  })

  it('can preserve a separate mechanics aim-point distance', () => {
    const radialEndpoint = rotateAimInRadialProjection(
      eye,
      look,
      { origin: { x: 0, y: 0, z: 0 }, horizontalAxis: { x: 1, y: 0 } },
      { x: 0, y: 4 },
      5,
    )
    const topDownEndpoint = rotateAimInTopDownProjection(eye, look, { x: 0, y: 4 }, 5)

    expect(
      Math.hypot(radialEndpoint.x - eye.x, radialEndpoint.y - eye.y, radialEndpoint.z - eye.z),
    ).toBeCloseTo(5, 12)
    expect(
      Math.hypot(topDownEndpoint.x - eye.x, topDownEndpoint.y - eye.y, topDownEndpoint.z - eye.z),
    ).toBeCloseTo(5, 12)
  })
})
