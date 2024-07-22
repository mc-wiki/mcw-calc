import { describe, expect, it } from 'vitest'
import { hashCode } from './seed'

describe('hashCode', () => {
  it('should return the correct hash code', () => {
    const input = 'hello'
    expect(hashCode(input)).toBe(99162322)
  })

  it('should handle empty string', () => {
    expect(hashCode('')).toBe(0)
  })
})
