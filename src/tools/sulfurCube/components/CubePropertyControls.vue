<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Je26_3ArchetypeId } from '../data/je26_3'
import type {
  CubePropertySelectionResolution,
  CubePropertySelectionState,
  CustomPropertyField,
  CustomPropertyInput,
} from '../resolution'
import {
  CdxButton,
  CdxCheckbox,
  CdxField,
  CdxMessage,
  CdxSearchInput,
  CdxSelect,
  CdxTextInput,
  CdxToggleButtonGroup,
} from '@wikimedia/codex'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageLink } from '@/utils/image'
import {
  je26_3ArchetypeRegistryOrder,
  je26_3BlockMembershipIndex,
  je26_3SwallowableItemIds,
} from '../data/je26_3'
import { sanitizeNumericInput } from '../input/numericInput'
import {
  blockGridNavigationTargetIndex,
  blockSelectorSearchText,
  blockSpriteFileName,
  humanizeIdentifier,
} from '../presentation/blockSelector'
import {
  copyCurrentResolvedCubeProperties,
  selectCubePropertyArchetype,
  selectCubePropertyBlock,
  selectCubePropertyMode,
  updateCustomCubeProperty,
} from '../resolution'
import InfoTooltip from './InfoTooltip.vue'

const props = withDefaults(
  defineProps<{
    modelValue: CubePropertySelectionState
    resolution: CubePropertySelectionResolution
    showHeading?: boolean
  }>(),
  { showHeading: true },
)

const emit = defineEmits<{
  'update:modelValue': [value: CubePropertySelectionState]
  reset: []
}>()

const { t } = useI18n()
const blockSearch = ref('')
const blockFilterElement = ref<HTMLDetailsElement | null>(null)
const blockKeyboardFocusId = ref<string | null>(props.modelValue.selectedBlockId)
const selectedBlockArchetypeIds = ref<Je26_3ArchetypeId[]>([...je26_3ArchetypeRegistryOrder])
const activeBlockTooltip = ref<{
  readonly label: string
  readonly left: number
  readonly top: number
  readonly below: boolean
} | null>(null)
const numberFormatter = new Intl.NumberFormat('en', {
  maximumFractionDigits: 8,
  useGrouping: false,
})

interface BlockSelectorItem {
  readonly id: string
  readonly label: string
  readonly searchText: string
  readonly spriteUrl: string
  readonly archetypeIds: readonly Je26_3ArchetypeId[]
}

const allBlockItems: BlockSelectorItem[] = [...je26_3SwallowableItemIds]
  .map(
    (itemId): BlockSelectorItem => ({
      id: itemId,
      label: humanizeIdentifier(itemId),
      searchText: blockSelectorSearchText(itemId),
      spriteUrl: getImageLink(`en:${blockSpriteFileName(itemId)}`),
      archetypeIds: je26_3BlockMembershipIndex[itemId]!.orderedCandidateIds,
    }),
  )
  .sort((a, b) => a.label.localeCompare(b.label))

let preloadCancelled = false
let preloadIndex = 0
let activePreloads = 0
let preloadStartTimer: number | null = null
const preloadImages = new Set<HTMLImageElement>()

function preloadBlockSprites(): void {
  if (preloadCancelled) {
    return
  }

  while (activePreloads < 6 && preloadIndex < allBlockItems.length) {
    const image = new Image()
    const item = allBlockItems[preloadIndex]!

    preloadIndex += 1
    activePreloads += 1
    preloadImages.add(image)

    const finish = (): void => {
      image.onload = null
      image.onerror = null
      preloadImages.delete(image)
      activePreloads -= 1
      preloadBlockSprites()
    }

    image.onload = finish
    image.onerror = finish
    image.decoding = 'async'
    image.src = item.spriteUrl
  }
}

function closeBlockFilterOnOutsidePointer(event: PointerEvent): void {
  const filter = blockFilterElement.value
  const target = event.target

  if (filter?.open && target instanceof Node && !filter.contains(target)) {
    filter.open = false
  }
}

function closeBlockFilter(): void {
  if (blockFilterElement.value !== null) {
    blockFilterElement.value.open = false
  }
}

onMounted(() => {
  preloadStartTimer = window.setTimeout(preloadBlockSprites, 250)
  document.addEventListener('pointerdown', closeBlockFilterOnOutsidePointer)
})

onBeforeUnmount(() => {
  preloadCancelled = true
  document.removeEventListener('pointerdown', closeBlockFilterOnOutsidePointer)

  if (preloadStartTimer !== null) {
    window.clearTimeout(preloadStartTimer)
  }

  for (const image of preloadImages) {
    image.onload = null
    image.onerror = null
  }

  preloadImages.clear()
})

const filteredBlockItems = computed<BlockSelectorItem[]>(() => {
  const query = blockSearch.value.trim().toLowerCase()
  const selectedArchetypes = new Set(selectedBlockArchetypeIds.value)

  return allBlockItems.filter(
    ({ archetypeIds, searchText }) =>
      archetypeIds.some((archetypeId) => selectedArchetypes.has(archetypeId)) &&
      (query === '' || searchText.toLowerCase().includes(query)),
  )
})

watch(filteredBlockItems, (items) => {
  if (!items.some(({ id }) => id === blockKeyboardFocusId.value)) {
    blockKeyboardFocusId.value = items[0]?.id ?? null
  }
})

const allBlockArchetypesSelected = computed(
  () => selectedBlockArchetypeIds.value.length === je26_3ArchetypeRegistryOrder.length,
)
const someBlockArchetypesSelected = computed(
  () =>
    selectedBlockArchetypeIds.value.length > 0 &&
    selectedBlockArchetypeIds.value.length < je26_3ArchetypeRegistryOrder.length,
)

const archetypeItems: MenuItemData[] = je26_3ArchetypeRegistryOrder.map((archetypeId) => ({
  value: archetypeId,
  label: humanizeIdentifier(archetypeId),
}))

const modeButtons = computed(() => [
  { value: 'block', label: t('sulfurCube.properties.mode.block') },
  {
    value: 'archetype',
    label: t('sulfurCube.properties.mode.archetype'),
  },
  { value: 'custom', label: t('sulfurCube.properties.mode.custom') },
])

const customFormState = computed(() => props.modelValue.customWorkingCopy?.formState ?? null)
const currentLockedArchetypeIds = computed<readonly string[]>(() => {
  if (props.modelValue.lastLockedMode === 'block') {
    return je26_3BlockMembershipIndex[props.modelValue.selectedBlockId]?.orderedCandidateIds ?? []
  }

  return [props.modelValue.selectedArchetypeId]
})
const currentLockedArchetypeLabel = computed(() =>
  currentLockedArchetypeIds.value.map(humanizeIdentifier).join(' + '),
)
const matchingArchetypeLabels = computed(() =>
  props.resolution.candidateIds.map(humanizeIdentifier).join(', '),
)
const selectedBlockSummary = computed(() =>
  props.modelValue.mode === 'custom'
    ? t('sulfurCube.scene.customBlockSelection')
    : humanizeIdentifier(props.modelValue.selectedBlockId),
)
const selectedArchetypeSummary = computed(() =>
  props.modelValue.mode === 'custom'
    ? t('sulfurCube.properties.mode.custom')
    : matchingArchetypeLabels.value,
)

const lockedPropertyRows = computed(() => {
  const values = props.resolution.values

  if (values === null) {
    return []
  }

  return [
    {
      label: t('sulfurCube.properties.horizontalPower'),
      value: numberFormatter.format(values.horizontalPower),
    },
    {
      label: t('sulfurCube.properties.verticalPower'),
      value: numberFormatter.format(values.verticalPower),
    },
    {
      label: t('sulfurCube.properties.knockbackResistance'),
      value: numberFormatter.format(values.knockbackResistance),
    },
    {
      label: t('sulfurCube.properties.bounciness'),
      value: numberFormatter.format(values.bounciness),
    },
    {
      label: t('sulfurCube.properties.airDragModifier'),
      value: numberFormatter.format(values.airDragModifier),
    },
    {
      label: t('sulfurCube.properties.frictionModifier'),
      value: numberFormatter.format(values.frictionModifier),
    },
  ]
})

function updateMode(value: string | number | null | (string | number)[]): void {
  if (value === 'block' || value === 'archetype' || value === 'custom') {
    emit('update:modelValue', selectCubePropertyMode(props.modelValue, value))
  }
}

function updateBlock(value: string): void {
  hideBlockTooltip()
  blockKeyboardFocusId.value = value
  emit('update:modelValue', selectCubePropertyBlock(props.modelValue, value))
}

function toggleAllBlockArchetypes(selected: boolean): void {
  hideBlockTooltip()
  selectedBlockArchetypeIds.value = selected ? [...je26_3ArchetypeRegistryOrder] : []
}

function toggleBlockArchetype(archetypeId: Je26_3ArchetypeId, selected: boolean): void {
  hideBlockTooltip()
  const nextIds = new Set(selectedBlockArchetypeIds.value)

  if (selected) {
    nextIds.add(archetypeId)
  } else {
    nextIds.delete(archetypeId)
  }

  selectedBlockArchetypeIds.value = je26_3ArchetypeRegistryOrder.filter((id) => nextIds.has(id))
}

function updateArchetype(value: string | number | null): void {
  if (
    typeof value === 'string' &&
    je26_3ArchetypeRegistryOrder.includes(value as (typeof je26_3ArchetypeRegistryOrder)[number])
  ) {
    emit(
      'update:modelValue',
      selectCubePropertyArchetype(
        props.modelValue,
        value as (typeof je26_3ArchetypeRegistryOrder)[number],
      ),
    )
  }
}

function updateCustomField(field: CustomPropertyField, value: CustomPropertyInput): void {
  emit(
    'update:modelValue',
    updateCustomCubeProperty(props.modelValue, field, sanitizeNumericInput(value)),
  )
}

function copyCurrentResolvedValues(): void {
  emit('update:modelValue', copyCurrentResolvedCubeProperties(props.modelValue))
}

function customFieldHasError(field: CustomPropertyField): boolean {
  return props.resolution.diagnostics.some(
    (diagnostic) =>
      (diagnostic.kind === 'invalid_custom_number' ||
        diagnostic.kind === 'custom_value_out_of_range') &&
      diagnostic.field === field,
  )
}

function showBlockTooltip(item: BlockSelectorItem, event: Event): void {
  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) {
    return
  }

  const bounds = target.getBoundingClientRect()
  const below = bounds.top < 80
  const horizontalMargin = Math.min(128, window.innerWidth / 2)

  activeBlockTooltip.value = {
    label: item.label,
    left: Math.min(
      window.innerWidth - horizontalMargin,
      Math.max(horizontalMargin, bounds.left + bounds.width / 2),
    ),
    top: below ? bounds.bottom + 8 : bounds.top - 8,
    below,
  }
}

function focusBlockItem(item: BlockSelectorItem, event: FocusEvent): void {
  blockKeyboardFocusId.value = item.id
  showBlockTooltip(item, event)
}

function moveBlockKeyboardFocus(event: KeyboardEvent): void {
  const current = event.currentTarget

  if (!(current instanceof HTMLButtonElement)) {
    return
  }

  const container = current.parentElement

  if (container === null) {
    return
  }

  const buttons = [...container.querySelectorAll<HTMLButtonElement>('.block-picker__item')]
  const currentIndex = buttons.indexOf(current)

  if (currentIndex < 0 || buttons.length === 0) {
    return
  }

  const firstTop = buttons[0]!.getBoundingClientRect().top
  const firstDifferentRow = buttons.findIndex(
    (button) => Math.abs(button.getBoundingClientRect().top - firstTop) > 1,
  )
  const columns = firstDifferentRow < 0 ? buttons.length : firstDifferentRow
  const targetIndex = blockGridNavigationTargetIndex(
    currentIndex,
    buttons.length,
    columns,
    event.key,
  )

  if (targetIndex === null) {
    return
  }

  const target = buttons[targetIndex]!

  event.preventDefault()
  blockKeyboardFocusId.value = target.dataset.itemId ?? null
  target.focus()
}

function hideBlockTooltip(): void {
  activeBlockTooltip.value = null
}
</script>

<template>
  <section
    class="property-controls"
    :class="{ 'property-controls--embedded': !showHeading }"
    :aria-labelledby="showHeading ? 'sulfur-cube-properties-title' : undefined"
    :aria-label="showHeading ? undefined : t('sulfurCube.properties.title')"
  >
    <div v-if="showHeading" class="property-controls__heading">
      <div class="property-controls__heading-title">
        <h4 id="sulfur-cube-properties-title">{{ t('sulfurCube.properties.title') }}</h4>
        <InfoTooltip
          :text="t('sulfurCube.properties.archetypeDefinition')"
          :label="t('sulfurCube.properties.archetypeDefinitionLabel')"
          placement="right"
        />
      </div>
      <CdxButton class="sulfur-cube-reset" size="small" @click="emit('reset')">
        {{ t('sulfurCube.reset.archetype') }}
      </CdxButton>
    </div>

    <p class="property-controls__selection-summary">
      <span>
        <strong>{{ t('sulfurCube.scene.selectedBlockLabel') }}:</strong>
        {{ selectedBlockSummary }}
      </span>
      <span>
        <strong>{{ t('sulfurCube.scene.archetypeLabel') }}:</strong>
        {{ selectedArchetypeSummary }}
      </span>
    </p>

    <CdxToggleButtonGroup
      :model-value="modelValue.mode"
      :buttons="modeButtons"
      @update:model-value="updateMode"
    />

    <CdxField v-if="modelValue.mode === 'block'">
      <template #label>
        <span class="field-label-with-info">
          {{ t('sulfurCube.properties.absorbedBlock') }}
          <InfoTooltip
            :text="t('sulfurCube.properties.absorbedBlockHelp')"
            :label="t('sulfurCube.properties.absorbedBlockHelpLabel')"
          />
        </span>
      </template>
      <div class="block-picker">
        <div class="block-picker__controls">
          <CdxSearchInput
            v-model="blockSearch"
            :use-button="false"
            clearable
            :aria-label="t('sulfurCube.properties.blockSearchLabel')"
            :placeholder="t('sulfurCube.properties.blockSearchPlaceholder')"
          />
          <details
            ref="blockFilterElement"
            class="block-picker__filter"
            @keydown.esc="closeBlockFilter"
          >
            <summary>
              {{
                t('sulfurCube.properties.blockArchetypeFilterSummary', {
                  selected: selectedBlockArchetypeIds.length,
                  total: je26_3ArchetypeRegistryOrder.length,
                })
              }}
            </summary>
            <fieldset>
              <legend>{{ t('sulfurCube.properties.blockArchetypeFilter') }}</legend>
              <CdxCheckbox
                :model-value="allBlockArchetypesSelected"
                :indeterminate="someBlockArchetypesSelected"
                @update:model-value="toggleAllBlockArchetypes"
              >
                {{ t('sulfurCube.properties.blockArchetypeAll') }}
              </CdxCheckbox>
              <CdxCheckbox
                v-for="item in archetypeItems"
                :key="item.value"
                :model-value="selectedBlockArchetypeIds.includes(item.value as Je26_3ArchetypeId)"
                @update:model-value="toggleBlockArchetype(item.value as Je26_3ArchetypeId, $event)"
              >
                {{ item.label }}
              </CdxCheckbox>
            </fieldset>
          </details>
        </div>
        <div
          class="block-picker__results"
          role="listbox"
          :aria-label="t('sulfurCube.properties.blockResultsLabel')"
          aria-describedby="sulfur-cube-block-results-keyboard-help"
          @scroll="hideBlockTooltip"
        >
          <button
            v-for="item in filteredBlockItems"
            :key="item.id"
            class="block-picker__item"
            :class="{ 'block-picker__item--selected': item.id === modelValue.selectedBlockId }"
            type="button"
            role="option"
            :data-item-id="item.id"
            :tabindex="item.id === blockKeyboardFocusId ? 0 : -1"
            :aria-selected="item.id === modelValue.selectedBlockId"
            :aria-label="item.label"
            @mouseenter="showBlockTooltip(item, $event)"
            @mouseleave="hideBlockTooltip"
            @focus="focusBlockItem(item, $event)"
            @blur="hideBlockTooltip"
            @keydown="moveBlockKeyboardFocus"
            @click="updateBlock(item.id)"
          >
            <img
              class="block-picker__image pixel-image"
              :src="item.spriteUrl"
              alt=""
              width="32"
              height="32"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
          </button>
          <p v-if="filteredBlockItems.length === 0" class="block-picker__empty">
            {{ t('sulfurCube.properties.blockNoResults') }}
          </p>
        </div>
        <p id="sulfur-cube-block-results-keyboard-help" class="visually-hidden">
          {{ t('sulfurCube.properties.blockResultsKeyboardHelp') }}
        </p>
        <p class="block-picker__count" aria-live="polite">
          {{
            t('sulfurCube.properties.blockResultCount', {
              shown: filteredBlockItems.length,
              total: allBlockItems.length,
            })
          }}
        </p>
      </div>
    </CdxField>

    <CdxField v-else-if="modelValue.mode === 'archetype'">
      <template #label>
        <span class="field-label-with-info">
          {{ t('sulfurCube.properties.archetype') }}
          <InfoTooltip
            :text="t('sulfurCube.properties.archetypeHelp')"
            :label="t('sulfurCube.properties.archetypeHelpLabel')"
          />
        </span>
      </template>
      <CdxSelect
        :selected="modelValue.selectedArchetypeId"
        :menu-items="archetypeItems"
        :aria-label="t('sulfurCube.properties.archetype')"
        @update:selected="updateArchetype"
      />
    </CdxField>

    <template v-else>
      <p class="property-controls__custom-help">
        {{ t('sulfurCube.properties.customHelp') }}
      </p>

      <CdxMessage v-if="!resolution.supported" type="warning">
        {{ t('sulfurCube.properties.customInvalid') }}
      </CdxMessage>

      <div v-if="customFormState" class="property-controls__custom-editor">
        <div class="property-controls__custom-grid">
          <CdxField :status="customFieldHasError('horizontalPower') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.horizontalPower') }}</template>
            <CdxTextInput
              :model-value="customFormState.horizontalPower"
              :status="customFieldHasError('horizontalPower') ? 'error' : 'default'"
              input-type="number"
              step="0.01"
              @update:model-value="updateCustomField('horizontalPower', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('verticalPower') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.verticalPower') }}</template>
            <CdxTextInput
              :model-value="customFormState.verticalPower"
              :status="customFieldHasError('verticalPower') ? 'error' : 'default'"
              input-type="number"
              step="0.01"
              @update:model-value="updateCustomField('verticalPower', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('knockbackResistance') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.knockbackResistance') }}</template>
            <CdxTextInput
              :model-value="customFormState.knockbackResistance"
              :status="customFieldHasError('knockbackResistance') ? 'error' : 'default'"
              input-type="number"
              min="-2"
              max="1"
              step="0.05"
              @update:model-value="updateCustomField('knockbackResistance', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('airDragModifier') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.airDragModifier') }}</template>
            <CdxTextInput
              :model-value="customFormState.airDragModifier"
              :status="customFieldHasError('airDragModifier') ? 'error' : 'default'"
              input-type="number"
              min="0"
              max="2048"
              step="0.01"
              @update:model-value="updateCustomField('airDragModifier', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('bounciness') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.bounciness') }}</template>
            <CdxTextInput
              :model-value="customFormState.bounciness"
              :status="customFieldHasError('bounciness') ? 'error' : 'default'"
              input-type="number"
              min="0"
              max="1"
              step="0.05"
              @update:model-value="updateCustomField('bounciness', $event)"
            />
          </CdxField>
          <CdxField :status="customFieldHasError('frictionModifier') ? 'error' : 'default'">
            <template #label>{{ t('sulfurCube.properties.frictionModifier') }}</template>
            <CdxTextInput
              :model-value="customFormState.frictionModifier"
              :status="customFieldHasError('frictionModifier') ? 'error' : 'default'"
              input-type="number"
              min="0"
              max="2048"
              step="0.01"
              @update:model-value="updateCustomField('frictionModifier', $event)"
            />
          </CdxField>
        </div>
        <CdxButton
          class="property-controls__reset-custom sulfur-cube-reset"
          @click="copyCurrentResolvedValues"
        >
          <span>{{ t('sulfurCube.properties.resetCustomTo') }}</span>
          <strong>{{ currentLockedArchetypeLabel }}</strong>
        </CdxButton>
      </div>
    </template>

    <Teleport to="body">
      <div
        v-if="activeBlockTooltip"
        class="cdx-tooltip block-picker__tooltip"
        :class="{ 'block-picker__tooltip--below': activeBlockTooltip.below }"
        :style="{
          left: `${activeBlockTooltip.left}px`,
          top: `${activeBlockTooltip.top}px`,
        }"
        role="tooltip"
      >
        {{ activeBlockTooltip.label }}
      </div>
    </Teleport>

    <div v-if="modelValue.mode !== 'custom'" class="property-controls__resolved">
      <p v-if="modelValue.mode === 'block'">
        <strong>{{ t('sulfurCube.properties.matchingDefinitions') }}</strong>
        <span>{{ matchingArchetypeLabels }}</span>
      </p>

      <dl class="property-controls__values">
        <template v-for="row in lockedPropertyRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
      </dl>
      <p class="property-controls__locked-help">
        {{ t('sulfurCube.properties.lockedHelp') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.property-controls {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  background: var(--background-color-neutral-subtle, #f8f9fa);
}

.property-controls--embedded {
  border: 0;
  padding: 0;
  background: transparent;
}

.property-controls--embedded .property-controls__heading {
  justify-content: flex-end;
}

.property-controls__heading,
.property-controls__heading-title,
.field-label-with-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.property-controls__heading {
  justify-content: space-between;
}

.property-controls__heading h4 {
  margin: 0;
  font-size: 1.125rem;
}

.property-controls__selection-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin: 0;
  color: var(--color-subtle, #54595d);
  font-size: 0.875rem;
}

.property-controls__custom-help,
.property-controls__locked-help,
.property-controls__resolved p {
  margin: 0;
}

.property-controls__values {
  display: grid;
  grid-template-columns: minmax(10rem, 13rem) minmax(5rem, auto);
  gap: 0.5rem 0.75rem;
  width: min(100%, 24rem);
}

.property-controls__locked-help {
  font-style: italic;
}

.block-picker {
  display: grid;
  gap: 0.5rem;
}

.block-picker__controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.5rem;
}

.block-picker__controls :deep(.cdx-search-input) {
  width: 100%;
  max-width: none;
}

.property-controls .block-picker__controls :deep(.cdx-search-input__text-input.cdx-text-input) {
  width: 100%;
  min-width: 0;
  max-width: none;
}

.block-picker__filter {
  position: relative;
  min-width: 0;
}

.block-picker__filter summary {
  box-sizing: border-box;
  min-height: 2rem;
  padding: 0.25rem 2rem 0.25rem 0.75rem;
  overflow: hidden;
  border: 1px solid var(--border-color-interactive, #72777d);
  border-radius: 2px;
  background: var(--background-color-interactive-subtle, #f8f9fa);
  color: var(--color-base, #202122);
  line-height: 1.5rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.block-picker__filter summary:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
  background: var(--background-color-interactive-subtle--hover, #eaecf0);
}

.block-picker__filter fieldset {
  position: absolute;
  z-index: 3;
  top: calc(100% + 0.25rem);
  right: 0;
  box-sizing: border-box;
  display: grid;
  width: 100%;
  max-height: 18rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  overflow-y: auto;
  border: 1px solid var(--border-color-interactive, #72777d);
  border-radius: 2px;
  background: var(--background-color-base, #fff);
  box-shadow: 0 2px 8px rgb(0 0 0 / 18%);
}

.block-picker__filter legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.block-picker__filter :deep(.cdx-checkbox:first-of-type) {
  margin-bottom: 0.25rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
  font-weight: 600;
}

.block-picker__results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr));
  gap: 0.4rem;
  max-height: 18rem;
  padding: 0.5rem;
  overflow-y: auto;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  background: var(--background-color-base, #fff);
}

.block-picker__item {
  appearance: none;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  min-height: 3rem;
  min-width: 0;
  border: 1px solid var(--border-color-interactive, #72777d);
  border-radius: 2px;
  padding: 0.4rem;
  overflow: visible;
  background: var(--background-color-interactive-subtle, #f8f9fa);
  color: var(--color-base, #202122);
  line-height: 1;
  cursor: pointer;
  contain: layout paint;
}

.block-picker__item:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
  background: var(--background-color-interactive-subtle--hover, #eaecf0);
}

.block-picker__item:focus-visible {
  border-color: var(--border-color-progressive--focus, #36c);
  box-shadow: inset 0 0 0 1px var(--box-shadow-color-progressive--focus, #36c);
  outline: 1px solid transparent;
}

.block-picker__image {
  display: block;
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.block-picker__item--selected {
  border-color: var(--color-base, #202122);
  outline: 3px solid var(--color-base, #202122);
  outline-offset: -3px;
  background: var(--background-color-progressive-subtle, #eaf3ff);
}

.block-picker__tooltip {
  display: block;
  position: fixed;
  z-index: 900;
  width: max-content;
  max-width: min(20rem, calc(100vw - 2rem));
  pointer-events: none;
  transform: translate(-50%, -100%);
}

.block-picker__tooltip--below {
  transform: translate(-50%, 0);
}

.block-picker__empty {
  grid-column: 1 / -1;
  margin: 1rem;
  color: var(--color-subtle, #54595d);
  text-align: center;
}

.block-picker__count {
  margin: 0;
  color: var(--color-subtle, #54595d);
  font-size: 0.8rem;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
  clip-path: inset(50%);
}

.property-controls__custom-editor {
  display: grid;
  grid-template-columns: minmax(0, 22rem) minmax(8rem, 1fr);
  align-items: center;
  width: 100%;
  gap: 0.75rem;
}

.property-controls__custom-grid {
  display: grid;
  gap: 0.25rem;
}

.property-controls__custom-grid :deep(.cdx-field) {
  display: grid;
  grid-template-columns: minmax(10rem, 13rem) minmax(5rem, 8rem);
  align-items: center;
  gap: 0.5rem;
}

.property-controls__reset-custom {
  display: grid;
  align-self: center;
  justify-self: center;
  min-width: 8rem;
  padding-block: 0.45rem;
  line-height: 1.2;
  text-align: center;
}

.property-controls__reset-custom span {
  color: var(--color-subtle, #54595d);
}

.property-controls__reset-custom strong {
  color: #202122;
}

:global(.dark .property-controls__reset-custom strong) {
  color: #fff;
}

.property-controls__resolved {
  display: grid;
  gap: 0.5rem;
}

.property-controls__resolved strong {
  margin-right: 0.4rem;
}

.property-controls__values {
  margin: 0;
}

.property-controls__values > * {
  margin: 0;
}

.property-controls__values dd {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.property-controls :deep(.cdx-lookup),
.property-controls :deep(.cdx-select) {
  max-width: 30rem;
}

@media (max-width: 32rem) {
  .block-picker__controls,
  .property-controls__custom-editor {
    grid-template-columns: 1fr;
  }

  .block-picker__filter fieldset {
    position: static;
    margin-top: 0.25rem;
  }

  .property-controls__reset-custom {
    justify-self: start;
  }
}
</style>
