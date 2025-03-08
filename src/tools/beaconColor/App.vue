<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { type Color, colorStringToRgb, imgNames } from '@/utils/color'
import { getImageLink } from '@/utils/image'
import { CdxButton, CdxTab, CdxTabs } from '@wikimedia/codex'
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const color = ref('#f9fffe')
const edition = ref<'java' | 'bedrock'>('java')
const canvasRef = useTemplateRef('canvasRef')
const sequence = ref<[Color[], number, [number, number, number]]>([['white'], 0, [249, 255, 254]])

const worker = new ComlinkWorker<typeof import('./worker')>(new URL('./worker', import.meta.url))

async function updateSequence(targetColor: [number, number, number]) {
  await nextTick()
  sequence.value = await worker.colorToSequence(edition.value, targetColor)
}

function generateGlass(color: Color) {
  return getImageLink(`en:Invicon_${imgNames[color]}_Stained_Glass_Pane.png`)
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

  img.src = getImageLink('en:Beacon_Beam_(texture).png')
  img.crossOrigin = 'anonymous'
})
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('beaconColor.title') }}
    </template>

    <CdxTabs v-model:active="edition" class="mb-2">
      <CdxTab name="java" :label="t('beaconColor.java')" />
      <CdxTab name="bedrock" :label="t('beaconColor.bedrock')" />
    </CdxTabs>

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
          <input id="color-picker" v-model="color" type="color" />
          <CdxButton @click="updateSequence(colorStringToRgb(color))">
            {{ t('beaconColor.calculate') }}
          </CdxButton>
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
          />
        </div>
        <div>
          <span class="explain" :title="t('beaconColor.dE.help')">
            {{ t('beaconColor.dE') }}
          </span>
          = {{ sequence[1].toFixed(2) }}
        </div>
      </div>
      <canvas
        ref="canvasRef"
        width="160"
        height="160"
        :style="{
          width: '80px',
          height: '80px',
        }"
      />
    </div>
  </CalcField>
</template>
