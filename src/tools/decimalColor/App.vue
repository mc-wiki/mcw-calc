<script setup lang="ts">
import Field from '@/components/Field.vue'
import { ref, computed } from 'vue'
import { colorStringToRgb } from '@/utils/color'
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const { t } = useI18n(__TOOL_NAME__, locales)

const color = ref('#f9fffe')
const result = computed({
  get: () => {
    const rgb = colorStringToRgb(color.value)
    return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2] // Red<<16 + Green<<8 + Blue
  },
  set: (result) => {
    // reverse Red<<16 + Green<<8 + Blue
    color.value =
      '#' +
      (result >> 16).toString(16).padStart(2, '0') +
      ((result >> 8) & 0xff).toString(16).padStart(2, '0') +
      (result & 0xff).toString(16).padStart(2, '0')
  },
})
</script>
<template>
  <Field>
    <template #heading>{{ t('decimalColor.title') }}</template>

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
          <label for="decimalColor-color-picker">{{ t('decimalColor.color') }}</label>
          <input type="color" v-model="color" id="decimalColor-color-picker" />
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <label for="decimalColor-color-picker-output">{{ t('decimalColor.decimal') }}</label>
          <input type="text" v-model="result" id="decimalColor-color-picker-output" />
        </div>
      </div>
    </div>
  </Field>
</template>
