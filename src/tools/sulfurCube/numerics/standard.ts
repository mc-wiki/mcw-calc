import type { NumericBackend } from './types'

export const standardNumerics: NumericBackend = Object.freeze({
  id: 'standard',
  sourceFloat: (value: number) => value,
  sqrt: Math.sqrt,
  sin: Math.sin,
  cos: Math.cos,
  atan2: Math.atan2,
  clamp: (value: number, minimum: number, maximum: number) =>
    Math.min(maximum, Math.max(minimum, value)),
})
