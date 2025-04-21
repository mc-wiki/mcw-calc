<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { colorStringToRgb, integerRgbToFloat } from '@/utils/color'
import { CdxButton, CdxField, CdxIcon, CdxTextInput } from '@wikimedia/codex'
import { cdxIconDie } from '@wikimedia/codex-icons'
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
        <CdxField>
          <template #label>
            {{ t('decimalColor.color') }}
          </template>

          <div
            :style="{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '.5rem',
            }"
          >
            <input v-model="color" type="color" />
            <CdxButton weight="quiet" @click="randomColor">
              <CdxIcon :icon="cdxIconDie" :icon-label="t('decimalColor.random')" />
            </CdxButton>
          </div>
        </CdxField>

        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '.5rem',
          }"
        >
          <CdxField>
            <template #label>
              {{ t('decimalColor.decimal') }}
            </template>

            <CdxTextInput v-model="decimal" type="number" min="0" />
          </CdxField>

          <CdxField>
            <template #label>
              {{ t('decimalColor.hexadecimal') }}
            </template>

            <CdxTextInput v-model="hexadecimal" type="text" />
          </CdxField>

          <CdxField>
            <template #label>
              {{ t('decimalColor.floats') }}
            </template>

            <CdxTextInput v-model="floats" v-select-all-on-focus type="text" readonly="true" />
          </CdxField>
        </div>
      </div>
    </div>
  </CalcField>
</template>
