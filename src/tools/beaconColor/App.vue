<script setup lang="ts">
import { ref, computed } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'

const color = ref('#f9fffe')

const colorMap = {
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

function colorStringToRgb(color: string): [number, number, number] {
  const hex = color.slice(1)
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return [r, g, b]
}

const colorRgbMap = Object.fromEntries(
  Object.entries(colorMap).map(([k, v]) => [k, separateRgb(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

const colorLabMap = Object.fromEntries(
  Object.entries(colorRgbMap).map(([k, v]) => [k, rgb2lab(v)]),
) as Record<keyof typeof colorMap, [number, number, number]>

type Color = (keyof typeof colorMap)[]

function sequenceToColor(c: Color): number[] {
  let color = colorMap[c[0]]
  for (let i = 0; i < c.length; i++) {
    color = (color + colorMap[c[i]]) / 2
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
  let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh
  return i < 0 ? 0 : Math.sqrt(i)
}

function colorToSequence(
  color: [number, number, number],
  sequence: Color = [],
  iteration = 7,
  stepDeltaEs: number[] = [],
): [Color, number[]] {
  const colorLab = rgb2lab(color)
  const colors = Object.keys(colorLabMap) as Color

  const colorsFiltered = colors.filter((i) => i !== sequence.at(-1))
  const deltaEs = colorsFiltered.map((c) =>
    deltaE(colorLab, rgb2lab(sequenceToColor([...sequence, c]))),
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
    [...stepDeltaEs, minDeltaE],
  )
}
function formatSequence(sequence: Color, deltaE: number) {}
function best3Sequences(sequence: Color, deltaEs: number[]) {
  const original = deltaEs.slice()
  const best3DeltaE = deltaEs.sort().slice(0, 3)
  const best3Sequences = best3DeltaE.map((d) => {
    const i = original.indexOf(d)
    return [sequence.slice(0, i + 1), d, sequenceToColor(sequence.slice(0, i + 1))]
  })
  return best3Sequences as [Color, number, [number, number, number]][]
}
</script>
<template>
  <label for="color-picker">Color</label>
  <input type="color" v-model="color" id="color-picker" />
  <p>Sequence:</p>
  <ul>
    <li v-for="seq in best3Sequences(...colorToSequence(colorStringToRgb(color)))">
      {{ seq[0].join(' -> ') }} (dE = {{ seq[1].toFixed(2) }})
      <span
        :style="{
          borderRadius: '50%',
          width: '1em',
          height: '1em',
          display: 'inline-block',
          backgroundColor: `rgb(${seq[2][0]}, ${seq[2][1]}, ${seq[2][2]})`,
          border: '1px solid black',
        }"
      ></span>
    </li>
  </ul>
</template>
