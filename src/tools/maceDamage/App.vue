<script setup lang="ts">
import { ref, computed } from 'vue'
import { CdxTextInput, CdxCheckbox } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from 'vue-i18n'
import { parseWikitext } from '@/utils/i18n'

const { t } = useI18n()

const maceImage = 'https://minecraft.wiki/images/Mace_JE1_BE1.png?format=original'

const fallHeight = ref(1.5)
const densityLevel = ref(0)
const critical = ref(true)

const criticalModifier = computed(() => (critical.value ? 1.5 : 1))

const damage = computed({
  get: () => {
    if (fallHeight.value < 1.5) return (1 + 5) * criticalModifier.value

    // Formula:
    // (baseDamage + falloff + 0.5 * densityLevel * fallHeight) * criticalModifier
    // fallOff = 4 * fallHeight                  when fallHeight <= 3
    //         = 12 + 2 * (fallHeight - 3)       when 3 < fallHeight <= 8
    //         = 12 + 10 + 1 * (fallHeight - 8)  when fallHeight > 8
    return (
      (1 + // player base damage
        5 + // mace base damage
        (fallHeight.value <= 3
          ? 4 * fallHeight.value
          : fallHeight.value <= 8
            ? 12 + 2 * (fallHeight.value - 3)
            : 22 + 1 * (fallHeight.value - 8)) + // falloff
        0.5 * densityLevel.value * fallHeight.value) * // density bonus
      criticalModifier.value
    )
  },
  set: (val) => {
    if (val < 18) return 0
    const damage = val / criticalModifier.value
    fallHeight.value =
      damage > 28 + 4 * densityLevel.value
        ? (damage - 20) / (1 + 0.5 * densityLevel.value)
        : damage > 18 + 1.5 * densityLevel.value
          ? (damage - 12) / (2 + 0.5 * densityLevel.value)
          : (damage - 6) / (4 + 0.5 * densityLevel.value)
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
            v-html="parseWikitext(t('maceDamage.densityLevel'))"
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
          <CdxTextInput inputType="number" min="0" v-model="damage" id="damage-input" />
        </div>
      </div>
      <img width="64" height="64" :src="maceImage" />
    </div>
  </CalcField>
</template>
