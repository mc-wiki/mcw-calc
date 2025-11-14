<script setup lang="ts">
import type { Color } from '@/utils/color'
import { CdxButton, CdxTab, CdxTabs, CdxTextInput } from '@wikimedia/codex'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { colorStringToRgb, imgNames } from '@/utils/color'
import { getImageLink } from '@/utils/image'
import { colorIndexMap } from '@/utils/color'

const props = defineProps<{ type: 'normal' | 'horse' | 'wolf' }>()

const { t } = useI18n()

const color = ref('#f9fffe')
const colorText = computed({
  get() {
    return color.value
  },
  set(value: string) {
    if (value.startsWith('#')) {
      if (value.length > 7) {
        color.value = value.slice(0, 7)
      } else {
        color.value = value
      }
    } else {
      color.value = `#${value}`
    }
  },
})
const edition = ref<'java' | 'bedrock'>('java')
const canvasRef = useTemplateRef('canvasRef')
const sequence = ref<[number[][], number, [number, number, number]]>([[[0]], 0, [249, 255, 254]])

function generateDye(color: Color) {
  return getImageLink(`en:Invicon_${imgNames[color]}_Dye.png`)
}

function generateDyeName(color: Color) {
  return t(`armorColor.dye.${color}`)
}

const worker = new ComlinkWorker<typeof import('./worker')>(new URL('./worker', import.meta.url))

async function updateSequence(targetColor: [number, number, number]) {
  await nextTick()
  sequence.value = await worker.colorToSequence(targetColor, edition.value)
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
    img.src = getImageLink('en:Leather_Horse_Armor_(texture)_JE2.png')
  } else if (props.type === 'wolf') {
    img.src = getImageLink('en:Wolf_Armor_(overlay_texture)_JE2_BE2.png')

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

      background.src = getImageLink('en:Wolf_Armor_JE2_BE2.png')
    })
  } else {
    img.src = getImageLink('en:Leather_Tunic_(texture)_JE4_BE3.png')
  }
  img.crossOrigin = 'anonymous'
})
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('armorColor.title', { type: t(`armorColor.type.${props.type}`) }) }}
    </template>

    <CdxTabs v-model:active="edition" class="mb-2">
      <CdxTab name="java" :label="t('armorColor.java')" />
      <CdxTab name="bedrock" :label="t('armorColor.bedrock')" />
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
          <label for="color-picker">{{ t('armorColor.color') }}</label>
          <input id="color-picker" v-model="color" type="color" />
          <CdxTextInput v-model="colorText" class="min-w-[100px] font-mono" type="text" />
          <CdxButton @click="updateSequence(colorStringToRgb(color))">
            {{ t('armorColor.calculate') }}
          </CdxButton>
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
          class="explain"
          :title="t(`armorColor.sequence.help${edition === 'bedrock' ? 'Bedrock' : ''}`)"
        >
          {{ t('armorColor.sequence') }}
          <div v-for="(craft, index) in sequence[0]" :key="index">
            Step {{ index }}:
            <span v-for="(item, index) in craft" :key="index">
                <img
                :src="generateDye(colorIndexMap[item])"
                :alt="item"
                :title="generateDyeName(colorIndexMap[item])"
                :data-minetip-title="generateDyeName(colorIndexMap[item])"
                style="height: 2em; width: 2em"
                class="explain minetip pixel-image"
                />
            </span>
            <br>
          </div>
          <span
            id="result-color"
            :style="{
              '--color-r': sequence[2][0],
              '--color-g': sequence[2][1],
              '--color-b': sequence[2][2],
            }"
          >&nbsp;#{{
              sequence[2][0].toString(16)
            }}{{
              sequence[2][1].toString(16)
            }}{{
              sequence[2][2].toString(16)
            }}
          </span>
        </div>
        <div>
          <span class="explain" :title="t('armorColor.dE.help')">
            {{ t('armorColor.dE') }}
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

<style>
#result-color {
  /* Fallback values */
  --color-r: 249;
  --color-g: 255;
  --color-b: 254;
}

#result-color::before {
  content: '';
  border-radius: 50%;
  width: 1em;
  height: 1em;
  display: inline-block;
  background-color: rgb(var(--color-r), var(--color-g), var(--color-b));
  border: 1px solid black;
}
</style>