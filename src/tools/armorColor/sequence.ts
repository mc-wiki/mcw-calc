import type { Color } from '@/utils/color'
import { deltaE, floatRgbToInteger, rgb2lab } from '@/utils/color'

const combs = [
  ...combsWithRep(6, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(5, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(4, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(3, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(2, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
  ...combsWithRep(1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]),
]

function combsWithRep<T>(r: number, xs: T[] = []): T[][] {
  const comb = (n: number, ys: T[][]): T[][] => {
    if (n === 0) return ys
    if (!ys.length) {
      return comb(
        n - 1,
        xs.map((x) => [x]),
      )
    }

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
  colorRgbMap: Record<Color, [number, number, number]>,
  sequenceToColor: (
    sequence: Color[],
    colorRgbMap: Record<Color, [number, number, number]>,
  ) => [number, number, number],
  targetRgb: [number, number, number],
): [Color[], number, [number, number, number]] {
  const targetLab = rgb2lab(targetRgb)

  let minDeltaE = Infinity
  let minSequence: Color[] = []

  for (const comb of combs) {
    const sequence: Color[] = []
    for (let k = 0; k < comb.length; k++) {
      sequence.push(Object.keys(colorRgbMap)[comb[k]] as Color)
    }

    const color = sequenceToColor(sequence, colorRgbMap)
    const lab = rgb2lab(color)
    const delta = deltaE(lab, targetLab)
    if (delta < minDeltaE) {
      minDeltaE = delta
      minSequence = sequence
    }
  }

  // slice colors from the end if deltaE can be improved or stays the same
  for (let i = minSequence.length - 1; i >= 0; i--) {
    const sequence = minSequence.slice(0, i)
    const color = sequenceToColor(sequence, colorRgbMap)
    const lab = rgb2lab(color)
    const delta = deltaE(lab, targetLab)
    if (delta <= minDeltaE) {
      minDeltaE = delta
      if (i === 1) {
        minSequence = sequence
        break
      }
    } else {
      break
    }
  }

  return [minSequence, minDeltaE, sequenceToColor(minSequence, colorRgbMap)]
}

export function sequenceToColorFloatAverage(
  c: Color[],
  colorRgbMap: Record<Color, [number, number, number]>,
  round = false,
) {
  const color = colorRgbMap[c[0]].map((v) => v / 255) as [number, number, number]
  for (let i = 1; i < c.length; i++) {
    const [r, g, b] = colorRgbMap[c[i]]
    color[0] = (color[0] + r / 255) / 2
    color[1] = (color[1] + g / 255) / 2
    color[2] = (color[2] + b / 255) / 2
    if (round) {
      color[0] = Math.round(color[0])
      color[1] = Math.round(color[1])
      color[2] = Math.round(color[2])
    }
  }
  return floatRgbToInteger(color)
}
