export const imgNames = {
  white: 'White',
  lightGray: 'Light_Gray',
  gray: 'Gray',
  black: 'Black',
  brown: 'Brown',
  red: 'Red',
  orange: 'Orange',
  yellow: 'Yellow',
  lime: 'Lime',
  green: 'Green',
  cyan: 'Cyan',
  lightBlue: 'Light_Blue',
  blue: 'Blue',
  purple: 'Purple',
  magenta: 'Magenta',
  pink: 'Pink',
} as Record<Color, string>

export function colorStringToRgb(color: string): [number, number, number] {
  const hex = color.slice(1)
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return [r, g, b]
}

export type Color =
  | 'white'
  | 'lightGray'
  | 'gray'
  | 'black'
  | 'brown'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'cyan'
  | 'lightBlue'
  | 'blue'
  | 'purple'
  | 'magenta'
  | 'pink'

export function integerRgbToFloat(rgb: [number, number, number]): [number, number, number] {
  return rgb.map((v) => Number.parseFloat((v / 255.0).toFixed(2))) as [number, number, number]
}

export function separateRgb(rgb: number): [number, number, number] {
  return [(rgb & 0xff0000) >> 16, (rgb & 0x00ff00) >> 8, (rgb & 0x0000ff) >> 0]
}

function linearize(channel: number) {
  const value = channel / 255
  return value > 0.04045 ? ((value + 0.055) / 1.055) ** 2.4 : value / 12.92
}

// A full beam-color search converts millions of colors with the same 256 channel values.
const linearChannels = Array.from({ length: 256 }, (_, channel) => linearize(channel))

export function rgb2lab([red, green, blue]: number[]) {
  const r = linearChannels[red] ?? linearize(red)
  const g = linearChannels[green] ?? linearize(green)
  const b = linearChannels[blue] ?? linearize(blue)

  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

  x = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116
  y = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116
  z = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

export function deltaE(labA: number[], labB: number[]) {
  const deltaL = labA[0] - labB[0]
  const deltaA = labA[1] - labB[1]
  const deltaB = labA[2] - labB[2]
  const c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2])
  const c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2])
  const deltaC = c1 - c2
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH)
  const sc = 1.0 + 0.045 * c1
  const sh = 1.0 + 0.015 * c1
  const deltaLKlsl = deltaL / 1.0
  const deltaCkcsc = deltaC / sc
  const deltaHkhsh = deltaH / sh
  const i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh
  return i < 0 ? 0 : Math.sqrt(i)
}
