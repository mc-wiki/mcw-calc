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
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const { t } = useI18n(__TOOL_NAME__, locales)

const color = ref('#f9fffe')
const edition = ref<'java' | 'bedrock'>('java')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const sequence = ref<[Color[], number, [number, number, number]]>([['white'], 0, [249, 255, 254]])

async function updateSequence(targetColor: [number, number, number]) {
  await nextTick()
  sequence.value = colorToSequence(
    edition.value === 'java' ? javaColorRgbMap : bedrockColorRgbMap,
    sequenceToColorFloatAverage,
    targetColor,
  )
}

function generateGlass(color: Color) {
  return `https://minecraft.wiki/images/Invicon_${imgNames[color]}_Stained_Glass_Pane.png?format=original`
}

function generateGlassName(color: Color) {
  return t(`beaconColor.glass.${color}`)
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

  img.src = 'https://minecraft.wiki/images/Beacon_Beam_(texture).png?format=original'
  img.crossOrigin = 'anonymous'
})
</script>
<template>
  <CalcField>
    <template #heading>{{ t('beaconColor.title') }}</template>

    <cdx-tabs v-model:active="edition">
      <cdx-tab name="java" :label="t('beaconColor.java')" />
      <cdx-tab name="bedrock" :label="t('beaconColor.bedrock')" />
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
          <label for="color-picker">{{ t('beaconColor.color') }}</label>
          <input type="color" v-model="color" id="color-picker" />
          <cdx-button @click="updateSequence(colorStringToRgb(color))">{{
            t('beaconColor.calculate')
          }}</cdx-button>
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.1rem',
            padding: '.3em 0px 0px 0px',
          }"
        >
          {{ t('beaconColor.sequence') }}
          <div v-for="(item, index) in sequence[0]" :key="index">
            <img
              :src="generateGlass(item)"
              :alt="item"
              :title="generateGlassName(item)"
              :data-minetip-title="generateGlassName(item)"
              style="height: 2em; width: 2em"
              class="explain minetip"
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
          <span class="explain" :title="t('beaconColor.dE.help')">
            {{ t('beaconColor.dE') }}
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
