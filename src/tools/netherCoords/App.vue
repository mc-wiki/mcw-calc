<script setup lang="ts">
import { CdxTextInput } from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const overworldX = ref(0)
const netherX = computed<number>({
  get: () => Math.floor(overworldX.value / 8),
  set: (val: number) => {
    overworldX.value = val * 8
  },
})
const overworldZ = ref(0)
const netherZ = computed<number>({
  get: () => Math.floor(overworldZ.value / 8),
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
        <th scope="col">
          {{ t('netherCoords.dimension') }}
        </th>
        <th scope="col">X</th>
        <th scope="col">Z</th>
      </tr>
      <tr>
        <th scope="row">
          {{ t('netherCoords.overworld') }}
        </th>
        <td><CdxTextInput v-model="overworldX" input-type="number" /></td>
        <td><CdxTextInput v-model="overworldZ" input-type="number" /></td>
      </tr>
      <tr>
        <th scope="row">
          {{ t('netherCoords.nether') }}
        </th>
        <td>
          <CdxTextInput id="netherX" v-model="netherX" input-type="number" />
        </td>
        <td>
          <CdxTextInput id="netherZ" v-model="netherZ" input-type="number" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
