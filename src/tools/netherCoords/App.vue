<script setup lang="ts">
import { computed, ref } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

<style scoped lang="less">
.wikitable {
  background-color: #f8f9fa;
  color: #202122;
  margin: 1em 0;
  border: 1px solid #a2a9b1;
  border-collapse: collapse;

  & > tr > th,
  & > tr > td,
  & > * > tr > th,
  & > * > tr > td {
    border: 1px solid #a2a9b1;
    padding: 0.2em 0.4em;
  }

  & > tr > th,
  & > * > tr > th {
    background-color: #eaecf0;
    text-align: center;
  }

  & > caption {
    font-weight: bold;
  }

  #catlinks {
    text-align: left;
  }
}

.dark .wikitable {
  color: #e6e6e6;
  background-color: #2f2f2f;

  &,
  & > tr > th,
  & > tr > td,
  & > * > tr > th,
  & > * > tr > td {
    border-color: #444;
  }

  & > tr > th,
  & > * > tr > th {
    background-color: #222;
  }
}
</style>
