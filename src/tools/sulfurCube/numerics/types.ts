export interface NumericBackend {
  readonly id: string
  readonly sourceFloat: (value: number) => number
  readonly sqrt: (value: number) => number
  readonly sin: (angleRadians: number) => number
  readonly cos: (angleRadians: number) => number
  readonly atan2: (y: number, x: number) => number
  readonly clamp: (value: number, minimum: number, maximum: number) => number
}
