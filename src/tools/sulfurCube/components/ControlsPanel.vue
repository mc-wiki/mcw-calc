<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_3UniformFloorProfileId } from '../data/je26_3'
import type { CubePropertySelectionResolution, CubePropertySelectionState } from '../resolution'
import type { DiagnosticFormState, NumericFormValue, PlayerMeleeFormState } from './types'
import { CdxAccordion, CdxButton, CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  je26_3UniformFloorProfileDefinitions,
  je26_3UniformFloorProfileOrder,
} from '../data/je26_3'
import { sanitizeNumericInput } from '../input/numericInput'
import CubePropertyControls from './CubePropertyControls.vue'
import InfoTooltip from './InfoTooltip.vue'
import PlayerMeleeControls from './PlayerMeleeControls.vue'

const props = withDefaults(
  defineProps<{
    modelValue: DiagnosticFormState
    propertySelection: CubePropertySelectionState
    propertyResolution: CubePropertySelectionResolution
    playerMelee: PlayerMeleeFormState
    showTitle?: boolean
  }>(),
  {
    showTitle: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: DiagnosticFormState]
  'update:propertySelection': [value: CubePropertySelectionState]
  'update:playerMelee': [value: PlayerMeleeFormState]
  resetEverything: []
  resetPositionsAim: []
  resetArchetype: []
  resetWeapon: []
  resetFloor: []
  resetAttackerEyeStanding: []
}>()

const { t } = useI18n()
const floorItems: MenuItemData[] = je26_3UniformFloorProfileOrder.map((id) => ({
  value: id,
  label: t(`sulfurCube.floor.${id}`),
}))
const selectedFloorDefinition = computed(
  () => je26_3UniformFloorProfileDefinitions[props.modelValue.floorProfileId],
)
const selectedFloorScopeNote = computed(() => {
  const floor = selectedFloorDefinition.value

  return 'scopeNote' in floor ? floor.scopeNote : null
})
const floorNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
  useGrouping: false,
})
const floorPropertyRows = computed(() => {
  const floor = selectedFloorDefinition.value

  return [
    {
      label: t('sulfurCube.floor.surfaceHeight'),
      value: floorNumberFormatter.format(floor.surfaceHeightWithinBlock.value),
    },
    {
      label: t('sulfurCube.floor.friction'),
      value: floorNumberFormatter.format(floor.friction.value),
    },
    {
      label: t('sulfurCube.floor.bounceRestitution'),
      value: floorNumberFormatter.format(floor.bounceRestitution.value),
    },
    {
      label: t('sulfurCube.floor.speedFactor'),
      value: floorNumberFormatter.format(floor.speedFactor.value),
    },
    {
      label: t('sulfurCube.floor.suppressesBounce'),
      value: t(floor.suppressesBounce.value ? 'sulfurCube.yes' : 'sulfurCube.no'),
    },
  ]
})

function updateField(
  field: Exclude<keyof DiagnosticFormState, 'floorProfileId'>,
  value: NumericFormValue,
): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: sanitizeNumericInput(value),
  })
}

function updateFloor(value: string | number | null): void {
  if (
    typeof value === 'string' &&
    je26_3UniformFloorProfileOrder.includes(value as Je26_3UniformFloorProfileId)
  ) {
    emit('update:modelValue', {
      ...props.modelValue,
      floorProfileId: value as Je26_3UniformFloorProfileId,
    })
  }
}
</script>

<template>
  <section
    class="controls-panel"
    :aria-labelledby="showTitle ? 'sulfur-cube-controls-title' : undefined"
    :aria-label="showTitle ? undefined : t('sulfurCube.controls.title')"
  >
    <h3 v-if="showTitle" id="sulfur-cube-controls-title" class="controls-panel__title">
      {{ t('sulfurCube.controls.title') }}
    </h3>

    <CdxAccordion
      class="controls-group controls-group--properties"
      heading-level="h4"
      separation="outline"
      open
    >
      <template #title>
        <span class="input-subsection-title">
          <span class="field-label-with-info">
            {{ t('sulfurCube.properties.title') }}
            <InfoTooltip
              :text="t('sulfurCube.properties.archetypeDefinition')"
              :label="t('sulfurCube.properties.archetypeDefinitionLabel')"
            />
          </span>
          <CdxButton
            class="input-subsection-title__reset sulfur-cube-reset"
            size="small"
            @click.stop.prevent="emit('resetArchetype')"
          >
            {{ t('sulfurCube.reset.archetype') }}
          </CdxButton>
        </span>
      </template>
      <CubePropertyControls
        :model-value="propertySelection"
        :resolution="propertyResolution"
        :show-heading="false"
        @update:model-value="emit('update:propertySelection', $event)"
        @reset="emit('resetArchetype')"
      />
    </CdxAccordion>

    <CdxAccordion
      class="controls-group controls-group--weapon"
      heading-level="h4"
      separation="outline"
    >
      <template #title>
        <span class="input-subsection-title">
          <span class="field-label-with-info">
            {{ t('sulfurCube.attack.weapon') }}
            <InfoTooltip
              :text="t('sulfurCube.attack.help')"
              :label="t('sulfurCube.attack.helpLabel')"
            />
          </span>
          <CdxButton
            class="input-subsection-title__reset sulfur-cube-reset"
            size="small"
            @click.stop.prevent="emit('resetWeapon')"
          >
            {{ t('sulfurCube.reset.weapon') }}
          </CdxButton>
        </span>
      </template>
      <PlayerMeleeControls
        :model-value="playerMelee"
        :show-heading="false"
        @update:model-value="emit('update:playerMelee', $event)"
        @reset="emit('resetWeapon')"
      />
    </CdxAccordion>

    <CdxAccordion class="controls-group--coordinates" heading-level="h4" separation="outline">
      <template #title>
        <span class="input-subsection-title">
          <span class="field-label-with-info">
            {{ t('sulfurCube.controls.coordinates') }}
            <InfoTooltip
              :text="t('sulfurCube.controls.coordinatesHelp')"
              :label="t('sulfurCube.controls.coordinatesHelpLabel')"
            />
          </span>
          <CdxButton
            class="input-subsection-title__reset sulfur-cube-reset"
            size="small"
            @click.stop.prevent="emit('resetPositionsAim')"
          >
            {{ t('sulfurCube.reset.positionsAim') }}
          </CdxButton>
        </span>
      </template>

      <div class="coordinate-sections">
        <CdxField is-fieldset>
          <template #label>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.cubeFeet') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.cubeFeetHelp')"
                :label="t('sulfurCube.controls.cubeFeetHelpLabel')"
              />
            </span>
          </template>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.cubeFeetX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('cubeFeetX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.cubeFeetY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('cubeFeetY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.cubeFeetZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('cubeFeetZ', $event)"
              />
            </CdxField>
          </div>
        </CdxField>

        <CdxField is-fieldset>
          <template #label>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.attackerFeet') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.attackerFeetHelp')"
                :label="t('sulfurCube.controls.attackerFeetHelpLabel')"
              />
            </span>
          </template>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.attackerFeetX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerFeetX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.attackerFeetY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerFeetY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.attackerFeetZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerFeetZ', $event)"
              />
            </CdxField>
          </div>
        </CdxField>

        <CdxAccordion heading-level="h5" separation="outline">
          <template #title>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.attackerEyes') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.attackerEyesHelp')"
                :label="t('sulfurCube.controls.attackerEyesHelpLabel')"
              />
            </span>
          </template>

          <div class="eye-preset-row">
            <CdxButton @click="emit('resetAttackerEyeStanding')">
              {{ t('sulfurCube.controls.attackerEyesStandingDefault') }}
            </CdxButton>
          </div>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.attackerEyeX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerEyeX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.attackerEyeY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerEyeY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.attackerEyeZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('attackerEyeZ', $event)"
              />
            </CdxField>
          </div>
        </CdxAccordion>

        <CdxField is-fieldset>
          <template #label>
            <span class="field-label-with-info">
              {{ t('sulfurCube.controls.aimPoint') }}
              <InfoTooltip
                :text="t('sulfurCube.controls.aimPointHelp')"
                :label="t('sulfurCube.controls.aimPointHelpLabel')"
              />
            </span>
          </template>
          <div class="coordinate-grid">
            <CdxField>
              <template #label>X</template>
              <CdxTextInput
                :model-value="modelValue.aimX"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('aimX', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Y</template>
              <CdxTextInput
                :model-value="modelValue.aimY"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('aimY', $event)"
              />
            </CdxField>
            <CdxField>
              <template #label>Z</template>
              <CdxTextInput
                :model-value="modelValue.aimZ"
                input-type="number"
                step="0.1"
                @update:model-value="updateField('aimZ', $event)"
              />
            </CdxField>
          </div>
        </CdxField>
      </div>
    </CdxAccordion>

    <CdxAccordion class="controls-group--floor" heading-level="h4" separation="outline">
      <template #title>
        <span class="input-subsection-title">
          <span class="field-label-with-info">
            {{ t('sulfurCube.controls.uniformFloor') }}
            <InfoTooltip
              :text="t('sulfurCube.controls.uniformFloorHelp')"
              :label="t('sulfurCube.controls.uniformFloorHelpLabel')"
            />
          </span>
          <CdxButton
            class="input-subsection-title__reset sulfur-cube-reset"
            size="small"
            @click.stop.prevent="emit('resetFloor')"
          >
            {{ t('sulfurCube.reset.floor') }}
          </CdxButton>
        </span>
      </template>
      <div class="floor-controls">
        <div class="floor-controls__body">
          <CdxField :hide-label="true">
            <template #label>{{ t('sulfurCube.controls.uniformFloor') }}</template>
            <CdxSelect
              :selected="modelValue.floorProfileId"
              :menu-items="floorItems"
              :aria-label="t('sulfurCube.controls.uniformFloor')"
              :menu-config="{ renderInPlace: true }"
              @update:selected="updateFloor"
            />
          </CdxField>
          <div class="floor-controls__details">
            <dl class="floor-controls__values">
              <template v-for="row in floorPropertyRows" :key="row.label">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </template>
            </dl>
            <p v-if="selectedFloorScopeNote" class="floor-controls__note">
              {{ selectedFloorScopeNote }}
            </p>
          </div>
        </div>
      </div>
    </CdxAccordion>
  </section>
</template>

<style scoped>
.controls-panel {
  --numeric-input-width: calc(5.5rem + 1cm);

  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.controls-panel__title {
  margin: 0;
}

.controls-panel :deep(.cdx-accordion[open]) {
  overflow: visible;
}

.controls-group {
  display: grid;
  gap: 0.75rem;
}

.controls-group--properties {
  order: 1;
}

.controls-group--weapon {
  order: 2;
}

.controls-group--floor {
  order: 3;
}

.controls-group--coordinates {
  order: 4;
}

.field-label-with-info {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.input-subsection-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
}

.input-subsection-title__reset {
  flex: none;
  margin-left: auto;
}

.controls-panel :deep(.cdx-accordion__header__title) {
  flex: 1;
  min-width: 0;
}

.controls-panel :deep(.cdx-text-input) {
  min-width: var(--numeric-input-width);
  width: var(--numeric-input-width);
  max-width: var(--numeric-input-width);
}

.coordinate-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  width: min(100%, calc(17.5rem + 3cm));
  max-width: 100%;
}

.coordinate-grid > * {
  width: 100%;
  min-width: 0;
}

.coordinate-grid :deep(.cdx-text-input) {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.coordinate-grid :deep(label) {
  padding-left: 0.25rem;
}

.coordinate-sections {
  display: grid;
  gap: 1rem;
}

.eye-preset-row {
  margin-bottom: 0.75rem;
}

.floor-controls {
  display: grid;
  gap: 0.75rem;
}
.floor-controls__values {
  display: grid;
  grid-template-columns: minmax(10rem, 13rem) minmax(5rem, auto);
  gap: 0.4rem 0.75rem;
  width: min(100%, 24rem);
  margin: 0;
}
.floor-controls__body {
  display: grid;
  grid-template-columns: calc(11rem + 1cm) minmax(0, 1fr);
  gap: 1rem 2rem;
  align-items: center;
}
.floor-controls__body :deep(.cdx-select-vue),
.floor-controls__body :deep(.cdx-select-vue__handle) {
  width: 100%;
  min-width: 0;
}
.floor-controls__body :deep(.cdx-select-vue .cdx-menu) {
  top: 100% !important;
  right: auto !important;
  left: 0 !important;
  transform: none !important;
}
.floor-controls__details {
  display: grid;
  gap: 0.5rem;
  margin-left: 1cm;
}

.floor-controls__values > * {
  margin: 0;
}

.floor-controls__values dt,
.floor-controls__note {
  color: var(--color-subtle, #54595d);
}

.floor-controls__values dd {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.floor-controls__note {
  margin: 0;
  font-size: 0.8125rem;
}

@media (max-width: 32rem) {
  .floor-controls__body {
    grid-template-columns: 1fr;
  }
  .floor-controls__details {
    margin-left: 0;
  }
  .floor-controls__values {
    grid-template-columns: 1fr auto;
  }
}
</style>
