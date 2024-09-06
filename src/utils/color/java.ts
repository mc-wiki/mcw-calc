import { rgb2lab, separateRgb } from '.'

export const colorMap = {
  white: 0xf9fffe,
  lightGray: 0x9d9d97,
  gray: 0x474f52,
  black: 0x1d1d21,
  brown: 0x835432,
  red: 0xb02e26,
  orange: 0xf9801d,
  yellow: 0xfed83d,
  lime: 0x80c71f,
  green: 0x5e7c16,
  cyan: 0x169c9c,
  lightBlue: 0x3ab3da,
  blue: 0x3c44aa,
  purple: 0x8932b8,
  magenta: 0xc74ebd,
  pink: 0xf38baa,
} as const

export const colorRgbMap = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, separateRgb(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

export const colorLabMap = Object.fromEntries(
  Object.entries(colorRgbMap).map(([k, v]) => [k, rgb2lab(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>
