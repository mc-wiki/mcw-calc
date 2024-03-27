<script setup lang="ts">
import { ref, computed } from 'vue'
import { CdxTextInput, CdxCheckbox, CdxTab, CdxTabs } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const { t } = useI18n(__TOOL_NAME__, locales)

const maceImage = 'https://minecraft.wiki/images/Mace_JE1_BE1.png?format=original'

const edition = ref<'java' | 'bedrock'>('java')
const fallHeight = ref(1.5)
const critical = ref(true)

const baseDamage = computed(() => (edition.value === 'java' ? 7 : 8))

const damage = computed<number>({
  get: () => {
    if (fallHeight.value < 1.5) return baseDamage.value
    const criticalModifier = critical.value ? 1.5 : 1

    return baseDamage.value * (1 + (3/7) * fallHeight.value) * criticalModifier
  },
  set: (val: number) => {
    const criticalModifier = critical.value ? 1.5 : 1
    const height = (val / criticalModifier / baseDamage.value - 1) * 2

    if (height < 1.5) {
      fallHeight.value = 0
    } else {
      fallHeight.value = height
    }
  },
})
</script>
<template>
  <CalcField>
    <template #heading>{{ t('maceDamage.title') }}</template>

    <cdx-tabs v-model:active="edition">
      <cdx-tab name="java" :label="t('maceDamage.java')" />
      <cdx-tab name="bedrock" :label="t('maceDamage.bedrock')" />
    </cdx-tabs>

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
          <CdxTextInput
            inputType="number"
            min="1.5"
            step="0.5"
            v-model="fallHeight"
            id="fall-height-input"
          />
          <div
            :style="{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '.5rem',
            }"
            class="explain"
            :title="t('maceDamage.critical.help')"
          >
            <label for="critical-checkbox">{{ t('maceDamage.critical') }}</label>
            <CdxCheckbox v-model="critical" id="critical-checkbox" />
          </div>
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
