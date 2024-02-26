import { rgb2lab, separateRgb } from '.'

export const colorMap = {
  White: 0xf9fffe,
  'Light gray': 0x9d9d97,
  Gray: 0x474f52,
  Black: 0x1d1d21,
  Brown: 0x835432,
  Red: 0xb02e26,
  Orange: 0xf9801d,
  Yellow: 0xfed83d,
  Lime: 0x80c71f,
  Green: 0x5e7c16,
  Cyan: 0x169c9c,
  'Light blue': 0x3ab3da,
  Blue: 0x3c44aa,
  Purple: 0x8932b8,
  Magenta: 0xc74ebd,
  Pink: 0xf38baa,
} as const

export const colorRgbMap = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, separateRgb(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

export const colorLabMap = Object.fromEntries(
  Object.entries(colorRgbMap).map(([k, v]) => [k, rgb2lab(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>
