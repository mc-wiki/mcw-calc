<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { ref, nextTick, watch } from 'vue'
import { CdxButton, CdxTabs, CdxTab } from '@wikimedia/codex'
import {
  type Color,
  colorToSequence,
  colorStringToRgb,
  sequenceToColorFloatAverage,
  imgNames,
} from '@/utils/color'
import { colorRgbMap as javaColorRgbMap } from '@/utils/color/java'
import { colorRgbMap as bedrockColorRgbMap } from '@/utils/color/bedrock'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ type: 'normal' | 'horse' | 'wolf' }>()

const { t } = useI18n()

const color = ref('#f9fffe')
const edition = ref<'java' | 'bedrock'>('java')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const sequence = ref<[Color[], number, [number, number, number]]>([['white'], 0, [249, 255, 254]])

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

function generateDye(color: Color) {
  return `https://minecraft.wiki/images/Invicon_${imgNames[color]}_Dye.png?format=original`
}

function generateDyeName(color: Color) {
  return t(`armorColor.dye.${color}`)
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
      if (props.type === 'wolf') return
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
  if (props.type === 'horse') {
    img.src = 'https://minecraft.wiki/images/Leather_Horse_Armor_(texture)_JE2.png?format=original'
  } else if (props.type === 'wolf') {
    img.src =
      'https://minecraft.wiki/images/Wolf_Armor_(overlay_texture)_JE2_BE2.png?format=original'

    img.addEventListener('load', () => {
      const dyeCanvas = document.createElement('canvas')
      dyeCanvas.setAttribute('width', '160')
      dyeCanvas.setAttribute('height', '160')
      const dyeCtx = dyeCanvas.getContext('2d')!
      dyeCtx.drawImage(img, 0, 0)
      const dyeImageData = dyeCtx.getImageData(0, 0, dyeCanvas.width, dyeCanvas.height)
      const { data } = dyeImageData
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (data[i] / 255) * colorFloat[0] * 255
        data[i + 1] = (data[i + 1] / 255) * colorFloat[1] * 255
        data[i + 2] = (data[i + 2] / 255) * colorFloat[2] * 255
      }
      dyeCtx.putImageData(dyeImageData, 0, 0)

      const background = new Image()
      background.addEventListener(
        'load',
        () => {
          ctx.drawImage(background, 0, 0)

          ctx.drawImage(dyeCanvas, 0, 0)
        },
        false,
      )

      background.src = 'https://minecraft.wiki/images/Wolf_Armor_JE2_BE2.png?format=original'
    })
  } else {
    img.src = 'https://minecraft.wiki/images/Leather_Tunic_(texture)_JE4_BE3.png?format=original'
  }
  img.crossOrigin = 'anonymous'
})
</script>
<template>
  <CalcField>
    <template #heading>{{ t('armorColor.title', t(`armorColor.type.${props.type}`)) }}</template>

    <cdx-tabs v-model:active="edition">
      <cdx-tab name="java" :label="t('armorColor.java')" />
      <cdx-tab name="bedrock" :label="t('armorColor.bedrock')" />
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
          <label for="color-picker">{{ t('armorColor.color') }}</label>
          <input type="color" v-model="color" id="color-picker" />
          <cdx-button @click="updateSequence(colorStringToRgb(color))">{{
            t('armorColor.calculate')
          }}</cdx-button>
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
          class="explain"
          :title="t('armorColor.sequence.help')"
        >
          {{ t('armorColor.sequence') }}
          <div v-for="(item, index) in sequence[0]" :key="index">
            <img
              :src="generateDye(item)"
              :alt="item"
              :title="generateDyeName(item)"
              :data-minetip-title="generateDyeName(item)"
              style="height: 2em; width: 2em"
              class="explain minetip pixel-image"
            />
          </div>
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
          <span class="explain" :title="t('armorColor.dE.help')">
            {{ t('armorColor.dE') }}
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
  </CalcField>
</template>
