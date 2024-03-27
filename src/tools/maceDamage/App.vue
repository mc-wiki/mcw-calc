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
const densityLevel = ref(0)
const critical = ref(true)

const baseDamage = computed(() => (edition.value === 'java' ? 7 : 8))
const criticalModifier = computed(() => (critical.value ? 1.5 : 1))

const damage = computed(() => {
    if (fallHeight.value < 1.5) return baseDamage.value
    return edition.value === 'java' ? javaDamage : bedrockDamage
})

// Java formula as of 24w13a:
// Full: (baseDamage + (3 * fallHeight) + (densityLevel * fallHeight)) * criticalModifier + damageFromEnchantments
// Cooldown not reset: ((baseDamage * 0.2) + (3 * fallHeight) + (densityLevel * fallHeight)) * criticalModifier
// The latter formula is currently not taken into account, nor damageFromEnchantments
const javaDamage = computed(() => {
  return (baseDamage.value + (3 * fallHeight.value) + (densityLevel.value * fallHeight.value)) * criticalModifier.value
})
const bedrockDamage = computed(() => {
  return baseDamage.value * (1 + 0.5 * fallHeight.value) * criticalModifier.value
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
          v-if="edition === 'java'"
        >
          <label for="density-level-input">{{ t('maceDamage.densityLevel') }}</label>
          <CdxTextInput
            inputType="number"
            min="0" max="5"
            v-model="densityLevel"
            id="density-level-input"
          />
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <p>{{ t('maceDamage.damage') }}</p>
          <span style="font-weight: bold;">{{ damage }}</span>
        </div>
      </div>
      <img width="64" height="64" :src="maceImage" />
    </div>
  </CalcField>
</template>
