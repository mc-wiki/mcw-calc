import { describe, expect, it } from 'vitest'
import { parseNumericInput, sanitizeNumericInput } from '../input/numericInput'

describe('numeric form-input boundary', () => {
  it('keeps one signed decimal value and removes unsupported characters', () => {
    expect(sanitizeNumericInput('12a.3.4')).toBe('12.34')
    expect(sanitizeNumericInput('-1,25')).toBe('-1.25')
    expect(sanitizeNumericInput('abc')).toBe('')
  })

  it('treats empty and transitional edit states as zero', () => {
    expect(parseNumericInput('')).toBe(0)
    expect(parseNumericInput('-')).toBe(0)
    expect(parseNumericInput('.')).toBe(0)
    expect(parseNumericInput('-.')).toBe(0)
  })

  it('accepts either decimal separator and rejects unsupported stored syntax', () => {
    expect(parseNumericInput('-1,25')).toBe(-1.25)
    expect(parseNumericInput('.5')).toBe(0.5)
    expect(parseNumericInput('1e2')).toBeNull()
    expect(parseNumericInput('not-a-number')).toBeNull()
  })
})
