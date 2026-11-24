import { separateRgb } from '.'
import javaDyes from './javaDyes.json'

export const colorMap = Object.fromEntries(
  Object.entries(javaDyes).map(([name, hex]) => [name, Number.parseInt(hex, 16)]),
) as Readonly<Record<keyof typeof javaDyes, number>>

export const colorRgbMap = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, separateRgb(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

// Java rounds the multiplication and division separately to single precision.
export function scaleDyeChannel(value: number, brightness: number, peak: number) {
  return Math.trunc(Math.fround(Math.fround(value * brightness) / peak))
}

export function craftArmorColor(
  previous: [number, number, number] | undefined,
  dyes: (keyof typeof colorMap)[],
): [number, number, number] {
  const colors = dyes.map((dye) => colorRgbMap[dye])
  if (previous) colors.push(previous)
  const means = [0, 1, 2].map((axis) =>
    Math.floor(colors.reduce((sum, rgb) => sum + rgb[axis], 0) / colors.length),
  )
  const brightness = Math.fround(
    colors.reduce((sum, rgb) => sum + Math.max(...rgb), 0) / colors.length,
  )
  const peak = Math.max(...means)
  return [
    scaleDyeChannel(means[0], brightness, peak),
    scaleDyeChannel(means[1], brightness, peak),
    scaleDyeChannel(means[2], brightness, peak),
  ]
}
