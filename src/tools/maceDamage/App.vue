<script setup lang="ts">
import { ref, computed } from 'vue'
import { CdxTextInput, CdxCheckbox, CdxTab, CdxTabs } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const { t, message } = useI18n(__TOOL_NAME__, locales)

const maceImage = 'https://minecraft.wiki/images/Mace_JE1_BE1.png?format=original'

const edition = ref<'java' | 'bedrock'>('java')
const fallHeight = ref(1.5)
const densityLevel = ref(0)
const critical = ref(true)
const cooldownResetRef = ref(true)
const cooldownReset = computed({
  get: () => cooldownResetRef.value,
  set: (val) => {
    if (val === false) {
      critical.value = false
    }
    cooldownResetRef.value = val
  },
})

const baseDamage = computed(() => (edition.value === 'java' ? 7 : 5))
const criticalModifier = computed(() => (critical.value ? 1.5 : 1))
const cooldownModifier = computed(() => (cooldownReset.value ? 1 : 0.2))

const damage = computed({
  get: () => {
      // Java formula as of 1.20.5-pre1:
      // Full: (baseDamage + (3 * fallHeight) + (densityLevel * fallHeight)) * criticalModifier + damageFromEnchantments
      // Cooldown not reset: ((baseDamage * 0.2) + (3 * fallHeight) + (densityLevel * fallHeight)) * criticalModifier
      // damageFromEnchantments is currently not taken into account
      // New formula:
      // (baseDamage + falloff + 0.5 * densityLevel * fallHeight) * criticalModifier
      // fallOff = 4 * fallHeight                  when fallHeight <= 3
      //         = 12 + 2 * (fallHeight - 3)       when fallHeight <= 8
      //         = 12 + 10 + 1 * (fallHeight - 8)  when fallHeight > 8
      return ((
(fallHeight.value <= 3) ? (
  4 * fallHeight.value + 6 + 0.5 * densityLevel.value * x
) : ((x < 8) ? (
  2 * fallHeight.value + 12 + 0.5 * densityLevel.value * x
) : (
  1 * fallHeight.value + 20 + 0.5 * densityLevel.value * x
))) * criticalModifier.value * cooldownModifier.value);
  },
  set: (val) => {
    const x = val / criticalModifier.value / cooldownModifier.value;
    fallHeight.value = (
(x < (18 + 1.5 * densityLevel.value)) ? (
  (
    (x - 6)
  ) / (
    4 + 0.5 * densityLevel.value
  )
) : ((x < (28 + 4 * densityLevel.value)) ? (
  (
    (x - (18 + 1.5 * densityLevel.value))
  ) / (
    2 + 0.5 * densityLevel.value
  ) +
  3
) : (
  (
    (x - (28 + 4 * densityLevel.value))
  ) / (
    1 + 0.5 * densityLevel.value
  ) +
  8
)));
    return fallHeight.value;
  },
})

function validateDensity(value: number) {
  // density needs to be integer between 0 and 5
  const density = Math.floor(Math.min(5, Math.max(0, densityLevel.value)))
  if (value !== density) densityLevel.value = density
}
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

          <CdxCheckbox v-model="critical" id="critical-checkbox" inline>
            <span class="explain" :title="t('maceDamage.critical.help')">{{
              t('maceDamage.critical')
            }}</span>
          </CdxCheckbox>

          <CdxCheckbox
            v-if="edition === 'java'"
            v-model="cooldownReset"
            id="cooldown-reset-checkbox"
            inline
          >
            <span class="explain" :title="t('maceDamage.cooldownReset.help')">{{
              t('maceDamage.cooldownReset')
            }}</span>
          </CdxCheckbox>
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <label
            for="density-level-input"
            v-html="message('maceDamage.densityLevel').parse()"
          ></label>
          <CdxTextInput
            inputType="number"
            min="0"
            max="5"
            v-model="densityLevel"
            @input="validateDensity"
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
          <label for="damage-input">{{ t('maceDamage.damage') }}</label>
          <CdxTextInput
            inputType="number"
            min="0"
            v-model="damage"
            id="damage-input"
          />
        </div>
      </div>
      <img width="64" height="64" :src="maceImage" />
    </div>
  </CalcField>
</template>
