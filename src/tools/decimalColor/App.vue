<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { colorStringToRgb } from '@/utils/color'

const { t } = useI18n()

const color = ref('#f9fffe')
const result = computed({
  get: () => {
    const rgb = colorStringToRgb(color.value)
    return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2] // Red<<16 + Green<<8 + Blue
  },
  set: (result) => {
    // reverse Red<<16 + Green<<8 + Blue
    color.value = `#${(result >> 16).toString(16).padStart(2, '0')}${((result >> 8) & 0xFF)
      .toString(16)
      .padStart(2, '0')}${(result & 0xFF).toString(16).padStart(2, '0')}`
  },
})
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('decimalColor.title') }}
    </template>

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
          <input id="decimalColor-color-picker" v-model="color" type="color">
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
          <input id="decimalColor-color-picker-output" v-model="result" type="text">
        </div>
      </div>
    </div>
  </CalcField>
</template>
