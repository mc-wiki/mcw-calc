<script setup lang="ts">
import type { BeamMatch, Edition } from './worker'
import { useAsyncState } from '@vueuse/core'
import { CdxButton, CdxTab, CdxTabs, CdxTextInput } from '@wikimedia/codex'
import { endpointSymbol } from 'vite-plugin-comlink/symbol'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { imgNames } from '@/utils/color'
import { getImageLink } from '@/utils/image'

const { t } = useI18n()
const edition = ref<Edition>('java')
const submitted = ref(0xf9fffe)
const colorText = ref(toHex(submitted.value))
const inputRgb = computed(() => {
  const match = /^#?([\da-f]{6})$/i.exec(colorText.value.trim())
  return match ? Number.parseInt(match[1], 16) : undefined
})

const worker = new ComlinkWorker<typeof import('./worker')>(new URL('./worker', import.meta.url))
onUnmounted(() => worker[endpointSymbol].terminate())
const {
  state: matches,
  isLoading,
  error,
  executeImmediate: calculate,
} = useAsyncState(() => worker.findBeamMatches(edition.value, submitted.value), [] as BeamMatch[])
watch(edition, () => calculate())

function toHex(rgb: number) {
  return `#${rgb.toString(16).padStart(6, '0')}`
}

function submit() {
  if (inputRgb.value === undefined) return
  submitted.value = inputRgb.value
  colorText.value = toHex(submitted.value)
  calculate()
}

const beamTexture = `url("${getImageLink('en:Beacon_Beam_(texture).png')}")`
</script>

<template>
  <CalcField>
    <template #heading>{{ t('beaconColor.title') }}</template>

    <CdxTabs v-model:active="edition" class="mb-2">
      <CdxTab name="java" :label="t('beaconColor.java')" />
      <CdxTab name="bedrock" :label="t('beaconColor.bedrock')" />
    </CdxTabs>

    <form class="flex flex-wrap items-center gap-2" @submit.prevent="submit">
      <label for="color-picker">{{ t('beaconColor.color') }}</label>
      <input
        id="color-picker"
        type="color"
        :value="toHex(inputRgb ?? submitted)"
        @input="colorText = ($event.target as HTMLInputElement).value"
      />
      <CdxTextInput
        v-model="colorText"
        class="w-28 font-mono"
        placeholder="#rrggbb"
        :aria-label="t('beaconColor.hexColor')"
        :aria-invalid="inputRgb === undefined"
        :aria-describedby="inputRgb === undefined ? 'color-error' : undefined"
      />
      <CdxButton type="submit" :disabled="inputRgb === undefined || isLoading">
        {{ t('beaconColor.calculate') }}
      </CdxButton>
    </form>
    <p v-if="inputRgb === undefined" id="color-error">{{ t('beaconColor.invalidColor') }}</p>

    <p v-if="isLoading" role="status">{{ t('beaconColor.calculating') }}</p>
    <p v-else-if="error" role="alert">{{ t('beaconColor.error') }}</p>
    <div v-else-if="matches.length" class="overflow-x-auto">
      <table class="wikitable">
        <caption>
          {{
            t('beaconColor.matches', { color: toHex(submitted) })
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">{{ t('beaconColor.glassCount') }}</th>
            <th scope="col">{{ t('beaconColor.stack') }}</th>
            <th scope="col">{{ t('beaconColor.beamColor') }}</th>
            <th scope="col">
              <abbr :title="t('beaconColor.dE.help')">{{ t('beaconColor.dE') }}</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="match in matches" :key="match.sequence.length">
            <td class="text-end tabular-nums">{{ match.sequence.length }}</td>
            <td>
              <ol v-if="match.sequence.length" class="m-0 flex list-none flex-wrap p-0">
                <li v-for="(glass, index) in match.sequence" :key="index">
                  <img
                    :src="getImageLink(`en:Invicon_${imgNames[glass]}_Stained_Glass_Pane.png`)"
                    :alt="t(`beaconColor.glass.${glass}`)"
                    :title="t(`beaconColor.glass.${glass}`)"
                    :data-minetip-title="t(`beaconColor.glass.${glass}`)"
                    class="pixel-image minetip size-7"
                  />
                </li>
              </ol>
              <span v-else>{{ t('beaconColor.noGlass') }}</span>
            </td>
            <td>
              <div class="flex items-center gap-1">
                <span
                  class="beam-swatch pixel-image size-6 shrink-0"
                  :style="{ backgroundColor: toHex(match.rgb), backgroundImage: beamTexture }"
                />
                <span class="font-mono">{{ toHex(match.rgb) }}</span>
              </div>
            </td>
            <td class="text-end tabular-nums">{{ match.deltaE.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </CalcField>
</template>

<style scoped>
.beam-swatch {
  background-size: cover;
  background-blend-mode: multiply;
}
</style>
