<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_3PlayerMeleeWeaponPresetId } from '../data/je26_3'
import type { NumericFormValue, PlayerMeleeFormState } from './types'
import { CdxButton, CdxCheckbox, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageLink } from '@/utils/image'
import {
  je26_3PlayerMeleeMechanics,
  je26_3PlayerMeleeWeaponPresets,
  je26_3ToolMaterialOrder,
  resolveJe26_3PlayerMeleeWeaponPreset,
} from '../data/je26_3'
import { parseNumericInput, sanitizeNumericInput } from '../input/numericInput'
import { resolvePlayerMeleeVanillaSurvivalAvailability } from '../presets/playerMelee'
import InfoTooltip from './InfoTooltip.vue'

const props = withDefaults(
  defineProps<{ modelValue: PlayerMeleeFormState; showHeading?: boolean }>(),
  { showHeading: true },
)
const emit = defineEmits<{
  'update:modelValue': [value: PlayerMeleeFormState]
  reset: []
}>()
const { t } = useI18n()
const maximumEnchantmentLevel = je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel
const ordinarySharpnessMaximum = je26_3PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum
const ordinaryKnockbackMaximum = je26_3PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum

function createLevelItems(maximum: number): MenuItemData[] {
  return Array.from({ length: maximum + 1 }, (_, level) => ({ value: level, label: String(level) }))
}

const ordinarySharpnessItems = createLevelItems(ordinarySharpnessMaximum)
const ordinaryKnockbackItems = createLevelItems(ordinaryKnockbackMaximum)
const weaponChoices = computed(() => {
  const ids: Je26_3PlayerMeleeWeaponPresetId[] = [
    ...je26_3ToolMaterialOrder.map(
      (material) => `${material}Axe` as Je26_3PlayerMeleeWeaponPresetId,
    ),
    ...je26_3ToolMaterialOrder.map(
      (material) => `${material}Sword` as Je26_3PlayerMeleeWeaponPresetId,
    ),
  ]

  return ids.map((id) => {
    const preset = je26_3PlayerMeleeWeaponPresets[id]
    const itemName = preset.itemId.value!.replace('minecraft:', '').replace(/_/g, '-')

    return {
      id,
      label: t(`sulfurCube.attack.weapon.${id}`),
      spriteUrl: getImageLink(`en:ItemSprite_${itemName}.png`),
      weaponType: preset.weaponType,
      weaponMaterial: preset.material!,
    }
  })
})
const selectedWeaponId = computed(
  () =>
    resolveJe26_3PlayerMeleeWeaponPreset(
      props.modelValue.weaponType === 'bareHand'
        ? { type: 'bareHand' }
        : {
            type: props.modelValue.weaponType,
            material: props.modelValue.weaponMaterial,
          },
    ).id,
)
const weaponPreset = computed(() => je26_3PlayerMeleeWeaponPresets[selectedWeaponId.value])
const survivalAvailability = computed(() => {
  const levelSelection = (value: NumericFormValue) => ({
    enabled: true as const,
    level: parseNumericInput(value) ?? Number.NaN,
  })

  return resolvePlayerMeleeVanillaSurvivalAvailability({
    weapon:
      props.modelValue.weaponType === 'bareHand'
        ? { type: 'bareHand' }
        : {
            type: props.modelValue.weaponType,
            material: props.modelValue.weaponMaterial,
          },
    sharpness: props.modelValue.sharpnessEnabled
      ? levelSelection(props.modelValue.sharpnessLevel)
      : { enabled: false },
    knockback: props.modelValue.knockbackEnabled
      ? levelSelection(props.modelValue.knockbackLevel)
      : { enabled: false },
  })
})
const fullStrengthConditionSelectable = computed(() => {
  const strength = parseNumericInput(props.modelValue.attackStrengthPercent)
  return strength !== null && strength > 90
})
const sprintingSelectable = computed(
  () => fullStrengthConditionSelectable.value && !props.modelValue.criticalHitConditions,
)
const criticalHitSelectable = computed(
  () => fullStrengthConditionSelectable.value && !props.modelValue.sprinting,
)

function selectedLevel(enabled: boolean, value: NumericFormValue): number {
  return enabled ? (parseNumericInput(value) ?? 0) : 0
}

function update(fields: Partial<PlayerMeleeFormState>): void {
  let next = { ...props.modelValue, ...fields }
  const strength = parseNumericInput(next.attackStrengthPercent)

  if (strength === null || strength <= 90) {
    next = { ...next, sprinting: false, criticalHitConditions: false }
  } else if (fields.sprinting === true) {
    next = { ...next, criticalHitConditions: false }
  } else if (fields.criticalHitConditions === true) {
    next = { ...next, sprinting: false }
  }

  emit('update:modelValue', next)
}

function updateWeapon(id: Je26_3PlayerMeleeWeaponPresetId): void {
  const preset = je26_3PlayerMeleeWeaponPresets[id]
  update({
    weaponType: preset.weaponType,
    ...(preset.material === null ? {} : { weaponMaterial: preset.material }),
  })
}

function updateOrdinaryEnchantment(
  enchantment: 'sharpness' | 'knockback',
  value: string | number | null,
): void {
  if (typeof value !== 'number') return
  update(
    enchantment === 'sharpness'
      ? { sharpnessEnabled: value > 0, sharpnessLevel: value > 0 ? String(value) : '1' }
      : { knockbackEnabled: value > 0, knockbackLevel: value > 0 ? String(value) : '1' },
  )
}

function updateNonVanillaMode(enabled: boolean): void {
  if (enabled) {
    update({ allowNonVanillaEnchantmentLevels: true })
    return
  }

  const selectedSharpness = Math.trunc(parseNumericInput(props.modelValue.sharpnessLevel) ?? 0)
  const selectedKnockback = Math.trunc(parseNumericInput(props.modelValue.knockbackLevel) ?? 0)
  const sharpnessIsVanillaCompatible =
    props.modelValue.sharpnessEnabled &&
    selectedSharpness >= 1 &&
    selectedSharpness <= ordinarySharpnessMaximum &&
    props.modelValue.weaponType !== 'bareHand'
  const knockbackIsVanillaCompatible =
    props.modelValue.knockbackEnabled &&
    selectedKnockback >= 1 &&
    selectedKnockback <= ordinaryKnockbackMaximum &&
    props.modelValue.weaponType === 'sword'
  update({
    allowNonVanillaEnchantmentLevels: false,
    sharpnessEnabled: sharpnessIsVanillaCompatible,
    sharpnessLevel: sharpnessIsVanillaCompatible ? String(selectedSharpness) : '1',
    knockbackEnabled: knockbackIsVanillaCompatible,
    knockbackLevel: knockbackIsVanillaCompatible ? String(selectedKnockback) : '1',
  })
}

function updateNumeric(
  field: 'attackStrengthPercent' | 'sharpnessLevel' | 'knockbackLevel',
  value: NumericFormValue,
): void {
  const sanitized = sanitizeNumericInput(value)
  const parsed = parseNumericInput(sanitized)

  if (field === 'sharpnessLevel') {
    const level = Math.min(maximumEnchantmentLevel, Math.max(0, Math.trunc(parsed ?? 0)))
    update({ sharpnessLevel: String(level), sharpnessEnabled: level > 0 })
  } else if (field === 'knockbackLevel') {
    const level = Math.min(maximumEnchantmentLevel, Math.max(0, Math.trunc(parsed ?? 0)))
    update({ knockbackLevel: String(level), knockbackEnabled: level > 0 })
  } else {
    update({ attackStrengthPercent: sanitized })
  }
}

function warningKey(code: string): string {
  return `sulfurCube.attack.availability.${code}`
}
</script>

<template>
  <section
    class="player-attack"
    :class="{ 'player-attack--embedded': !showHeading }"
    :aria-labelledby="showHeading ? 'sulfur-cube-player-attack-title' : undefined"
    :aria-label="showHeading ? undefined : t('sulfurCube.attack.weapon')"
  >
    <div v-if="showHeading" class="player-attack__heading">
      <div class="player-attack__heading-title">
        <h4 id="sulfur-cube-player-attack-title">{{ t('sulfurCube.attack.title') }}</h4>
        <InfoTooltip
          :text="t('sulfurCube.attack.help')"
          :label="t('sulfurCube.attack.helpLabel')"
        />
      </div>
      <CdxButton class="sulfur-cube-reset" size="small" @click="emit('reset')">
        {{ t('sulfurCube.reset.weapon') }}
      </CdxButton>
    </div>

    <div class="weapon-picker" role="listbox" :aria-label="t('sulfurCube.attack.weapon')">
      <button
        class="weapon-picker__item weapon-picker__item--bare"
        :class="{ 'weapon-picker__item--selected': selectedWeaponId === 'bareHand' }"
        type="button"
        role="option"
        :aria-selected="selectedWeaponId === 'bareHand'"
        @click="updateWeapon('bareHand')"
      >
        {{ t('sulfurCube.attack.weapon.bareHand') }}
      </button>
      <button
        v-for="choice in weaponChoices"
        :key="choice.id"
        class="weapon-picker__item"
        :class="{ 'weapon-picker__item--selected': selectedWeaponId === choice.id }"
        type="button"
        role="option"
        :title="choice.label"
        :aria-label="choice.label"
        :aria-selected="selectedWeaponId === choice.id"
        @click="updateWeapon(choice.id)"
      >
        <img
          class="weapon-picker__image pixel-image"
          :src="choice.spriteUrl"
          alt=""
          width="32"
          height="32"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </button>
    </div>

    <dl class="player-attack__derived">
      <div>
        <dt>{{ t('sulfurCube.attack.effectiveDamage') }}</dt>
        <dd>{{ weaponPreset.effectiveAttackDamage.value }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.effectiveSpeed') }}</dt>
        <dd>{{ weaponPreset.effectiveAttackSpeed.value }}</dd>
      </div>
      <div>
        <dt>{{ t('sulfurCube.attack.recoveryTicks') }}</dt>
        <dd>
          {{
            weaponPreset.recoveryPeriodTicks.value.toFixed(
              weaponPreset.recoveryPeriodTicks.value % 1 === 0 ? 0 : 2,
            )
          }}
        </dd>
      </div>
    </dl>

    <div class="player-attack__configuration-row">
      <CdxField>
        <template #label>{{ t('sulfurCube.attack.sharpness') }}</template>
        <CdxTextInput
          v-if="modelValue.allowNonVanillaEnchantmentLevels"
          :model-value="modelValue.sharpnessEnabled ? modelValue.sharpnessLevel : '0'"
          input-type="number"
          min="0"
          :max="maximumEnchantmentLevel"
          step="1"
          @update:model-value="updateNumeric('sharpnessLevel', $event)"
        />
        <CdxSelect
          v-else
          :selected="selectedLevel(modelValue.sharpnessEnabled, modelValue.sharpnessLevel)"
          :menu-items="ordinarySharpnessItems"
          :aria-label="t('sulfurCube.attack.sharpness')"
          :menu-config="{ renderInPlace: true }"
          @update:selected="updateOrdinaryEnchantment('sharpness', $event)"
        />
      </CdxField>
      <CdxField>
        <template #label>{{ t('sulfurCube.attack.knockback') }}</template>
        <CdxTextInput
          v-if="modelValue.allowNonVanillaEnchantmentLevels"
          :model-value="modelValue.knockbackEnabled ? modelValue.knockbackLevel : '0'"
          input-type="number"
          min="0"
          :max="maximumEnchantmentLevel"
          step="1"
          @update:model-value="updateNumeric('knockbackLevel', $event)"
        />
        <CdxSelect
          v-else
          :selected="selectedLevel(modelValue.knockbackEnabled, modelValue.knockbackLevel)"
          :menu-items="ordinaryKnockbackItems"
          :aria-label="t('sulfurCube.attack.knockback')"
          :menu-config="{ renderInPlace: true }"
          @update:selected="updateOrdinaryEnchantment('knockback', $event)"
        />
      </CdxField>
      <CdxField class="player-attack__strength">
        <template #label>
          <span class="player-attack__label-with-info">
            {{ t('sulfurCube.attack.attackStrength') }}
            <InfoTooltip
              :text="t('sulfurCube.attack.attackStrengthHelp')"
              :label="t('sulfurCube.attack.attackStrengthHelpLabel')"
            />
          </span>
        </template>
        <CdxTextInput
          :model-value="modelValue.attackStrengthPercent"
          input-type="number"
          min="0"
          max="100"
          step="1"
          @update:model-value="updateNumeric('attackStrengthPercent', $event)"
        />
      </CdxField>
    </div>

    <div class="player-attack__options-row">
      <CdxCheckbox
        class="player-attack__non-vanilla"
        :model-value="modelValue.allowNonVanillaEnchantmentLevels"
        @update:model-value="updateNonVanillaMode($event)"
      >
        {{ t('sulfurCube.attack.allowNonVanillaLevels') }}
      </CdxCheckbox>

      <div class="player-attack__conditions">
        <span :class="{ 'player-attack__condition--unavailable': !sprintingSelectable }">
          <CdxCheckbox
            :model-value="modelValue.sprinting"
            :disabled="!sprintingSelectable"
            @update:model-value="update({ sprinting: $event })"
          >
            {{ t('sulfurCube.attack.sprinting') }}
          </CdxCheckbox>
        </span>
        <span :class="{ 'player-attack__condition--unavailable': !criticalHitSelectable }">
          <CdxCheckbox
            :model-value="modelValue.criticalHitConditions"
            :disabled="!criticalHitSelectable"
            @update:model-value="update({ criticalHitConditions: $event })"
          >
            {{ t('sulfurCube.attack.criticalConditions') }}
          </CdxCheckbox>
        </span>
      </div>
    </div>

    <ul
      v-if="survivalAvailability && !survivalAvailability.obtainable"
      class="player-attack__survival-warning"
      role="status"
    >
      <li v-for="issue in survivalAvailability.issues" :key="`${issue.enchantment}-${issue.code}`">
        {{
          t(warningKey(issue.code), {
            enchantment: t(`sulfurCube.attack.${issue.enchantment}`),
            level: issue.selectedLevel,
            maximum: issue.maximumLevel,
          })
        }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.player-attack {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 2px;
}
.player-attack--embedded {
  border: 0;
  padding: 0;
}
.player-attack--embedded .player-attack__heading {
  justify-content: flex-end;
}
.player-attack__heading,
.player-attack__heading-title,
.player-attack__label-with-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.player-attack__heading {
  justify-content: space-between;
}
.player-attack__heading h4 {
  margin: 0;
}
.player-attack :deep(.cdx-select-vue .cdx-menu) {
  top: 100% !important;
  right: auto !important;
  left: 0 !important;
  transform: none !important;
}
.weapon-picker {
  display: grid;
  grid-template-columns: minmax(5.5rem, 1.5fr) repeat(7, minmax(2.65rem, 1fr));
  gap: 0.4rem;
}
.weapon-picker__item {
  appearance: none;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  min-width: 0;
  min-height: 3rem;
  border: 1px solid var(--border-color-interactive, #72777d);
  border-radius: 2px;
  padding: 0.35rem;
  background: var(--background-color-interactive-subtle, #f8f9fa);
  color: var(--color-base, #202122);
  cursor: pointer;
}
.weapon-picker__item:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
  background: var(--background-color-interactive-subtle--hover, #eaecf0);
}
.weapon-picker__item:focus-visible {
  border-color: var(--border-color-progressive--focus, #36c);
  outline: 2px solid var(--border-color-progressive--focus, #36c);
  outline-offset: 1px;
}
.weapon-picker__item--selected {
  border-color: var(--color-base, #202122);
  outline: 3px solid var(--color-base, #202122);
  outline-offset: -3px;
  background: var(--background-color-progressive-subtle, #eaf3ff);
}
.weapon-picker__item--bare {
  grid-row: span 2;
  font-weight: 600;
}
.weapon-picker__image {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
}
.player-attack__derived {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 0;
  padding: 0.45rem 0.6rem;
  background: var(--background-color-interactive-subtle, #f8f9fa);
  text-align: center;
}
.player-attack__derived dt {
  color: var(--color-subtle, #54595d);
  font-size: 0.75rem;
}
.player-attack__derived dd {
  margin: 0.1rem 0 0;
  font-variant-numeric: tabular-nums;
}
.player-attack__configuration-row {
  display: grid;
  grid-template-columns: minmax(7rem, 9rem) minmax(7rem, 9rem) minmax(9rem, 11rem);
  gap: 0.75rem;
  align-items: end;
}
.player-attack__strength {
  justify-self: end;
}
.player-attack__options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
}
.player-attack__non-vanilla {
  font-size: 0.75rem;
}
.player-attack__non-vanilla :deep(.cdx-checkbox__icon) {
  width: 1rem;
  height: 1rem;
}
.player-attack__conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-left: auto;
}
.player-attack__condition--unavailable {
  opacity: 0.55;
}
.player-attack__survival-warning {
  margin: -0.125rem 0 0;
  padding-left: 1.25rem;
  color: var(--color-error, #b32424);
  font-size: 0.8125rem;
  line-height: 1.35;
}
.player-attack__configuration-row > * {
  min-width: 0;
}
.player-attack :deep(.cdx-select-vue),
.player-attack :deep(.cdx-text-input),
.player-attack :deep(.cdx-select-vue__handle) {
  width: 100%;
  min-width: 0;
}
@media (max-width: 48rem) {
  .weapon-picker {
    grid-template-columns: repeat(7, minmax(2.65rem, 1fr));
  }
  .weapon-picker__item--bare {
    grid-row: auto;
    grid-column: 1 / -1;
  }
}
@media (max-width: 34rem) {
  .weapon-picker {
    grid-template-columns: repeat(4, minmax(2.65rem, 1fr));
  }
  .player-attack__configuration-row,
  .player-attack__derived {
    grid-template-columns: 1fr;
  }
  .player-attack__strength {
    justify-self: stretch;
  }
  .player-attack__options-row {
    align-items: flex-start;
    flex-direction: column;
  }
  .player-attack__conditions {
    margin-left: 0;
  }
}
</style>
