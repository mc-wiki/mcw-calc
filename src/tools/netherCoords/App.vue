<script setup lang="ts">
import { ref, computed } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'
import { useI18n } from '@/utils/i18n.ts'
import locales from './locales.ts'

const { t } = useI18n(locales)

const overworldX = ref(0)
const netherX = computed<number>({
  get: () => Math.round(overworldX.value / 8),
  set: (val: number) => {
    overworldX.value = val * 8
  },
})
const overworldZ = ref(0)
const netherZ = computed<number>({
  get: () => Math.round(overworldZ.value / 8),
  set: (val: number) => {
    overworldZ.value = val * 8
  },
})
</script>
<template>
  <table class="wikitable" style="margin: auto">
    <caption>
      {{
        t('netherCoords.title')
      }}
    </caption>
    <tbody>
      <tr>
        <th scope="col">{{ t('netherCoords.dimension') }}</th>
        <th scope="col">X</th>
        <th scope="col">Z</th>
      </tr>
      <tr>
        <th scope="row">{{ t('netherCoords.overworld') }}</th>
        <td><CdxTextInput v-model="overworldX" inputType="number" /></td>
        <td><CdxTextInput v-model="overworldZ" inputType="number" /></td>
      </tr>
      <tr>
        <th scope="row">{{ t('netherCoords.nether') }}</th>
        <td>
          <CdxTextInput id="netherX" v-model="netherX" inputType="number" />
        </td>
        <td>
          <CdxTextInput id="netherZ" v-model="netherZ" inputType="number" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
