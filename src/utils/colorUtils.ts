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

export const combs = [
  ...combsWithRep(5, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
]

export function colorStringToRgb(color: string): [number, number, number] {
  const hex = color.slice(1)
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return [r, g, b]
}

export const colorRgbMap = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, separateRgb(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

export const colorLabMap = Object.fromEntries(
  Object.entries(colorRgbMap).map(([k, v]) => [k, rgb2lab(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

export type Color = keyof typeof colorMap

export function floatRgbToInteger(rgb: [number, number, number]) {
  return rgb.map((v) => Math.floor(v * 255)) as [number, number, number]
}

export function separateRgb(rgb: number): [number, number, number] {
  return [(rgb & 0xff0000) >> 16, (rgb & 0x00ff00) >> 8, (rgb & 0x0000ff) >> 0]
}

export function rgb2lab(rgb: number[]) {
  let r = rgb[0] / 255,
    g = rgb[1] / 255,
    b = rgb[2] / 255,
    x,
    y,
    z

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883

  x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116
  y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116
  z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116

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

function combsWithRep<T>(r: number, xs: T[] = []): T[][] {
  const comb = (n: number, ys: T[][]): T[][] => {
    if (n === 0) return ys
    if (!ys.length)
      return comb(
        n - 1,
        xs.map((x) => [x]),
      )

    return comb(
      n - 1,
      ys.flatMap((zs) => {
        const h = zs[0]
        return xs.slice(xs.indexOf(h)).map((x) => [x, ...zs])
      }),
    )
  }
  return comb(r, [])
}

export function colorToSequence(
  sequenceToColor: (sequence: Color[]) => [number, number, number],
  targetRgb: [number, number, number],
): [Color[], number, [number, number, number]] {
  const targetLab = rgb2lab(targetRgb)

  let minDeltaE = Infinity
  let minSequence: Color[] = []

  for (const comb of combs) {
    const sequence: Color[] = []
    for (let k = 0; k < comb.length; k++) {
      sequence.push(Object.keys(colorMap)[comb[k]] as Color)
    }

    const color = sequenceToColor(sequence)
    const lab = rgb2lab(color)
    const delta = deltaE(lab, targetLab)
    if (delta < minDeltaE) {
      minDeltaE = delta
      minSequence = sequence
    }
  }

  return [minSequence, minDeltaE, sequenceToColor(minSequence)]
}
