import { describe, expect, it } from 'vitest'
import {
  addVec3,
  lengthVec2,
  lengthVec3,
  rotateVec2,
  scaleVec3,
  subtractVec3,
} from '../model/vectors'
import { standardNumerics } from '../numerics/standard'

describe('standard numeric backend', () => {
  it('uses ordinary TypeScript number operations', () => {
    expect(standardNumerics.sourceFloat(1 / 3)).toBe(1 / 3)
    expect(standardNumerics.sqrt(9)).toBe(3)
    expect(standardNumerics.atan2(1, 0)).toBe(Math.PI / 2)
    expect(standardNumerics.clamp(-2, -1, 1)).toBe(-1)
    expect(standardNumerics.clamp(0.25, -1, 1)).toBe(0.25)
    expect(standardNumerics.clamp(2, -1, 1)).toBe(1)
  })
})

describe('foundational vector operations', () => {
  it('adds, subtracts, and scales without mutating inputs', () => {
    const left = { x: 1, y: 2, z: 3 }
    const right = { x: -4, y: 5, z: -6 }

    expect(addVec3(left, right)).toEqual({ x: -3, y: 7, z: -3 })
    expect(subtractVec3(left, right)).toEqual({ x: 5, y: -3, z: 9 })
    expect(scaleVec3(left, 2)).toEqual({ x: 2, y: 4, z: 6 })
    expect(left).toEqual({ x: 1, y: 2, z: 3 })
    expect(right).toEqual({ x: -4, y: 5, z: -6 })
  })

  it('measures vectors through the selected numeric backend', () => {
    expect(lengthVec2({ x: 3, y: 4 }, standardNumerics)).toBe(5)
    expect(lengthVec3({ x: 2, y: 3, z: 6 }, standardNumerics)).toBe(7)
  })

  it('rotates a two-dimensional vector through the selected numeric backend', () => {
    const rotated = rotateVec2({ x: 1, y: 0 }, Math.PI / 2, standardNumerics)

    expect(rotated.x).toBeCloseTo(0, 15)
    expect(rotated.y).toBeCloseTo(1, 15)
  })
})
