<script setup lang="ts">
import Field from '@/components/Field.vue'
import { ref, nextTick, watch } from 'vue'
import { CdxButton, CdxTabs, CdxTab } from '@wikimedia/codex'
import {
  type Color,
  colorToSequence,
  colorStringToRgb,
  sequenceToColorFloatAverage,
} from '@/utils/color/index.ts'
import { colorRgbMap as javaColorRgbMap } from '@/utils/color/java.ts'
import { colorRgbMap as bedrockColorRgbMap } from '@/utils/color/bedrock.ts'

const color = ref('#f9fffe')
const edition = ref<'java' | 'bedrock'>('java')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const sequence = ref<[Color[], number, [number, number, number]]>([['White'], 0, [249, 255, 254]])

function sequenceToColorJavaArmor(
  c: Color[],
  colorRgbMap: typeof javaColorRgbMap,
): [number, number, number] {
  let numberOfColors = 0
  let totalRed = 0
  let totalGreen = 0
  let totalBlue = 0
  let totalMaximum = 0
  for (const color of c) {
    totalRed = totalRed + colorRgbMap[color][0]
    totalGreen = totalGreen + colorRgbMap[color][1]
    totalBlue = totalBlue + colorRgbMap[color][2]
    totalMaximum = totalMaximum + Math.max(...colorRgbMap[color])
    numberOfColors++
  }
  const averageRed = totalRed / numberOfColors
  const averageGreen = totalGreen / numberOfColors
  const averageBlue = totalBlue / numberOfColors
  const averageMaximum = totalMaximum / numberOfColors
  const maximumOfAverage = Math.max(averageRed, averageGreen, averageBlue)

  const gainFactor = averageMaximum / maximumOfAverage

  const resultRed = averageRed * gainFactor
  const resultGreen = averageGreen * gainFactor
  const resultBlue = averageBlue * gainFactor

  return [resultRed, resultGreen, resultBlue]
}

async function updateSequence(targetColor: [number, number, number]) {
  await nextTick()
  sequence.value = colorToSequence(
    edition.value === 'java' ? javaColorRgbMap : bedrockColorRgbMap,
    edition.value === 'java' ? sequenceToColorJavaArmor : sequenceToColorFloatAverage,
    targetColor,
  )
}

watch([sequence, canvasRef], ([sequence, canvasRef]) => {
  const canvas = canvasRef
  if (!canvas) return
  const color = sequence[2]
  const colorFloat = color.map((c) => c / 255)
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true,
  })
  if (!ctx) return
  const img = new Image()
  img.addEventListener(
    'load',
    () => {
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (data[i] / 255) * colorFloat[0] * 255
        data[i + 1] = (data[i + 1] / 255) * colorFloat[1] * 255
        data[i + 2] = (data[i + 2] / 255) * colorFloat[2] * 255
      }
      ctx.putImageData(imageData, 0, 0)
    },
    false,
  )
  // [[File:Leather Tunic (texture) JE4 BE3.png]]
  img.src = '/images/Leather_Tunic_(texture)_JE4_BE3.png?format=original'
})
</script>
<template>
  <Field>
    <template #heading>Calculate dye sequence for a leather (horse) armor color</template>

    <cdx-tabs v-model:active="edition">
      <cdx-tab name="java" label="Java Edition" />
      <cdx-tab name="bedrock" label="Bedrock Edition" />
    </cdx-tabs>
    <div
      :style="{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
      }"
    >
      <div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <label for="color-picker">Color:</label>
          <input type="color" v-model="color" id="color-picker" />
          <cdx-button @click="updateSequence(colorStringToRgb(color))">Calculate</cdx-button>
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          Sequence: {{ sequence[0].join(' -> ') }}
          <span
            :style="{
              borderRadius: '50%',
              width: '1em',
              height: '1em',
              display: 'inline-block',
              backgroundColor: `rgb(${sequence[2][0]}, ${sequence[2][1]}, ${sequence[2][2]})`,
              border: '1px solid black',
            }"
          ></span>
        </div>
        <div>
          <span
            class="explain"
            title="Delta E is a measure of color proximity. Lower is better. Values ≤1.0 means the difference is not perceptible by human eyes."
          >
            dE
          </span>
          = {{ sequence[1].toFixed(2) }}
        </div>
      </div>
      <canvas
        width="160"
        height="160"
        ref="canvasRef"
        :style="{
          width: '80px',
          height: '80px',
        }"
      ></canvas>
    </div>
  </Field>
</template>
<style>
.cdx-tabs--quiet > .cdx-tabs__header {
  background-color: transparent;
}

.cdx-tabs--quiet > .cdx-tabs__header .cdx-tabs__list__item--enabled [role='tab'] {
  color: var(--content-text-color);
}

.cdx-tabs__next-scroller {
  display: none;
}

ul.cdx-tabs__list {
  margin: 0;
}
</style>
