import { describe, expect, it } from 'vitest'
import { createFeetAnchoredAabb, resolveClearRayEntityReach } from '../model/reach'
import { adultCubeReachFixtureAabb, playerMeleeClearRayFixtures } from './playerMeleeReachFixtures'

describe('ordinary JE 26.3 player-melee clear-ray reach', () => {
  it.each(playerMeleeClearRayFixtures)('reproduces $id', (fixture) => {
    const result = resolveClearRayEntityReach({
      eye: fixture.eye,
      lookDirection: fixture.lookDirection,
      targetAabb: adultCubeReachFixtureAabb,
      reach: fixture.reach,
      pickRadius: 0,
      canBePickedFromInside: false,
      clipTolerance: 1e-7,
    })

    expect(result.status).toBe(fixture.expectedStatus)
    expect(result.occlusion).toBe('not_evaluated')

    if (fixture.expectedEntryPoint === undefined) {
      expect(result.entryPoint).toBeNull()
      expect(result.entryDistance).toBeNull()
    } else {
      expect(result.entryPoint?.x).toBeCloseTo(fixture.expectedEntryPoint.x, 12)
      expect(result.entryPoint?.y).toBeCloseTo(fixture.expectedEntryPoint.y, 12)
      expect(result.entryPoint?.z).toBeCloseTo(fixture.expectedEntryPoint.z, 12)
      expect(result.entryDistance).toBeCloseTo(fixture.expectedEntryDistance!, 12)
    }
  })

  it('constructs the exact feet-anchored axis-aligned cube box', () => {
    expect(
      createFeetAnchoredAabb({
        feetPosition: { x: 2, y: -1, z: 4 },
        dimensions: { width: 0.98, height: 0.98 },
      }),
    ).toEqual({
      min: { x: 1.51, y: -1, z: 3.51 },
      max: { x: 2.49, y: -0.020000000000000018, z: 4.49 },
    })
  })

  it('rejects a hidden-lateral miss that the old diagonal radial envelope admitted', () => {
    const result = resolveClearRayEntityReach({
      eye: { x: 0, y: 0.49, z: -2.6 },
      lookDirection: { x: 0.5, y: 0, z: Math.sqrt(0.75) },
      targetAabb: adultCubeReachFixtureAabb,
      reach: 3,
      pickRadius: 0,
      canBePickedFromInside: false,
      clipTolerance: 1e-7,
    })

    expect(result.status).toBe('ray_miss')
  })

  it('can represent an entity that permits picking from inside', () => {
    const result = resolveClearRayEntityReach({
      eye: { x: 0, y: 0.49, z: 0 },
      lookDirection: { x: 0, y: 0, z: 1 },
      targetAabb: adultCubeReachFixtureAabb,
      reach: 3,
      pickRadius: 0,
      canBePickedFromInside: true,
      clipTolerance: 1e-7,
    })

    expect(result).toMatchObject({
      status: 'within_reach',
      entryPoint: { x: 0, y: 0.49, z: 0 },
      entryDistance: 0,
    })
  })
})
