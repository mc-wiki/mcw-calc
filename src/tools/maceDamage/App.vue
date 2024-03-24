<script setup lang="ts">
import { ref, computed } from 'vue'
import { CdxTextInput, CdxCheckbox } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const { t } = useI18n(__TOOL_NAME__, locales)

const maceImage = 'https://minecraft.wiki/images/Mace_JE1_BE1.png?format=original'
const fallHeight = ref(1.5)
const critical = ref(false)
const damage = computed<number>({
  get: () => fallHeight.value >= 1.5 ? getBaseDamage() + (0.5 * fallHeight.value) : 0,
  set: (val: number) => {
    let height = (val - getBaseDamage()) * 2
    fallHeight.value = height >= 1.5 ? height : 0
  },
})

function getBaseDamage(): number {
  return critical.value ? 10.5 : 7
}
</script>
<template>
  <CalcField>
    <template #heading>{{ t('maceDamage.title') }}</template>

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
          <label for="fall-height-input">{{ t('maceDamage.fallHeight') }}</label>
          <CdxTextInput inputType="number" min="1.5" step="0.5" v-model="fallHeight" id="fall-height-input" />

          <label for="critical-checkbox">{{ t('maceDamage.critical') }}</label>
          <CdxCheckbox v-model="critical" id="critical-checkbox" />
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <label for="damage-input">{{ t('maceDamage.damage') }}</label>
          <CdxTextInput inputType="number" min="0" v-model="damage" id="damage-input" />
        </div>
      </div>
      <img width="64" height="64" :src="maceImage" />
    </div>
  </CalcField>
</template>