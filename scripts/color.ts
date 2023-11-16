const colorMap: Record<string, number> = {
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
}

const colorRgbMap = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, separateRgb(v)])
)

const colorLabMap: Record<string, number[]> = Object.fromEntries(
  Object.entries(colorRgbMap).map(([k, v]) => [k, rgb2lab(v)])
)

type Color = (keyof typeof colorMap)[]

function sequenceToColor(c: Color): number[] {
  let color = 0
  const k = c.length - 1
  for (let i = 0; i < c.length; i++) {
    if (i === 0) {
      color += 2 ** -k * colorMap[c[i]]
    } else {
      color += 2 ** (i - k - 1) * colorMap[c[i]]
    }
  }
  return separateRgb(color)
}

function separateRgb(rgb: number): [number, number, number] {
  return [(rgb & 0xff0000) >> 16, (rgb & 0x00ff00) >> 8, (rgb & 0x0000ff) >> 0]
}

function rgb2lab(rgb: number[]) {
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

function deltaE(labA: number[], labB: number[]) {
  let deltaL = labA[0] - labB[0]
  let deltaA = labA[1] - labB[1]
  let deltaB = labA[2] - labB[2]
  let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2])
  let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2])
  let deltaC = c1 - c2
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH)
  let sc = 1.0 + 0.045 * c1
  let sh = 1.0 + 0.015 * c1
  let deltaLKlsl = deltaL / 1.0
  let deltaCkcsc = deltaC / sc
  let deltaHkhsh = deltaH / sh
  let i =
    deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh
  return i < 0 ? 0 : Math.sqrt(i)
}

function colorToSequence(
  color: number,
  sequence: Color = [],
  iteration = 5,
  stepDeltaEs: number[] = []
): [Color, number[]] {
  const colorRgb = separateRgb(color)
  const colorLab = rgb2lab(colorRgb)
  const colors = Object.keys(colorLabMap)

  const colorsFiltered = colors.filter((i) => i !== sequence.at(-1))
  const deltaEs = colorsFiltered.map((c) =>
    deltaE(colorLab, rgb2lab(sequenceToColor([...sequence, c])))
  )

  const minDeltaE = Math.min(...deltaEs)
  if (iteration === 0) {
    return [sequence, [...stepDeltaEs, minDeltaE]]
  }
  const minDeltaEIndex = deltaEs.indexOf(minDeltaE)
  return colorToSequence(
    color,
    [...sequence, colorsFiltered[minDeltaEIndex]] as Color,
    iteration - 1,
    [...stepDeltaEs, minDeltaE]
  )
}

console.log(colorToSequence(0x23eff9))
