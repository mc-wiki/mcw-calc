<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { colorStringToRgb, integerRgbToFloat } from '@/utils/color'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const color = ref('#f9fffe')
const decimal = computed({
  get: () => {
    const rgb = colorStringToRgb(color.value)
    return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2] // Red<<16 + Green<<8 + Blue
  },
  set: (result) => {
    // reverse Red<<16 + Green<<8 + Blue
    color.value = `#${(result >> 16).toString(16).padStart(2, '0')}${((result >> 8) & 0xff)
      .toString(16)
      .padStart(2, '0')}${(result & 0xff).toString(16).padStart(2, '0')}`
  },
})
const hexadecimal = computed({
  get: () => {
    return color.value
  },
  set: (result) => {
    color.value = result
  },
})
const floats = computed(() => {
  const rgb = colorStringToRgb(color.value)
  return `[${integerRgbToFloat(rgb).join(', ')}]`
})

const randomColor = () => {
  decimal.value = Math.floor(Math.random() * 16777215)
}
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
          <input id="decimalColor-color-picker" v-model="color" type="color" />
          <CdxButton @click="randomColor">
            <CdxIcon :icon="cdxIconReload" :icon-label="t('decimalColor.random')" />
          </CdxButton>
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <label for="decimalColor-color-picker-decimal">{{ t('decimalColor.decimal') }}</label>
          <input id="decimalColor-color-picker-decimal" v-model="decimal" type="text" />

          <label for="decimalColor-color-picker-hex">{{ t('decimalColor.hexadecimal') }}</label>
          <input id="decimalColor-color-picker-hex" v-model="hexadecimal" type="text" />

          <label for="decimalColor-color-picker-floats">{{ t('decimalColor.floats') }}</label>
          <input id="decimalColor-color-picker-floats" v-model="floats" type="text" />
        </div>
      </div>
    </div>
  </CalcField>
</template>
