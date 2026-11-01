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
import {
  cdxIconAdd,
  cdxIconError,
  cdxIconInfo,
  cdxIconTableAddRowAfter,
  cdxIconTrash,
} from '@wikimedia/codex-icons'
import { getXpOrbImageUrl, itemIcon } from './data/image'
import { getPresets } from './data/presets'
import ResultItemCard from './ResultItemCard.vue'
import { lvl2xp, newEnchantment, newItem, type Item, type MergePlan } from './worker'

const { t } = useI18n()

var BOOK = 'enchanted_book'

const edition = ref<'java' | 'bedrock'>('java')
const mergePlan = ref<MergePlan | null>(null)
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
const lastInput = ref<Item[] | null>(null)

const itemTypes = computed(() => getAllItemIds(edition.value))

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
  let allEnchantmentInfos = [...getAllEnchantmentIds(edition.value)].map((e) =>
    getEnchantmentInfo(e, edition.value),
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

const presetItems = computed(() => getPresets(edition.value))

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
  lastInput.value = JSON.parse(JSON.stringify(inputItems.value))
  await nextTick()
  mergePlan.value = await worker.bestMergePlan(
    JSON.parse(JSON.stringify(lastInput.value)),
    edition.value,
  )
}

const mergePlanXp = computed(() => ({
  minLvlXp: mergePlan.value ? lvl2xp(mergePlan.value.totalCost) : 0,
  minXp: mergePlan.value?.steps.map((e) => lvl2xp(e.cost)).reduce((a, b) => a + b) || 0,
}))

function handleEnchantedImgError(event: Event, itemType: string) {
  const imgEl = event.currentTarget as HTMLImageElement
  if (!imgEl.src.endsWith('.svg')) {
    imgEl.src = getImageLink(`zh:${itemIcon[itemType as keyof typeof itemIcon]}`)
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
            let info = getEnchantmentInfo(e.id, edition.value)
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
  () => edition.value,
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
    <!--Editon-->
    <CdxTabs v-model:active="edition" class="mb-2">
      <CdxTab name="java" :label="t('anvilHelper.java')" />
      <CdxTab name="bedrock" :label="t('anvilHelper.bedrock')" />
    </CdxTabs>
    <div class="flex flex-wrap gap-2">
      <div class="flex-2">
        <CdxTable
          :caption="t('anvilHelper.caption.inputItems')"
          :use-row-headers="true"
          :data="
            inputItems.map((i) => ({
              item: i,
            }))
          "
          :columns="
            inputItems.length > 0
              ? [
                  { id: 'idx', label: '#', textAlign: 'number' },
                  { id: 'item', label: t('anvilHelper.input') },
                  { id: 'actions', label: t('anvilHelper.actions') },
                ]
              : []
          "
        >
          <template #header>
            <div class="flex flex-wrap flex-auto gap-2 justify-end items-center">
              <div class="flex flex-row gap-2">
                <CdxButton @click="inputItems.push(newItem(BOOK))">
                  <CdxIcon :icon="cdxIconTableAddRowAfter"></CdxIcon>
                  {{ t('anvilHelper.newItem') }}
                </CdxButton>
                <CdxButton action="destructive" @click="resetAll">
                  <CdxIcon :icon="cdxIconTrash"></CdxIcon>
                  {{ t('anvilHelper.resetAll') }}
                </CdxButton>
              </div>
            </div>
          </template>
          <template #item-idx="{ row }">{{ inputItems.indexOf(row.item) + 1 }} </template>

          <template #item-item="{ item }: { item: Item }">
            <div class="flex flex-col flex-wrap gap-0.5">
              <div class="flex flex-1 grow min-w-full">
                <CdxSelect
                  class="long-handle flex-1 grow min-w-full"
                  :menu-items="filteredItemMenuItems"
                  :selected="item.type"
                  @update:selected="(selected: string) => (item.type = selected)"
                >
                  <template #label="{ selectedMenuItem }: { selectedMenuItem: MenuItemData }">
                    <div v-if="selectedMenuItem" class="flex items-center gap-2">
                      <img
                        :src="
                          item.enchantments !== null &&
                          item.enchantments.length > 0 &&
                          item.enchantments.flatMap((e: Enchantment) => e.id).join() !== ''
                            ? getImageLink(`zh:${itemIcon[item.type as keyof typeof itemIcon]}`)
                            : getImageLink(`zh:${itemIcon[item.type as keyof typeof itemIcon]}`)
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
                        item.enchantments !== null &&
                        item.enchantments.length > 0 &&
                        item.enchantments.flatMap((e: Enchantment) => e.id).join() !== ''
                          ? getImageLink(`zh:${itemIcon[menuItem.value as keyof typeof itemIcon]}`)
                          : getImageLink(`zh:${itemIcon[menuItem.value as keyof typeof itemIcon]}`)
                      "
                      width="24px"
                      style="display: inline"
                      @error="handleEnchantedImgError($event, menuItem.value as string)"
                    />
                    {{ menuItem.label }}
                  </template>
                </CdxSelect>
              </div>
              <div v-if="item.enchantments.length === 0" class="flex flex-1 grow min-w-full">
                <CdxButton
                  weight="quiet"
                  class="flex-1 grow min-w-full"
                  @click="item.enchantments.push(newEnchantment())"
                >
                  <CdxIcon :icon="cdxIconAdd" /> {{ t('anvilHelper.addNewEnchantment') }}
                </CdxButton>
              </div>
              <div
                v-else
                v-for="e in item.enchantments"
                :key="e.id"
                class="flex flex-1 grow min-w-full gap-2 justify-between items-center"
              >
                <CdxSelect
                  class="flex-1 grow"
                  :default-label="t('anvilHelper.enchantment.defaultLabel')"
                  :menu-items="
                    filteredEnchantments(item.type).map((a: { id: string }) => ({
                      value: a.id,
                      label: t(`global.enchantment.${a.id}`),
                      disabled: item.enchantments.every(
                        (e) =>
                          e.id !== '' &&
                          (e.id === a.id ||
                            getEnchantmentInfo(e.id, edition).exclusiveEnchantments.includes(a.id)),
                      ),
                    }))
                  "
                  :selected="e.id"
                  @update:selected="(selected: string) => (e.id = selected)"
                >
                  <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
                    <div class="flex justify-between overflow-hidden">
                      {{ menuItem.label }}
                    </div>
                  </template>
                </CdxSelect>
                <CdxTextInput
                  style="min-width: 80px; width: 80px"
                  input-type="number"
                  v-model="e.level"
                  min="1"
                  :max="getEnchantmentInfo(e.id, edition)?.maxLevel"
                  @blur="
                    e.level = Math.max(
                      1,
                      Math.min(e.level, getEnchantmentInfo(e.id, edition)?.maxLevel || 1),
                    )
                  "
                />
                <CdxButton
                  weight="quiet"
                  class="min-h-0"
                  size="small"
                  aria-label="add"
                  @click="item.enchantments.push(newEnchantment())"
                >
                  <CdxIcon :icon="cdxIconAdd" />
                </CdxButton>
                <CdxButton
                  weight="quiet"
                  action="destructive"
                  :disabled="
                    item.enchantments.length === (item.type === BOOK ? 1 : 0) ||
                    inputItems.reduce((sum, i) => sum + i.enchantments.length, 0) < 2
                  "
                  class="min-h-0"
                  size="small"
                  aria-label="delete"
                  @click="item.enchantments.splice(item.enchantments.indexOf(e), 1)"
                >
                  <CdxIcon :icon="cdxIconTrash" />
                </CdxButton>
              </div>
              <div class="flex flex-row flex-wrap flex-1 grow min-w-full items-baseline gap-2">
                <CdxTextInput
                  :model-value="String(Math.log2(item.repairCost + 1))"
                  class="flex-1 grow"
                  input-type="number"
                  placeholder="0"
                  min="0"
                  max="5"
                  step="1"
                  @update:model-value="
                    (value: number) => {
                      const n = Math.min(999, Math.max(0, Number(value)))
                      item.repairCost = 2 ** n - 1
                    }
                  "
                  @blur="
                    () => {
                      const n = Math.min(5, Math.max(0, Math.round(Math.log2(item.repairCost + 1))))
                      item.repairCost = 2 ** n - 1
                    }
                  "
                />
                <span class="repairCost">
                  → {{ t('anvilHelper.result.repairCost.format', { lvl: item.repairCost }) }}
                </span>
              </div>
            </div>
          </template>
          <template #item-actions="{ row }">
            <CdxButton
              weight="quiet"
              class="min-h-0"
              size="small"
              aria-label="add"
              @click="
                inputItems.indexOf(row.item) === inputItems.length - 1
                  ? inputItems.push(newItem(BOOK))
                  : inputItems.splice(inputItems.indexOf(row.item) + 1, 0, newItem(BOOK))
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
      </div>
      <div
        class="flex-3 flex flex-col flex-wrap justify-start items-center gap-5 pt-10"
        v-if="mergePlan === null || mergePlan.steps.length === 0"
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
            :selected="currentItemPreset"
            @update:selected="(select: string) => applyPreset(select)"
          >
            <template #label="{ selectedMenuItem }: { selectedMenuItem: MenuItemData }">
              <div v-if="selectedMenuItem" class="flex items-center gap-2">
                <img
                  :src="
                    getImageLink(`zh:${itemIcon[selectedMenuItem.value as keyof typeof itemIcon]}`)
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
                :src="getImageLink(`zh:${itemIcon[menuItem.value as keyof typeof itemIcon]}`)"
                width="24px"
                style="display: inline"
                @error="handleEnchantedImgError($event, menuItem.value as string)"
              />
              {{ menuItem.label }}
            </template>
          </CdxSelect>
        </div>
        <div class="flex min-w-8/12 justify-center">
          <CdxButton class="items-center" :disabled="!canStartCalculate" @click="updateMergePlan()">
            {{ t('anvilHelper.startCalculate') }}
          </CdxButton>
        </div>
        <div
          class="flex min-w-8/12 items-center justify-center error gap-2"
          v-if="mergePlan !== null && mergePlan.steps.length === 0"
        >
          <CdxIcon :icon="cdxIconError" class="error" />
          {{ t('anvilHelper.failed') }}
        </div>
      </div>
      <div class="flex-3 shrink max-w-500" v-if="mergePlan !== null && mergePlan.steps.length > 0">
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
            <div class="flex flex-row gap-2">
              <div class="flex items-center justify-center">
                <span class="font-black text-lg" style="margin-right: 0.5em">
                  {{ t('anvilHelper.selectPreset') }}
                </span>
                <CdxSelect
                  class="long-handle shrink-0 flex-1"
                  :defaultLabel="t('anvilHelper.selectPreset.defaultLabel')"
                  :menu-items="presetMenuItems"
                  :selected="currentItemPreset"
                  @update:selected="(select: string) => applyPreset(select)"
                >
                  <template #label="{ selectedMenuItem }: { selectedMenuItem: MenuItemData }">
                    <div v-if="selectedMenuItem" class="flex items-center gap-2">
                      <img
                        :src="
                          getImageLink(
                            `zh:${itemIcon[selectedMenuItem.value as keyof typeof itemIcon]}`,
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
                      :src="getImageLink(`zh:${itemIcon[menuItem.value as keyof typeof itemIcon]}`)"
                      width="24px"
                      style="display: inline"
                      @error="handleEnchantedImgError($event, menuItem.value as string)"
                    />
                    {{ menuItem.label }}
                  </template>
                </CdxSelect>
              </div>
              <div class="flex justify-center gap-2">
                <CdxButton action="destructive" class="items-center" @click="restoreLastInput">
                  {{ t('anvilHelper.restoreLastInput') }}
                </CdxButton>

                <CdxButton
                  class="items-center"
                  :disabled="!canStartCalculate"
                  @click="updateMergePlan()"
                >
                  {{ t('anvilHelper.startCalculate') }}
                </CdxButton>
              </div>
            </div>
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
                <img class="inline h-4" :src="getImageLink(getXpOrbImageUrl(lvl2xp(item)))" />
              </div>
            </div>
          </template>
          <template #tfoot>
            <tfoot>
              <tr>
                <th scope="row" class="cdx-table__table__cell--align-number">
                  {{ t('anvilHelper.result.total') }}
                </th>
                <td></td>
                <td></td>
                <td></td>
                <td>
                  {{ mergePlan.totalCost }}
                  {{ t('anvilHelper.level') }}
                </td>
              </tr>
            </tfoot>
          </template>
        </CdxTable>
        <div
          class="flex flex-1 min-w-8/12 item-center justify-center gap-2 ps-30 pt-2 pe-30 text-nowrap"
        >
          <span v-html="parseWikitext(t('anvilHelper.result.minXp'))" />
          <span
            v-if="mergePlan.steps.length > 1"
            class="explain"
            :title="t('anvilHelper.result.minXp.desc')"
          >
            {{ mergePlanXp.minXp }}
            <img
              class="inline-block h-4"
              :src="getImageLink(getXpOrbImageUrl(mergePlanXp.minXp))"
            />
          </span>
          <span v-if="mergePlan.steps.length > 1"> ~</span>
          <span>
            {{ mergePlanXp.minLvlXp }}
            <img
              class="inline-block h-4"
              :src="getImageLink(getXpOrbImageUrl(mergePlanXp.minLvlXp))"
            />
          </span>
        </div>
        <div
          v-if="mergePlan.steps.length > 1"
          class="flex flex-1 min-w-8/12 align-middle item-center justify-center gap-2 ps-30 pt-2 pe-30"
        ></div>
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
  min-width: 175px;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  height: 36px;

  .long-handle & {
    min-width: 230px;
  }
}
.error {
  font-size: larger;
  color: var(--color-error, #bf3c2c);
}
</style>
