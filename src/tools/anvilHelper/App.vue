<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import CalcField from '@/components/CalcField.vue'
import {
  getAllEnchantmentIds,
  getAllItemIds,
  getEnchantmentInfo,
  type Enchantment,
} from '@/utils/enchantment'
import { parseWikitext } from '@/utils/i18n/index.ts'
import { getImageLink, getRedirectedImageLink } from '@/utils/image'
import { useLocalStorage } from '@vueuse/core'
import {
  CdxButton,
  CdxIcon,
  CdxSelect,
  CdxTab,
  CdxTable,
  CdxTabs,
  CdxTextInput,
  type MenuItemData,
} from '@wikimedia/codex'
import { cdxIconAdd, cdxIconTrash } from '@wikimedia/codex-icons'
import { getEnchantedItemImageLink, getXpOrbImageLink } from './data/image'
import { getPresets } from './data/presets'
import SettingPanel from './SettingPanel.vue'
import ItemCard from './SingleItemCard.vue'
import { lvl2xp, newEnchantment, newItem, type Item, type MergePlan, type Settings } from './worker'

const { t } = useI18n()
const calculatorTop = ref<HTMLElement | null>(null)

var BOOK = 'enchanted_book'

type State = 'start' | 'customInputs' | 'results'
const stateControl = ref<State>('start')

const settings = useLocalStorage<Settings>('mcwAnvilHelperSettings', {
  edition: 'java',
  mode: 'leastLvl',
  allowExclusive: false,
  allowExceedProcessLimit: false,
})

const mergePlan = ref<MergePlan | null>(null)
const currentItemPreset = ref<string | null>(null)
const modifyingByPreset = ref(false)

const defaultItems = [newItem(BOOK), newItem(BOOK)]
const inputItems = useLocalStorage<Item[]>(
  'mcwAnvilHelperSaves',
  JSON.parse(JSON.stringify(defaultItems)),
)
const lastSettings = ref<Settings | null>(null)
const lastInput = ref<Item[] | null>(null)

/** Still need an upper bound to prevent astronomical figures from appearing*/
const penaltyUpperLimit = computed(() => (settings.value.allowExceedProcessLimit ? 20 : 5))

const itemTypes = computed(() => getAllItemIds(settings.value.edition))

const currentItemType = computed(
  () => inputItems.value.find((item) => item.type !== BOOK)?.type || BOOK,
)

const filteredItemTypes = computed(() => {
  if (currentItemType.value === BOOK) {
    return itemTypes.value
  } else {
    return [BOOK, currentItemType.value]
  }
})

function filteredEnchantments(itemType: string) {
  let allEnchantmentInfos = [...getAllEnchantmentIds(settings.value.edition)].map((e) =>
    getEnchantmentInfo(e, settings.value.edition),
  )
  return itemType === BOOK
    ? allEnchantmentInfos
    : allEnchantmentInfos.filter((e) => e.supportedItems.includes(itemType))
}

const filteredItemMenuItems = computed<MenuItemData[]>(() =>
  filteredItemTypes.value.map((a) => ({
    value: a,
    label: t(`global.item.${a}`),
  })),
)
function getfilteredEnchantmentMenuItems(
  itemType: string,
  currentItemType: string,
  otherEnchantments: Enchantment[],
) {
  return filteredEnchantments(itemType)
    .sort((a, b) =>
      a.supportedItems.includes(currentItemType) && !b.supportedItems.includes(currentItemType)
        ? -1
        : 1,
    )
    .map((a) => ({
      value: a.id,
      label: t(`global.enchantment.${a.id}`),
      disabled:
        otherEnchantments.filter((e) => e.id != '').length > 0 &&
        otherEnchantments
          .filter((e) => e.id != '')
          .find(
            (e) =>
              a.id === e.id ||
              (!settings.value.allowExclusive &&
                getEnchantmentInfo(e.id, settings.value.edition).exclusiveEnchantments.includes(
                  a.id,
                )),
          ) !== undefined,
    }))
}

const presetItems = computed(() => getPresets(settings.value.edition))

const presetMenuItems: MenuItemData[] = Object.keys(presetItems.value).map((a) => ({
  value: a,
  label: t(`global.item.${a}`),
}))

function applyPreset(select: string) {
  modifyingByPreset.value = true
  const preset = presetItems.value[select]
  if (!preset) {
    return
  }
  currentItemPreset.value = select
  inputItems.value = JSON.parse(JSON.stringify(preset))
}

function restoreLastInput() {
  modifyingByPreset.value = true
  if (lastInput.value !== null) {
    currentItemPreset.value = null
    inputItems.value = lastInput.value
  }
}

function resetAll() {
  inputItems.value = JSON.parse(JSON.stringify(defaultItems))
  mergePlan.value = null
  lastInput.value = null
  lastSettings.value = null
  currentItemPreset.value = null

  nextTick(() => {
    calculatorTop.value?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

const canCalculate = computed(() => {
  if (inputItems.value.length < 2) {
    return false
  }
  return inputItems.value.every((item) => {
    return item.type !== '' && item.enchantments.every((enchantment) => enchantment.id !== '')
  })
})

const worker = new ComlinkWorker<typeof import('./worker')>(new URL('./worker', import.meta.url))
async function updateMergePlan() {
  lastSettings.value = JSON.parse(JSON.stringify(settings.value))
  lastInput.value = JSON.parse(JSON.stringify(inputItems.value))
  mergePlan.value = null
  await nextTick()
  mergePlan.value = await worker.bestMergePlan(
    JSON.parse(JSON.stringify(lastInput.value)),
    JSON.parse(JSON.stringify(lastSettings.value)),
  )
  if (mergePlan.value === null || mergePlan.value.steps.length === 0) {
    alert(t('anvilHelper.result.noSolution'))
    return
  } else {
    stateControl.value = 'results'
  }
}

function handleEnchantedImgError(event: Event, itemType: string) {
  const imgEl = event.currentTarget as HTMLImageElement
  if (imgEl.src.endsWith('.gif')) {
    let newsrc = getEnchantedItemImageLink(itemType, false)
    console.warn(`${imgEl.src} not found, using '${newsrc}' instead.`)
    imgEl.src = newsrc
  } else {
    imgEl.src = getImageLink('No image.svg')
    imgEl.onerror = null
  }
}

watch(
  () => inputItems.value.map((obj) => obj.type),
  (newValue, oldValue) => {
    if (!modifyingByPreset.value) {
      newValue.forEach((type, index) => {
        let i = inputItems.value[index]
        if (type !== BOOK && type !== oldValue?.[index]) {
          i.enchantments = i.enchantments.map((e) => {
            let info = getEnchantmentInfo(e.id, settings.value.edition)
            return info && info.supportedItems.includes(type)
              ? newEnchantment(e.id)
              : newEnchantment()
          })
        }
        if (type === BOOK && i.enchantments.length === 0) {
          i.enchantments.push(newEnchantment())
        }
      })
      currentItemPreset.value = null
    } else {
      modifyingByPreset.value = false
    }
  },
)
watch(
  () => settings.value,
  () => {
    resetAll()
  },
)
</script>
<template>
  <CalcField>
    <template #heading>
      <div ref="calculatorTop">
        {{ t('anvilHelper.title') }}
      </div>
    </template>
    <!--StatesControl-->
    <CdxTabs v-model:active="stateControl" class="mb-2 flex flex-warp min-w-full justify-between">
      <CdxTab name="start" :label="t('anvilHelper.state.start')" />
      <CdxTab name="customInputs" :label="t('anvilHelper.state.customInputs')" />
      <CdxTab
        name="results"
        :label="t('anvilHelper.state.results')"
        :disabled="mergePlan === null || mergePlan.steps.length === 0"
      />
    </CdxTabs>
    <div class="flex overflow-x-auto flex-col gap-2">
      <!--Start-->
      <div
        class="flex-3 flex flex-col flex-wrap justify-center items-center gap-5 p-10"
        v-if="stateControl === 'start'"
      >
        <div class="flex min-w-8/12 items-center justify-center">
          <img :src="getRedirectedImageLink(`en:Anvil.png`)" class="h-40" />
        </div>
        <div class="flex min-w-8/12 items-center justify-center">
          <span class="font-black text-lg" style="margin-right: 0.5em">
            {{ t('anvilHelper.selectPreset') }}
          </span>
          <CdxSelect
            class="long-handle flex-1"
            :defaultLabel="t('anvilHelper.selectPreset.defaultLabel')"
            :menu-items="presetMenuItems"
            :selected="currentItemPreset ?? ''"
            @update:selected="(select: string) => applyPreset(select)"
          >
            <template #label="{ selectedMenuItem }: { selectedMenuItem: MenuItemData }">
              <div v-if="selectedMenuItem" class="flex items-center gap-2">
                <img
                  :src="getEnchantedItemImageLink(selectedMenuItem.value as string, true)"
                  width="24px"
                  style="display: inline"
                  @error="handleEnchantedImgError($event, selectedMenuItem.value as string)"
                />
                {{ selectedMenuItem.label }}
              </div>
            </template>
            <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
              <img
                :src="getEnchantedItemImageLink(menuItem.value as string, true)"
                width="24px"
                style="display: inline"
                @error="handleEnchantedImgError($event, menuItem.value as string)"
              />
              {{ menuItem.label }}
            </template>
          </CdxSelect>
        </div>
        <div
          v-if="currentItemPreset"
          class="flex w-full flex-wrap gap-3 items-center justify-center"
        >
          <span v-for="e in inputItems.flatMap((i) => i.enchantments)" class="presetEnchantment">{{
            t('global.enchantment.format', {
              id: t(`global.enchantment.${e.id}`),
              lvl: t(`global.level.${e.level}`),
            })
          }}</span>
        </div>
        <div class="flex w-full gap-2 items-center justify-center">
          <CdxButton class="items-center" @click="stateControl = 'customInputs'">
            {{ t('anvilHelper.button.customInputs') }}
          </CdxButton>
          <CdxButton
            class="items-center"
            :disabled="currentItemPreset === null || !canCalculate"
            @click="updateMergePlan()"
          >
            {{ t('anvilHelper.button.startCalculate') }}
          </CdxButton>
        </div>
      </div>
      <!--Input Items-->
      <div v-if="stateControl === 'customInputs'" class="flex w-full min-w-0 flex-col gap-2">
        <CdxTable
          class="anvil-input-table"
          :caption="t('anvilHelper.customInputs.caption')"
          :use-row-headers="true"
          :data="inputItems"
          :columns="
            inputItems.length > 0
              ? [
                  { id: 'idx', label: '#', textAlign: 'number' },
                  { id: 'type', label: t('anvilHelper.customInputs.itemType') },
                  { id: 'workPenalty', label: t('anvilHelper.customInputs.workPenalty') },
                  { id: 'actions', label: t('anvilHelper.customInputs.actions') },
                ]
              : []
          "
        >
          <template #header>
            <div class="flex flex-row flex-wrap justify-end items-center gap-2">
              <span class="font-bold text-lg" style="margin-right: 0.5em">
                {{ t('anvilHelper.selectPreset') }}
              </span>
              <CdxSelect
                class="flex-1 shrink min-w-65"
                :defaultLabel="t('anvilHelper.selectPreset.defaultLabel')"
                :menu-items="presetMenuItems"
                :selected="currentItemPreset"
                @update:selected="(select: string) => applyPreset(select)"
              >
                <template #label="{ selectedMenuItem }: { selectedMenuItem: MenuItemData }">
                  <div v-if="selectedMenuItem" class="flex items-center gap-2">
                    <img
                      :src="getEnchantedItemImageLink(selectedMenuItem.value as string, true)"
                      width="24px"
                      style="display: inline"
                      @error="handleEnchantedImgError($event, selectedMenuItem.value as string)"
                    />
                    {{ selectedMenuItem.label }}
                  </div>
                </template>
                <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
                  <img
                    :src="getEnchantedItemImageLink(menuItem.value as string, true)"
                    width="24px"
                    style="display: inline"
                    @error="handleEnchantedImgError($event, menuItem.value as string)"
                  />
                  {{ menuItem.label }}
                </template>
              </CdxSelect>
            </div>
          </template>

          <template #item-idx="{ row }">{{ inputItems.indexOf(row) + 1 }} </template>
          <template #item-type="{ row }: { row: Item }">
            <div
              class="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
            >
              <!--Item Type-->
              <div class="min-w-0">
                <CdxSelect
                  class="long-handle min-w-full"
                  :menu-items="filteredItemMenuItems"
                  :selected="row.type"
                  @update:selected="(selected: string) => (row.type = selected)"
                >
                  <template #label="{ selectedMenuItem }: { selectedMenuItem: MenuItemData }">
                    <div v-if="selectedMenuItem" class="flex items-center gap-2">
                      <img
                        :src="
                          getEnchantedItemImageLink(
                            row.type as string,
                            row.enchantments !== null &&
                              row.enchantments.length > 0 &&
                              row.enchantments.flatMap((e: Enchantment) => e.id).join() !== '',
                          )
                        "
                        width="24px"
                        style="display: inline"
                        @error="handleEnchantedImgError($event, selectedMenuItem.value as string)"
                      />
                      {{ selectedMenuItem.label }}
                    </div>
                  </template>
                  <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
                    <img
                      :src="
                        getEnchantedItemImageLink(
                          menuItem.value as string,
                          row.enchantments !== null &&
                            row.enchantments.length > 0 &&
                            row.enchantments.flatMap((e: Enchantment) => e.id).join() !== '',
                        )
                      "
                      width="24px"
                      style="display: inline"
                      @error="handleEnchantedImgError($event, menuItem.value as string)"
                    />
                    {{ menuItem.label }}
                  </template>
                </CdxSelect>
              </div>

              <!--Enchantments-->
              <div class="flex flex-col min-w-0 gap-2">
                <div
                  v-if="row.enchantments.length > 0"
                  v-for="(e, idx) in row.enchantments"
                  class="flex flex-1 flex-wrap grow gap-2 justify-end items-center"
                >
                  <CdxSelect
                    class="flex-1 grow"
                    :default-label="t('anvilHelper.enchantment.defaultLabel')"
                    :menu-items="
                      getfilteredEnchantmentMenuItems(
                        row.type,
                        currentItemType,
                        row.enchantments.filter((_x, i) => i !== idx),
                      )
                    "
                    :selected="e.id"
                    @update:selected="
                      (selected: string) => {
                        e.id = selected
                        e.level = Math.min(
                          e.level,
                          getEnchantmentInfo(selected, settings.edition).maxLevel,
                        )
                      }
                    "
                  >
                    <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
                      <div class="flex justify-between overflow-hidden">
                        {{ menuItem.label }}
                        <div class="ml-2">
                          {{
                            getEnchantmentInfo(
                              menuItem.value as string,
                              settings.edition,
                            )?.supportedItems.includes(currentItemType)
                              ? '👍'
                              : ''
                          }}
                        </div>
                      </div>
                    </template>
                  </CdxSelect>
                  <CdxTextInput
                    v-if="e.id !== ''"
                    class="flex-0 min-w-3/12"
                    input-type="number"
                    v-model="e.level"
                    min="1"
                    :max="getEnchantmentInfo(e.id, settings.edition)?.maxLevel"
                    @blur="
                      e.level = Math.max(
                        1,
                        Math.min(
                          e.level,
                          getEnchantmentInfo(e.id, settings.edition)?.maxLevel || 1,
                        ),
                      )
                    "
                  />
                  <div class="flex flex-0 min-w-fit gap-2">
                    <CdxButton
                      weight="quiet"
                      class="min-h-0"
                      size="small"
                      aria-label="add"
                      @click="row.enchantments.splice(idx + 1, 0, newEnchantment())"
                    >
                      <CdxIcon :icon="cdxIconAdd" />
                    </CdxButton>
                    <CdxButton
                      weight="quiet"
                      action="destructive"
                      :disabled="
                        row.enchantments.length === (row.type === BOOK ? 1 : 0) ||
                        inputItems.reduce((sum, i) => sum + i.enchantments.length, 0) < 2
                      "
                      class="min-h-0"
                      size="small"
                      aria-label="delete"
                      @click="row.enchantments.splice(row.enchantments.indexOf(e), 1)"
                    >
                      <CdxIcon :icon="cdxIconTrash" />
                    </CdxButton>
                  </div>
                </div>
                <div v-else class="flex flex-1 flex-wrap grow gap-2 justify-end items-center">
                  <CdxButton
                    weight="quiet"
                    class="flex-1 grow min-w-full"
                    @click="row.enchantments.push(newEnchantment())"
                  >
                    <CdxIcon :icon="cdxIconAdd" /> {{ t('anvilHelper.addNewEnchantment') }}
                  </CdxButton>
                </div>
              </div>
            </div>
          </template>
          <template #item-workPenalty="{ row }: { row: Item }">
            <!--Penalty Count-->
            <div class="flex flex-col gap-3">
              <CdxTextInput
                class="flex-0 min-w-fit"
                :model-value="String(Math.log2(row.repairCost + 1))"
                input-type="number"
                placeholder="0"
                min="0"
                :max="penaltyUpperLimit"
                step="1"
                @update:model-value="
                  (value: number) => {
                    const n = Math.min(penaltyUpperLimit, Math.max(0, Number(value)))
                    row.repairCost = 2 ** n - 1
                  }
                "
                @blur="
                  () => {
                    const n = Math.min(
                      penaltyUpperLimit,
                      Math.max(0, Math.round(Math.log2(row.repairCost + 1))),
                    )
                    row.repairCost = 2 ** n - 1
                  }
                "
              />
              <span class="repairCost">
                {{ t('anvilHelper.repairCost.format', { lvl: row.repairCost }) }}
              </span>
            </div>
          </template>
          <template #item-actions="{ row }">
            <div class="flex gap-2">
              <CdxButton
                weight="quiet"
                class="min-h-0"
                size="small"
                aria-label="add"
                @click="
                  inputItems.indexOf(row) === inputItems.length - 1
                    ? inputItems.push(newItem(BOOK))
                    : inputItems.splice(inputItems.indexOf(row) + 1, 0, newItem(BOOK))
                "
              >
                <CdxIcon :icon="cdxIconAdd" />
              </CdxButton>
              <CdxButton
                weight="quiet"
                action="destructive"
                :disabled="inputItems.length < 3"
                class="min-h-0"
                size="small"
                aria-label="delete"
                @click="inputItems.splice(inputItems.indexOf(row), 1)"
              >
                <CdxIcon :icon="cdxIconTrash" />
              </CdxButton>
            </div>
          </template>
        </CdxTable>
        <div class="flex w-full flex-wrap items-center justify-end gap-2 sm:justify-center">
          <CdxButton class="items-center" action="destructive" @click="resetAll()">
            {{ t('anvilHelper.button.resetAll') }}
          </CdxButton>
          <CdxButton
            action="destructive"
            class="items-center"
            :disabled="lastInput === null"
            @click="restoreLastInput"
          >
            {{ t('anvilHelper.button.restoreLastInput') }}
          </CdxButton>
          <CdxButton class="items-center" :disabled="!canCalculate" @click="updateMergePlan()">
            {{ t('anvilHelper.button.startCalculate') }}
          </CdxButton>
        </div>
      </div>
      <!--Results-->
      <div
        v-if="stateControl === 'results' && mergePlan !== null && mergePlan.steps.length > 0"
        class="flex flex-col min-w-full justify-center flex-wrap"
      >
        <CdxTable
          class="anvil-result-table"
          :caption="t('anvilHelper.result.caption')"
          :use-row-headers="true"
          :data="mergePlan.steps"
          :columns="[
            { id: 'idx', label: '#', textAlign: 'number' },
            { id: 'input', label: t('anvilHelper.mergeSteps.input') },
            { id: 'addition', label: t('anvilHelper.mergeSteps.addition') },
            { id: 'result', label: t('anvilHelper.mergeSteps.result') },
            { id: 'cost', label: t('anvilHelper.mergeSteps.cost') },
          ]"
        >
          <template #header>
            <span class="font-black text-lg">
              {{ t('anvilHelper.result.currentOptimizationGoal') }}
            </span>
            {{ lastSettings ? t(`anvilHelper.${lastSettings.mode}`) : '-' }}
          </template>
          <template #item-idx="{ row }">
            {{ mergePlan.steps.indexOf(row) + 1 }}
          </template>
          <template #item-input="{ item }: { item: { item: Item; idx: number } }">
            <ItemCard
              :item="item.item"
              :idx="item.idx"
              :input-items-length="lastInput?.length ?? inputItems.length"
            />
          </template>
          <template #item-addition="{ item }: { item: { item: Item; idx: number } }">
            <ItemCard
              :item="item.item"
              :idx="item.idx"
              :input-items-length="lastInput?.length ?? inputItems.length"
            />
          </template>
          <template #item-result="{ item }: { item: { item: Item; idx: number } }">
            <ItemCard
              :item="item.item"
              :idx="item.idx"
              :input-items-length="lastInput?.length ?? inputItems.length"
            />
          </template>
          <template #item-cost="{ item }: { item: number }">
            <div class="flex flex-col justify-center">
              <div>
                {{ item }}
                {{ t('anvilHelper.level') }}
              </div>
              <div>
                {{ lvl2xp(item) }}
                <img class="inline h-4" :src="getXpOrbImageLink(lvl2xp(item))" />
              </div>
            </div>
          </template>
          <template #tfoot>
            <tfoot>
              <tr>
                <th scope="row" class="cdx-table__table__cell--align-number">
                  {{ t('anvilHelper.result.total') }}
                </th>
                <td colspan="3"></td>

                <td>
                  {{ mergePlan.totalCost }}
                  {{ t('anvilHelper.level') }}
                </td>
              </tr>
            </tfoot>
          </template>
        </CdxTable>
        <div class="flex flex-1 grow items-center justify-end gap-2 text-nowrap">
          <span v-html="parseWikitext(t('anvilHelper.result.minXp'))" />
          <span
            v-if="mergePlan.steps.length > 1"
            class="explain"
            :title="t('anvilHelper.result.minXp.desc')"
          >
            {{ mergePlan.totalCostXp }}
            <img class="inline-block h-4" :src="getXpOrbImageLink(mergePlan.totalCostXp)" />
          </span>
          <span v-if="mergePlan.steps.length > 1"> ~</span>
          <span>
            {{ lvl2xp(mergePlan.totalCost) }}
            <img class="inline-block h-4" :src="getXpOrbImageLink(lvl2xp(mergePlan.totalCost))" />
          </span>
        </div>
        <div class="flex min-w-8/12 items-center justify-end gap-2">
          {{
            t('anvilHelper.result.stats', {
              e: mergePlan.stats.elapsedMs.toFixed(2),
              a: mergePlan.stats.mergeAttempts,
            })
          }}
        </div>
      </div>
    </div>
    <SettingPanel v-model:settings="settings" />
  </CalcField>
</template>
<style lang="less">
@import (reference) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';
.repairCost {
  color: var(--color-error, #bf3c2c);
}
.cdx-select-vue__handle {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  height: 36px;
  text-wrap-mode: nowrap;

  .long-handle & {
    min-width: 120px;
  }
}
.error {
  font-size: larger;
  color: var(--color-error, #bf3c2c);
}
.anvil-input-table,
.anvil-result-table {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.anvil-input-table .cdx-table__table-wrapper,
.anvil-result-table .cdx-table__table-wrapper {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}

.anvil-input-table .cdx-table__table,
.anvil-result-table .cdx-table__table {
  width: 100%;
  max-width: 100%;
  table-layout: fixed;
}

.anvil-input-table .cdx-table__table th,
.anvil-input-table .cdx-table__table td,
.anvil-result-table .cdx-table__table th,
.anvil-result-table .cdx-table__table td {
  box-sizing: border-box;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.anvil-input-table .cdx-table__table th:nth-child(1),
.anvil-input-table .cdx-table__table td:nth-child(1),
.anvil-result-table .cdx-table__table th:nth-child(1),
.anvil-result-table .cdx-table__table td:nth-child(1) {
  width: 80px;
  text-align: center;
}

.anvil-input-table .cdx-table__table th:nth-child(3),
.anvil-input-table .cdx-table__table td:nth-child(3) {
  width: 200px;
}

.anvil-input-table .cdx-table__table th:nth-child(4),
.anvil-input-table .cdx-table__table td:nth-child(4) {
  width: 80px;
}

.anvil-result-table .cdx-table__table th:nth-child(5),
.anvil-result-table .cdx-table__table td:nth-child(5) {
  width: 120px;
}

@media (max-width: 1200px) {
  .anvil-input-table .cdx-table__table-wrapper,
  .anvil-result-table .cdx-table__table-wrapper {
    scrollbar-width: thin;
  }

  .anvil-input-table .cdx-table__table {
    min-width: 600px;
  }

  .anvil-result-table .cdx-table__table {
    min-width: 800px;
  }

  .anvil-input-table .cdx-table__table th,
  .anvil-input-table .cdx-table__table td,
  .anvil-result-table .cdx-table__table th,
  .anvil-result-table .cdx-table__table td {
    padding: 8px;
  }

  .anvil-input-table .cdx-table__table th:nth-child(3),
  .anvil-input-table .cdx-table__table td:nth-child(3) {
    width: 160px;
  }

  .anvil-input-table .cdx-table__table th:nth-child(4),
  .anvil-input-table .cdx-table__table td:nth-child(4) {
    width: 88px;
  }
}
.presetEnchantment {
  border: 1px dashed #4a5565;
  border-radius: 4px;
  padding-left: 4px;
  padding-right: 4px;
}
</style>
