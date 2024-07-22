import { rgb2lab, separateRgb } from '.'

export const colorMap = {
  white: 0xF9FFFE,
  lightGray: 0x9D9D97,
  gray: 0x474F52,
  black: 0x1D1D21,
  brown: 0x835432,
  red: 0xB02E26,
  orange: 0xF9801D,
  yellow: 0xFED83D,
  lime: 0x80C71F,
  green: 0x5E7C16,
  cyan: 0x169C9C,
  lightBlue: 0x3AB3DA,
  blue: 0x3C44AA,
  purple: 0x8932B8,
  magenta: 0xC74EBD,
  pink: 0xF38BAA,
} as const

export const colorRgbMap = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, separateRgb(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

export const colorLabMap = Object.fromEntries(
  Object.entries(colorRgbMap).map(([k, v]) => [k, rgb2lab(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>
