import { describe, expect, it } from 'vitest'
import { je26_3Constants } from '../data/je26_3'
import { deriveCubeGeometry, deriveKnockbackGeometry } from '../model/geometry'
import { standardNumerics } from '../numerics/standard'
import { createAdultSulfurCubeGeometry } from '../presets/defaults'
import { createStandingPlayerGeometry } from '../presets/standingPlayer'

const threshold = je26_3Constants.vectorNormalizationThreshold.value

describe('sulfur cube geometry', () => {
  it('derives center, top, and bottom from feet and dimensions', () => {
    const cube = createAdultSulfurCubeGeometry({ x: 2, y: 3, z: 4 })

    expect(cube.dimensions).toEqual({ width: 0.98, height: 0.98 })
    expect(deriveCubeGeometry(cube)).toEqual({
      center: { x: 2, y: 3.49, z: 4 },
      top: { x: 2, y: 3.9800000000000004, z: 4 },
      bottom: { x: 2, y: 3, z: 4 },
    })
  })

  it('keeps standing eye height in the preset instead of the core geometry type', () => {
    const attacker = createStandingPlayerGeometry({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: -1 })

    expect(attacker.feetPosition).toEqual({ x: 1, y: 2, z: 3 })
    expect(attacker.eyePosition).toEqual({ x: 1, y: 3.62, z: 3 })
  })

  it('maps the top and bottom look limits to q = -1 and q = +1', () => {
    const cube = createAdultSulfurCubeGeometry({ x: 0, y: 0, z: 0 })
    const baseAttacker = createStandingPlayerGeometry({ x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: -1 })
    const first = deriveKnockbackGeometry(baseAttacker, cube, threshold, standardNumerics)
    const top = deriveKnockbackGeometry(
      { ...baseAttacker, lookDirection: first.eyeToTopDirection },
      cube,
      threshold,
      standardNumerics,
    )
    const bottom = deriveKnockbackGeometry(
      { ...baseAttacker, lookDirection: first.eyeToBottomDirection },
      cube,
      threshold,
      standardNumerics,
    )

    expect(top.q).toBeCloseTo(-1, 14)
    expect(bottom.q).toBeCloseTo(1, 14)
  })

  it('clamps look values beyond both vertical limits', () => {
    const cube = createAdultSulfurCubeGeometry({ x: 0, y: 0, z: 0 })
    const base = {
      feetPosition: { x: 0, y: 0, z: 2 },
      eyePosition: { x: 0, y: 1.62, z: 2 },
    }

    expect(
      deriveKnockbackGeometry(
        { ...base, lookDirection: { x: 0, y: 1, z: 0 } },
        cube,
        threshold,
        standardNumerics,
      ).q,
    ).toBe(-1)
    expect(
      deriveKnockbackGeometry(
        { ...base, lookDirection: { x: 0, y: -1, z: 0 } },
        cube,
        threshold,
        standardNumerics,
      ).q,
    ).toBe(1)
  })

  it('uses mirrored signed horizontal angles', () => {
    const cube = createAdultSulfurCubeGeometry({ x: 0, y: 0, z: 0 })
    const left = deriveKnockbackGeometry(
      {
        feetPosition: { x: 0, y: 0, z: 2 },
        eyePosition: { x: 0, y: 1.62, z: 2 },
        lookDirection: { x: -0.25, y: -0.5, z: -1 },
      },
      cube,
      threshold,
      standardNumerics,
    )
    const right = deriveKnockbackGeometry(
      {
        feetPosition: { x: 0, y: 0, z: 2 },
        eyePosition: { x: 0, y: 1.62, z: 2 },
        lookDirection: { x: 0.25, y: -0.5, z: -1 },
      },
      cube,
      threshold,
      standardNumerics,
    )

    expect(left.horizontalAngleDelta).toBeCloseTo(-right.horizontalAngleDelta, 14)
    expect(left.horizontalAngleDelta).toBeGreaterThan(0)
  })

  it('uses the source feet-elevation sign convention', () => {
    const cube = createAdultSulfurCubeGeometry({ x: 0, y: 0, z: 0 })
    const highAttacker = deriveKnockbackGeometry(
      createStandingPlayerGeometry({ x: 0, y: 1, z: 2 }, { x: 0, y: -1, z: -1 }),
      cube,
      threshold,
      standardNumerics,
    )
    const lowAttacker = deriveKnockbackGeometry(
      createStandingPlayerGeometry({ x: 0, y: -1, z: 2 }, { x: 0, y: 0, z: -1 }),
      cube,
      threshold,
      standardNumerics,
    )

    expect(highAttacker.theta).toBeGreaterThan(0)
    expect(lowAttacker.theta).toBeLessThan(0)
  })

  it('clamps collapsed limits to finite source endpoints above and below the cube', () => {
    const cube = createAdultSulfurCubeGeometry({ x: 0, y: 0, z: 0 })
    const above = deriveKnockbackGeometry(
      {
        feetPosition: { x: 0, y: 2, z: 0 },
        eyePosition: { x: 0, y: 3.62, z: 0 },
        lookDirection: { x: 1, y: -1, z: 0 },
      },
      cube,
      threshold,
      standardNumerics,
    )
    const below = deriveKnockbackGeometry(
      {
        feetPosition: { x: 0, y: -3, z: 0 },
        eyePosition: { x: 0, y: -1.38, z: 0 },
        lookDirection: { x: 1, y: 1, z: 0 },
      },
      cube,
      threshold,
      standardNumerics,
    )

    expect(above.q).toBe(1)
    expect(below.q).toBe(-1)
  })

  it('rejects the indeterminate collapsed-limit mapping instead of leaking NaN', () => {
    const cube = createAdultSulfurCubeGeometry({ x: 0, y: 0, z: 0 })

    expect(() =>
      deriveKnockbackGeometry(
        {
          feetPosition: { x: 0, y: 2, z: 0 },
          eyePosition: { x: 0, y: 3.62, z: 0 },
          lookDirection: { x: 0, y: -1, z: 0 },
        },
        cube,
        threshold,
        standardNumerics,
      ),
    ).toThrow(/undefined for coincident limits/)
  })
})
