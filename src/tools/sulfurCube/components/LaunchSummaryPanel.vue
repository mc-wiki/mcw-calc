<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type {
  Je26_3ArchetypeId,
  Je26_3PlayerMeleeWeaponPresetId,
  Je26_3UniformFloorProfileId,
} from '../data/je26_3'
import type { CubePropertySelectionResolution, CubePropertySelectionState } from '../resolution'
import type {
  DiagnosticFormState,
  NumericFormValue,
  PlayerMeleeFormState,
  RadialSceneDisplayOptions,
} from './types'
import { CdxButton, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageLink } from '@/utils/image'
import {
  je26_3ArchetypeRegistryOrder,
  je26_3PlayerMeleeMechanics,
  je26_3PlayerMeleeWeaponPresetOrder,
  je26_3PlayerMeleeWeaponPresets,
  je26_3UniformFloorProfileOrder,
  resolveJe26_3PlayerMeleeWeaponPreset,
} from '../data/je26_3'
import { parseNumericInput, sanitizeNumericInput } from '../input/numericInput'
import { blockSpriteFileName, humanizeIdentifier } from '../presentation/blockSelector'
import { maximumTrajectoryTicks } from '../presets/diagnostic'
import {
  je26_3ArchetypeRepresentativeBlocks,
  selectCubePropertyArchetype,
  selectCubePropertyMode,
} from '../resolution'
import InfoTooltip from './InfoTooltip.vue'

const props = defineProps<{
  formValue: DiagnosticFormState
  propertySelection: CubePropertySelectionState
  propertyResolution: CubePropertySelectionResolution
  playerMelee: PlayerMeleeFormState
  trajectoryTicksDefaultActive: boolean
  radialDisplayOptions: RadialSceneDisplayOptions
}>()
const emit = defineEmits<{
  'update:formValue': [value: DiagnosticFormState]
  'update:propertySelection': [value: CubePropertySelectionState]
  'update:playerMelee': [value: PlayerMeleeFormState]
  'update:radialDisplayOptions': [value: RadialSceneDisplayOptions]
  toggleTrajectoryTicksDefault: []
  resetPositionsAim: []
  resetArchetype: []
  resetWeapon: []
  resetFloor: []
  resetLayout: []
  resetEverything: []
}>()
const { t } = useI18n()
const transparentThumbnailUrl =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const radialDisplayOptionKeys = [
  'velocity',
  'cube',
  'player',
  'aim',
  'heightAngle',
  'information',
  'trajectoryLine',
  'trajectory',
  'floor',
] as const satisfies readonly (keyof RadialSceneDisplayOptions)[]

const archetypeItems: MenuItemData[] = je26_3ArchetypeRegistryOrder.map((id) => ({
  value: id,
  label: humanizeIdentifier(id),
  thumbnail: {
    url: getImageLink(`en:${blockSpriteFileName(je26_3ArchetypeRepresentativeBlocks[id])}`),
  },
}))
const weaponItems = computed<MenuItemData[]>(() =>
  je26_3PlayerMeleeWeaponPresetOrder.map((id) => ({
    value: id,
    label: t(`sulfurCube.attack.weapon.${id}`),
    ...(je26_3PlayerMeleeWeaponPresets[id].itemId.value === null
      ? { thumbnail: { url: transparentThumbnailUrl } }
      : {
          thumbnail: {
            url: getImageLink(
              `en:ItemSprite_${je26_3PlayerMeleeWeaponPresets[id].itemId
                .value!.replace('minecraft:', '')
                .replace(/_/g, '-')}.png`,
            ),
          },
        }),
  })),
)
const sharpnessItems: MenuItemData[] = Array.from(
  { length: je26_3PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum + 1 },
  (_, level) => ({ value: level, label: String(level) }),
)
const knockbackItems: MenuItemData[] = Array.from(
  { length: je26_3PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum + 1 },
  (_, level) => ({ value: level, label: String(level) }),
)
const floorItems = computed<MenuItemData[]>(() =>
  je26_3UniformFloorProfileOrder.map((id) => ({
    value: id,
    label: t(`sulfurCube.floor.${id}`),
  })),
)
const selectedArchetype = computed(
  () =>
    (props.propertySelection.mode === 'archetype'
      ? props.propertySelection.selectedArchetypeId
      : props.propertyResolution.candidateIds[0]) ?? null,
)
const selectedWeapon = computed(
  () =>
    resolveJe26_3PlayerMeleeWeaponPreset(
      props.playerMelee.weaponType === 'bareHand'
        ? { type: 'bareHand' }
        : {
            type: props.playerMelee.weaponType,
            material: props.playerMelee.weaponMaterial,
          },
    ).id,
)
const selectedSharpness = computed(() =>
  props.playerMelee.sharpnessEnabled
    ? (parseNumericInput(props.playerMelee.sharpnessLevel) ?? 0)
    : 0,
)
const selectedKnockback = computed(() =>
  props.playerMelee.knockbackEnabled
    ? (parseNumericInput(props.playerMelee.knockbackLevel) ?? 0)
    : 0,
)
const sharpnessUsesNumericInput = ref(false)
const knockbackUsesNumericInput = ref(false)
const sharpnessNumericInputValue = ref('0')
const knockbackNumericInputValue = ref('0')

watch(
  selectedSharpness,
  (level) => {
    sharpnessNumericInputValue.value = String(
      Math.min(je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel, Math.max(0, level)),
    )
  },
  { immediate: true },
)
watch(
  selectedKnockback,
  (level) => {
    knockbackNumericInputValue.value = String(
      Math.min(je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel, Math.max(0, level)),
    )
  },
  { immediate: true },
)

watch(
  () =>
    [
      props.playerMelee.allowNonVanillaEnchantmentLevels,
      props.playerMelee.sharpnessLevel,
      props.playerMelee.knockbackLevel,
    ] as const,
  ([allowed, sharpnessLevel, knockbackLevel]) => {
    if (!allowed) {
      sharpnessUsesNumericInput.value = false
      knockbackUsesNumericInput.value = false
      return
    }

    if (
      (parseNumericInput(sharpnessLevel) ?? 0) >
      je26_3PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum
    ) {
      sharpnessUsesNumericInput.value = true
    }
    if (
      (parseNumericInput(knockbackLevel) ?? 0) >
      je26_3PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum
    ) {
      knockbackUsesNumericInput.value = true
    }
  },
  { immediate: true },
)

function updateArchetype(value: string | number | null): void {
  if (
    typeof value !== 'string' ||
    !je26_3ArchetypeRegistryOrder.includes(value as Je26_3ArchetypeId)
  ) {
    return
  }

  emit(
    'update:propertySelection',
    selectCubePropertyArchetype(
      selectCubePropertyMode(props.propertySelection, 'archetype'),
      value as Je26_3ArchetypeId,
    ),
  )
}

function updateWeapon(value: string | number | null): void {
  if (
    typeof value !== 'string' ||
    !je26_3PlayerMeleeWeaponPresetOrder.includes(value as Je26_3PlayerMeleeWeaponPresetId)
  ) {
    return
  }

  const preset = je26_3PlayerMeleeWeaponPresets[value as Je26_3PlayerMeleeWeaponPresetId]
  emit('update:playerMelee', {
    ...props.playerMelee,
    weaponType: preset.weaponType,
    ...(preset.material === null ? {} : { weaponMaterial: preset.material }),
  })
}

function updateEnchantment(
  enchantment: 'sharpness' | 'knockback',
  value: string | number | null,
): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return

  const enabled = value > 0
  const nonVanilla =
    (enchantment === 'sharpness' &&
      value > je26_3PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum) ||
    (enchantment === 'knockback' &&
      value > je26_3PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum)

  emit('update:playerMelee', {
    ...props.playerMelee,
    ...(enchantment === 'sharpness'
      ? { sharpnessEnabled: enabled, sharpnessLevel: enabled ? String(value) : '1' }
      : { knockbackEnabled: enabled, knockbackLevel: enabled ? String(value) : '1' }),
    allowNonVanillaEnchantmentLevels:
      props.playerMelee.allowNonVanillaEnchantmentLevels || nonVanilla,
  })
}

function updateNumericEnchantment(
  enchantment: 'sharpness' | 'knockback',
  value: NumericFormValue,
): void {
  const parsed = parseNumericInput(sanitizeNumericInput(value))
  const level = Math.min(
    je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel,
    Math.max(0, Math.trunc(parsed ?? 0)),
  )

  if (enchantment === 'sharpness') sharpnessNumericInputValue.value = String(level)
  else knockbackNumericInputValue.value = String(level)

  updateEnchantment(enchantment, level)
}

function updateFloor(value: string | number | null): void {
  if (
    typeof value === 'string' &&
    je26_3UniformFloorProfileOrder.includes(value as Je26_3UniformFloorProfileId)
  ) {
    emit('update:formValue', {
      ...props.formValue,
      floorProfileId: value as Je26_3UniformFloorProfileId,
    })
  }
}

function updateTrajectoryTicks(value: NumericFormValue): void {
  emit('update:formValue', {
    ...props.formValue,
    trajectoryTicks: sanitizeNumericInput(value),
  })
}

function toggleRadialDisplayOption(option: keyof RadialSceneDisplayOptions): void {
  emit('update:radialDisplayOptions', {
    ...props.radialDisplayOptions,
    [option]: !props.radialDisplayOptions[option],
  })
}
</script>

<template>
  <section class="launch-summary" aria-labelledby="sulfur-cube-summary-title">
    <div class="launch-summary__intro">
      <h3 id="sulfur-cube-summary-title">{{ t('sulfurCube.summary.title') }}</h3>
      <p>{{ t('sulfurCube.summary.intro') }}</p>
    </div>

    <div class="launch-summary__controls">
      <CdxField class="launch-summary__archetype">
        <template #label>{{ t('sulfurCube.properties.title') }}</template>
        <CdxSelect
          :selected="selectedArchetype"
          :menu-items="archetypeItems"
          :aria-label="t('sulfurCube.properties.title')"
          :menu-config="{ showThumbnail: true, renderInPlace: true }"
          @update:selected="updateArchetype"
        />
      </CdxField>
      <CdxField class="launch-summary__floor">
        <template #label>{{ t('sulfurCube.controls.uniformFloor') }}</template>
        <CdxSelect
          :selected="formValue.floorProfileId"
          :menu-items="floorItems"
          :aria-label="t('sulfurCube.controls.uniformFloor')"
          @update:selected="updateFloor"
        />
      </CdxField>
      <div class="launch-summary__trajectory">
        <CdxField>
          <template #label>
            <span class="launch-summary__label-with-info">
              {{ t('sulfurCube.controls.trajectoryTicks') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.trajectoryTicksHelp')"
                :label="t('sulfurCube.controls.trajectoryTicksHelpLabel')"
              />
            </span>
          </template>
          <CdxTextInput
            :model-value="formValue.trajectoryTicks"
            input-type="number"
            min="0"
            :max="maximumTrajectoryTicks"
            step="1"
            @update:model-value="updateTrajectoryTicks"
          />
        </CdxField>
        <CdxButton
          :action="trajectoryTicksDefaultActive ? 'progressive' : 'default'"
          :aria-pressed="trajectoryTicksDefaultActive"
          @click="emit('toggleTrajectoryTicksDefault')"
        >
          {{ t('sulfurCube.controls.trajectoryTicksDefault') }}
        </CdxButton>
      </div>
      <div class="launch-summary__attack-controls">
        <CdxField
          class="launch-summary__weapon"
          :class="{ 'launch-summary__weapon--bare': selectedWeapon === 'bareHand' }"
        >
          <template #label>{{ t('sulfurCube.attack.weapon') }}</template>
          <CdxSelect
            :selected="selectedWeapon"
            :menu-items="weaponItems"
            :aria-label="t('sulfurCube.attack.weapon')"
            :menu-config="{ showThumbnail: true, renderInPlace: true }"
            @update:selected="updateWeapon"
          />
        </CdxField>
        <CdxField class="launch-summary__sharpness">
          <template #label>{{ t('sulfurCube.attack.sharpness') }}</template>
          <CdxTextInput
            v-if="sharpnessUsesNumericInput"
            :model-value="sharpnessNumericInputValue"
            input-type="number"
            min="0"
            :max="je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel"
            step="1"
            @update:model-value="updateNumericEnchantment('sharpness', $event)"
          />
          <CdxSelect
            v-else
            :selected="selectedSharpness"
            :menu-items="sharpnessItems"
            :aria-label="t('sulfurCube.attack.sharpness')"
            @update:selected="updateEnchantment('sharpness', $event)"
          />
        </CdxField>
        <CdxField class="launch-summary__knockback">
          <template #label>{{ t('sulfurCube.attack.knockback') }}</template>
          <CdxTextInput
            v-if="knockbackUsesNumericInput"
            :model-value="knockbackNumericInputValue"
            input-type="number"
            min="0"
            :max="je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel"
            step="1"
            @update:model-value="updateNumericEnchantment('knockback', $event)"
          />
          <CdxSelect
            v-else
            :selected="selectedKnockback"
            :menu-items="knockbackItems"
            :aria-label="t('sulfurCube.attack.knockback')"
            @update:selected="updateEnchantment('knockback', $event)"
          />
        </CdxField>
      </div>
    </div>

    <div class="launch-summary__display-options">
      <strong>{{ t('sulfurCube.summary.radialDisplay') }}</strong>
      <div class="launch-summary__display-buttons">
        <CdxButton
          v-for="option in radialDisplayOptionKeys"
          :key="option"
          size="small"
          :action="radialDisplayOptions[option] ? 'progressive' : 'default'"
          :aria-pressed="radialDisplayOptions[option]"
          @click="toggleRadialDisplayOption(option)"
        >
          {{ t(`sulfurCube.summary.display.${option}`) }}
        </CdxButton>
      </div>
    </div>

    <div class="launch-summary__resets">
      <strong>{{ t('sulfurCube.reset.options') }}</strong>
      <div class="launch-summary__reset-buttons">
        <CdxButton class="sulfur-cube-reset" size="small" @click="emit('resetPositionsAim')">
          {{ t('sulfurCube.summary.resetPositionsAim') }}
        </CdxButton>
        <CdxButton class="sulfur-cube-reset" size="small" @click="emit('resetArchetype')">
          {{ t('sulfurCube.summary.resetArchetype') }}
        </CdxButton>
        <CdxButton class="sulfur-cube-reset" size="small" @click="emit('resetWeapon')">
          {{ t('sulfurCube.summary.resetWeapon') }}
        </CdxButton>
        <CdxButton class="sulfur-cube-reset" size="small" @click="emit('resetFloor')">
          {{ t('sulfurCube.summary.resetFloor') }}
        </CdxButton>
        <CdxButton size="small" action="destructive" @click="emit('resetEverything')">
          {{ t('sulfurCube.summary.resetEverything') }}
        </CdxButton>
        <CdxButton class="launch-summary__reset-layout" size="small" @click="emit('resetLayout')">
          {{ t('sulfurCube.summary.resetLayout') }}
        </CdxButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.launch-summary {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #c69732;
  border-radius: 3px;
  background: var(--background-color-neutral-subtle, #f8f9fa);
}
.launch-summary__intro h3,
.launch-summary__intro p {
  margin: 0;
}
.launch-summary__intro p {
  margin-top: 0.2rem;
  color: var(--color-subtle, #54595d);
}
.launch-summary__controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: clamp(1rem, 2.5vw, 2.5rem);
  row-gap: 0.75rem;
  align-items: end;
}
.launch-summary__controls > * {
  min-width: 0;
}
.launch-summary__controls :deep(.cdx-select-vue),
.launch-summary__controls :deep(.cdx-select-vue__handle),
.launch-summary__controls :deep(.cdx-text-input) {
  width: 100%;
  min-width: 0;
}
.launch-summary__controls :deep(.cdx-label__label__text) {
  white-space: nowrap;
}
.launch-summary__archetype {
  width: min(100%, 13rem);
}
.launch-summary__floor {
  width: min(100%, 12rem);
}
.launch-summary__archetype :deep(.cdx-thumbnail__image),
.launch-summary__archetype :deep(.cdx-thumbnail__placeholder),
.launch-summary__weapon :deep(.cdx-thumbnail__image),
.launch-summary__weapon :deep(.cdx-thumbnail__placeholder) {
  width: 1.375rem;
  min-width: 1.375rem;
  height: 1.375rem;
  min-height: 1.375rem;
}
.launch-summary__weapon--bare :deep(.cdx-select-vue__handle .cdx-thumbnail),
.launch-summary__weapon :deep(.cdx-menu-item:first-child .cdx-thumbnail) {
  display: none;
}
.launch-summary__archetype :deep(.cdx-menu-item__text),
.launch-summary__weapon :deep(.cdx-menu-item__text),
.launch-summary__controls :deep(.cdx-select-vue__handle__label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.launch-summary__trajectory {
  display: grid;
  grid-template-columns: 8rem max-content;
  gap: 0.4rem;
  align-items: end;
  justify-content: start;
}
.launch-summary__attack-controls {
  display: grid;
  grid-template-columns: minmax(7.5rem, 1fr) 5.4rem 5.4rem;
  gap: 0.55rem;
  min-width: 0;
}
.launch-summary__attack-controls > * {
  min-width: 0;
}
.launch-summary__label-with-info {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.launch-summary__trajectory > .cdx-button {
  align-self: end;
  margin-bottom: 2px;
  transform: translateY(-2px);
}
.launch-summary__display-options,
.launch-summary__display-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.6rem;
}
.launch-summary__display-options {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}
.launch-summary__resets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}
.launch-summary__reset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.launch-summary__reset-layout {
  margin-left: 2cm;
  border-color: var(--border-color-error, #b32424);
}
@media (max-width: 72rem) {
  .launch-summary__controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 42rem) {
  .launch-summary__controls {
    grid-template-columns: 1fr;
  }
  .launch-summary__reset-layout {
    margin-left: 0;
  }
}
@media (max-width: 28rem) {
  .launch-summary__attack-controls {
    grid-template-columns: 1fr;
  }
}
</style>
