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
  CdxField,
  CdxIcon,
  CdxRadio,
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
import ResultItemCard from './ResultItemCard.vue'
import { lvl2xp, newEnchantment, newItem, type Item, type MergePlan, type Settings } from './worker'

const { t } = useI18n()

var BOOK = 'enchanted_book'

type states = 'start' | 'settings' | 'customInputs' | 'results'
const stateControl = ref<states>('start')

const settings = ref<Settings>({
  edition: 'java',
  mode: 'leastLvl',
})

const mergePlan = ref<MergePlan | null>(null)
const elapsed = ref<number>(0)
const currentItemPreset = ref<string>('')
const modifyingByPreset = ref(false)
/**steps.map((m) => ({
          input: { item: m.a, idx: m.aId },
          addition: { item: m.b, idx: m.bId },
          result: { item: m.result, idx: m.resultId },
          cost: m.cost,
        })) */

const defaultItems = [newItem(BOOK), newItem(BOOK)]
const inputItems = useLocalStorage<Item[]>(
  'mcwAnvilHelperSaves',
  JSON.parse(JSON.stringify(defaultItems)),
)
const lastSettings = ref<Settings | null>(null)
const lastInput = ref<Item[] | null>(null)

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
          .every(
            (e) =>
              a.id === e.id ||
              getEnchantmentInfo(e.id, settings.value.edition).exclusiveEnchantments.includes(a.id),
          ),
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
    currentItemPreset.value = ''
    inputItems.value = lastInput.value
  }
}

function resetAll() {
  inputItems.value = JSON.parse(JSON.stringify(defaultItems))
  mergePlan.value = null
}

const canStartCalculate = computed(() => {
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
  const start = performance.now()
  try {
    mergePlan.value = await worker.bestMergePlan(
      JSON.parse(JSON.stringify(lastInput.value)),
      JSON.parse(JSON.stringify(lastSettings.value)),
    )
  } finally {
    elapsed.value = performance.now() - start
  }
  if (mergePlan.value === null || mergePlan.value.steps.length === 0) {
    alert(t('anvilHelper.result.noSolution'))
    return
  } else {
    stateControl.value = 'results'
  }
}

const mergePlanXp = computed(() => ({
  minLvlXp: mergePlan.value ? lvl2xp(mergePlan.value.totalCost) : 0,
  minXp: mergePlan.value?.steps.map((e) => lvl2xp(e.cost)).reduce((a, b) => a + b) || 0,
}))

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
      currentItemPreset.value = ''
    } else {
      modifyingByPreset.value = false
    }
  },
)
watch(
  () => settings.value.edition,
  () => {
    resetAll()
  },
)
</script>
<template>
  <CalcField>
    <template #heading>
      {{ t('anvilHelper.title') }}
    </template>
    <!--StatesControl-->
    <CdxTabs v-model:active="stateControl" class="mb-2 flex flex-warp min-w-full justify-between">
      <CdxTab name="start" :label="t('anvilHelper.step.start')" />
      <CdxTab name="settings" :label="t('anvilHelper.step.settings')" />
      <CdxTab name="customInputs" :label="t('anvilHelper.step.customInputs')" />
      <CdxTab
        name="results"
        :label="t('anvilHelper.step.results')"
        :disabled="mergePlan === null || mergePlan.steps.length === 0"
      />
    </CdxTabs>
    <div class="flex overflow-x-auto min-w-200 flex-col gap-2">
      <!--Start-->
      <div
        class="flex-3 flex flex-col flex-wrap justify-center items-center gap-5 p-10"
        v-if="stateControl === 'start'"
      >
        <div class="flex min-w-8/12 items-center justify-center">
          <img :src="getRedirectedImageLink(`en:Anvil.png`)" class="h-40" />
        </div>
        <div class="flex min-w-8/12 items-center justify-center">
          <CdxTabs v-model:active="settings.edition" class="mb-2">
            <CdxTab name="java" :label="t('anvilHelper.java')" />
            <CdxTab name="bedrock" :label="t('anvilHelper.bedrock')" />
          </CdxTabs>
        </div>
        <div class="flex min-w-8/12 items-center justify-center">
          <span class="font-black text-lg" style="margin-right: 0.5em">
            {{ t('anvilHelper.selectPreset') }}
          </span>
          <CdxSelect
            class="long-handle flex-1"
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
        <div class="flex min-w-8/12 items-center justify-center gap-2">
          <CdxButton class="items-center" @click="stateControl = 'settings'">
            {{ t('anvilHelper.button.settings') }}
          </CdxButton>
          <CdxButton class="items-center" @click="stateControl = 'customInputs'">
            {{ t('anvilHelper.button.customInputs') }}
          </CdxButton>
          <CdxButton class="items-center" :disabled="!canStartCalculate" @click="updateMergePlan()">
            {{ t('anvilHelper.button.startCalculate') }}
          </CdxButton>
        </div>
      </div>
      <!--Settings-->
      <div
        class="flex-3 flex flex-col flex-wrap justify-start items-center gap-5 p-10"
        v-if="stateControl === 'settings'"
      >
        <CdxField
          :is-fieldset="true"
          class="flex flex-1 justify-start items-center min-w-8/12 gap-2"
        >
          <template #label>{{ t('anvilHelper.settings.gameEdition') }}</template>
          <CdxRadio v-model="settings.edition" name="edition" :inline="true" :input-value="'java'">
            {{ t('anvilHelper.java') }}
          </CdxRadio>
          <CdxRadio
            v-model="settings.edition"
            name="edition"
            :inline="true"
            :input-value="'bedrock'"
          >
            {{ t('anvilHelper.bedrock') }}
          </CdxRadio>
        </CdxField>
        <CdxField
          :is-fieldset="true"
          class="flex flex-1 justify-start items-center min-w-8/12 gap-2"
        >
          <template #label>{{ t('anvilHelper.settings.optimizationGoal') }}</template>
          <CdxRadio v-model="settings.mode" name="mode" :input-value="'leastXp'">
            {{ t('anvilHelper.leastXp') }}
          </CdxRadio>
          <CdxRadio v-model="settings.mode" name="mode" :input-value="'leastLvl'">
            {{ t('anvilHelper.leastLvl') }}
          </CdxRadio>
          <CdxRadio v-model="settings.mode" name="mode" :input-value="'leastRepairCost'">
            {{ t('anvilHelper.leastRepairCost') }}
          </CdxRadio>
        </CdxField>
        <div class="flex min-w-8/12 items-center justify-center gap-2">
          <CdxButton
            class="items-center"
            @click="
              (() => {
                stateControl = 'customInputs'
              })()
            "
          >
            {{ t('anvilHelper.button.customInputs') }}
          </CdxButton>
        </div>
      </div>
      <!--Input Items-->
      <div v-if="stateControl === 'customInputs'" class="flex min-x-full flex-col gap-2">
        <CdxTable
          :caption="t('anvilHelper.customInputs.caption')"
          :use-row-headers="true"
          :data="inputItems"
          :columns="
            inputItems.length > 0
              ? [
                  { id: 'idx', label: '#', textAlign: 'number' },
                  { id: 'type', label: t('anvilHelper.customInputs.itemType') },
                  { id: 'enchantments', label: t('anvilHelper.customInputs.enchantments') },
                  { id: 'repairCost', label: t('anvilHelper.customInputs.workPenalty') },
                  { id: 'actions', label: t('anvilHelper.customInputs.actions') },
                ]
              : []
          "
        >
          <template #header>
            <div class="flex flex-row flex-wrap justify-end gap-2">
              <div class="flex items-center justify-end">
                <span class="font-bold text-lg" style="margin-right: 0.5em">
                  {{ t('anvilHelper.selectPreset') }}
                </span>
                <CdxSelect
                  class="flex-1"
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
              <div class="flex justify-end gap-2">
                <CdxButton action="destructive" class="items-center" @click="restoreLastInput">
                  {{ t('anvilHelper.button.restoreLastInput') }}
                </CdxButton>

                <CdxButton
                  class="items-center"
                  :disabled="!canStartCalculate"
                  @click="updateMergePlan()"
                >
                  {{ t('anvilHelper.button.startCalculate') }}
                </CdxButton>
              </div>
            </div>
          </template>

          <template #item-idx="{ row }">{{ inputItems.indexOf(row) + 1 }} </template>

          <!--Item Type-->
          <template #item-type="{ row }">
            <div class="flex">
              <CdxSelect
                class="long-handle flex-1 shrink min-w-0"
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
          </template>

          <!--Enchantments-->
          <template #item-enchantments="{ item, row }: { item: Enchantment[]; row: Item }">
            <div v-if="item.length === 0" class="flex flex-1 grow min-w-full">
              <CdxButton
                weight="quiet"
                class="flex-1 grow min-w-full"
                @click="item.push(newEnchantment())"
              >
                <CdxIcon :icon="cdxIconAdd" /> {{ t('anvilHelper.addNewEnchantment') }}
              </CdxButton>
            </div>
            <div
              v-else
              v-for="e in item"
              class="flex flex-1 grow min-w-full gap-2 justify-between items-center"
            >
              <CdxSelect
                class="flex-1 grow"
                :default-label="t('anvilHelper.enchantment.defaultLabel')"
                :menu-items="
                  getfilteredEnchantmentMenuItems(
                    row.type,
                    currentItemType,
                    row.enchantments.filter((x) => x !== e),
                  )
                "
                :selected="e.id"
                @update:selected="(selected: string) => (e.id = selected)"
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
                class="min-w-15 w-15"
                input-type="number"
                v-model="e.level"
                min="1"
                :max="getEnchantmentInfo(e.id, settings.edition)?.maxLevel"
                @blur="
                  e.level = Math.max(
                    1,
                    Math.min(e.level, getEnchantmentInfo(e.id, settings.edition)?.maxLevel || 1),
                  )
                "
              />
              <CdxButton
                weight="quiet"
                class="min-h-0"
                size="small"
                aria-label="add"
                @click="row.enchantments.push(newEnchantment())"
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
          </template>
          <!--Penalty Count-->
          <template #item-repairCost="{ row }">
            <!--Penalty Count-->
            <CdxTextInput
              :model-value="String(Math.log2(row.repairCost + 1))"
              class="min-w-full w-full"
              input-type="number"
              placeholder="0"
              min="0"
              max="5"
              step="1"
              @update:model-value="
                (value: number) => {
                  const n = Math.min(999, Math.max(0, Number(value)))
                  row.repairCost = 2 ** n - 1
                }
              "
              @blur="
                () => {
                  const n = Math.min(5, Math.max(0, Math.round(Math.log2(row.repairCost + 1))))
                  row.repairCost = 2 ** n - 1
                }
              "
            />
            <div class="pt-2 text-nowrap repairCost min-w-26 w-26">
              {{ t('anvilHelper.repairCost.format', { lvl: row.repairCost }) }}
            </div>
          </template>
          <template #item-actions="{ row }">
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
          </template>
        </CdxTable>

        <div class="flex min-w-8/12 items-center justify-center gap-2">
          <CdxButton class="items-center" @click="stateControl = 'settings'">
            {{ t('anvilHelper.button.settings') }}
          </CdxButton>
          <CdxButton class="items-center" action="destructive" @click="resetAll()">
            {{ t('anvilHelper.button.resetAll') }}
          </CdxButton>
          <CdxButton action="destructive" class="items-center" @click="restoreLastInput">
            {{ t('anvilHelper.button.restoreLastInput') }}
          </CdxButton>
          <CdxButton class="items-center" :disabled="!canStartCalculate" @click="updateMergePlan()">
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
          :caption="t('anvilHelper.caption.result')"
          class="overflow-x-auto"
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
            <ResultItemCard
              :item="item.item"
              :idx="item.idx"
              :input-items-length="lastInput?.length ?? inputItems.length"
            />
          </template>
          <template #item-addition="{ item }: { item: { item: Item; idx: number } }">
            <ResultItemCard
              :item="item.item"
              :idx="item.idx"
              :input-items-length="lastInput?.length ?? inputItems.length"
            />
          </template>
          <template #item-result="{ item }: { item: { item: Item; idx: number } }">
            <ResultItemCard
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
            {{ mergePlanXp.minXp }}
            <img class="inline-block h-4" :src="getXpOrbImageLink(mergePlanXp.minXp)" />
          </span>
          <span v-if="mergePlan.steps.length > 1"> ~</span>
          <span>
            {{ mergePlanXp.minLvlXp }}
            <img class="inline-block h-4" :src="getXpOrbImageLink(mergePlanXp.minLvlXp)" />
          </span>
        </div>
        <div class="flex min-w-8/12 items-center justify-end gap-2">
          {{ t('anvilHelper.result.elapsed', { time: elapsed.toFixed(2) }) }}
        </div>
      </div>
    </div>
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

  .long-handle & {
    min-width: 120px;
  }
}
.error {
  font-size: larger;
  color: var(--color-error, #bf3c2c);
}
</style>
