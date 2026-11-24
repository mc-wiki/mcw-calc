<script setup lang="ts">
import type { ArmorRecipe } from './multiCraft'
import type { Color } from '@/utils/color'
import { useAsyncState } from '@vueuse/core'
import { CdxButton, CdxCheckbox, CdxTab, CdxTabs, CdxTextInput } from '@wikimedia/codex'
import { endpointSymbol } from 'vite-plugin-comlink/symbol'
import { computed, onUnmounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { colorStringToRgb, imgNames } from '@/utils/color'
import { craftArmorColor } from '@/utils/color/java'
import { getImageLink } from '@/utils/image'

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
const multiCraft = ref(true)
const edition = ref<'java' | 'bedrock'>('java')
const canvasRef = useTemplateRef('canvasRef')
const validColor = computed(() => /^#[\da-f]{6}$/i.test(color.value))
const submitted = shallowRef(colorStringToRgb(color.value))

function generateDye(color: Color) {
  return getImageLink(`en:Invicon_${imgNames[color]}_Dye.png`)
}

function generateDyeName(color: Color) {
  return t(`armorColor.dye.${color}`)
}

const worker = new ComlinkWorker<typeof import('./worker')>(new URL('./worker', import.meta.url))
onUnmounted(() => worker[endpointSymbol].terminate())
const {
  state: recipe,
  isLoading,
  error,
  executeImmediate: calculate,
} = useAsyncState(
  () => worker.findArmorRecipe(submitted.value, edition.value, multiCraft.value),
  { rounds: [['white']], distance: 0, rgb: [249, 255, 254] } as ArmorRecipe,
  { immediate: false, resetOnExecute: false },
)
watch([edition, multiCraft], () => calculate())

function toHex(rgb: number[]) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`
}
const stepColors = computed(() => {
  if (edition.value !== 'java' || !multiCraft.value) return []
  let previous: [number, number, number] | undefined
  return recipe.value.rounds.map((round) => {
    previous = craftArmorColor(previous, round)
    return toHex(previous)
  })
})

function updateSequence() {
  if (!validColor.value) return
  submitted.value = colorStringToRgb(color.value)
  calculate()
}

watch(
  [recipe, canvasRef],
  ([result, canvasRef], _, onCleanup) => {
    let current = true
    onCleanup(() => {
      current = false
    })
    const canvas = canvasRef
    if (!canvas) return
    const color = result.rgb
    const colorFloat = color.map((c) => c / 255)
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    })
    if (!ctx) return
    const img = new Image()
    img.addEventListener(
      'load',
      () => {
        if (!current || props.type === 'wolf') return
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
        if (!current) return
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
            if (!current) return
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
  },
  { immediate: true },
)
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
    <CdxCheckbox v-if="edition === 'java'" v-model="multiCraft" class="mb-2">
      {{ t('armorColor.multiCraft') }}
    </CdxCheckbox>
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
          <CdxButton :disabled="!validColor || isLoading" @click="updateSequence">
            {{ t('armorColor.calculate') }}
          </CdxButton>
        </div>
        <p v-if="isLoading" role="status">{{ t('armorColor.calculating') }}</p>
        <p v-else-if="error" role="alert">{{ t('armorColor.error') }}</p>
        <template v-else>
          <div class="mt-2">
            <p v-if="edition === 'java' && multiCraft">{{ t('armorColor.craftHelp') }}</p>
            <span
              v-else
              class="explain"
              :title="
                t(
                  edition === 'bedrock'
                    ? 'armorColor.sequence.helpBedrock'
                    : 'armorColor.sequence.help',
                )
              "
            >
              {{ t('armorColor.sequence') }}
            </span>
            <ol
              :class="edition === 'java' && multiCraft ? 'list-decimal ps-6' : 'm-0 list-none p-0'"
            >
              <li v-for="(round, step) in recipe.rounds" :key="step">
                <div class="flex flex-wrap items-center gap-1">
                  <img
                    v-for="(item, index) in round"
                    :key="index"
                    :src="generateDye(item)"
                    :alt="generateDyeName(item)"
                    :title="generateDyeName(item)"
                    :data-minetip-title="generateDyeName(item)"
                    class="minetip pixel-image size-8"
                  />
                  <span v-if="step < stepColors.length - 1" class="font-mono">{{
                    stepColors[step]
                  }}</span>
                </div>
              </li>
            </ol>
          </div>
          <div id="result-color" class="flex items-center gap-1">
            <span
              class="size-4 rounded-full border border-black"
              :style="{ backgroundColor: toHex(recipe.rgb) }"
            />
            <span class="font-mono">{{ toHex(recipe.rgb) }}</span>
          </div>
          <div>{{ t('armorColor.minimumDyes', { count: recipe.rounds.flat().length }) }}</div>
          <div>
            <span class="explain" :title="t('armorColor.dE.help')">{{ t('armorColor.dE') }}</span>
            = {{ recipe.distance.toFixed(2) }}
          </div>
        </template>
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
