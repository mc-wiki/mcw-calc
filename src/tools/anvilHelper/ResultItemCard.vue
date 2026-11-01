<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { Enchantment } from '@/utils/enchantment'
import { getImageLink } from '@/utils/image'
import { enchantedItemIcon, itemIcon } from './data/image'
import type { Item } from './worker'

const { t } = useI18n()

var BOOK = 'enchanted_book'

const props = defineProps<{ item: Item; idx?: number; inputItemsLength?: number }>()

function handleEnchantedImgError(event: Event, itemType: string) {
  const imgEl = event.currentTarget as HTMLImageElement
  if (!imgEl.src.endsWith('.svg')) {
    imgEl.src = getImageLink(`zh:${itemIcon[itemType as keyof typeof itemIcon]}`)
  } else {
    imgEl.src = getImageLink('No image.svg')
    imgEl.onerror = null
  }
}
</script>
<template>
  <div class="flex flex-row items-start flex-wrap gap-2">
    <img
      :src="
        item.enchantments !== null &&
        item.enchantments.length > 0 &&
        item.enchantments.flatMap((e: Enchantment) => e.id).join() !== ''
          ? getImageLink(`zh:${enchantedItemIcon[item.type as keyof typeof enchantedItemIcon]}`)
          : getImageLink(`zh:${itemIcon[item.type as keyof typeof itemIcon]}`)
      "
      width="24px"
      style="display: inline; object-fit: scale-down"
      @error="handleEnchantedImgError($event, item.type)"
    />
    <div class="flex flex-col text-nowrap">
      <div v-if="idx !== undefined">
        <span
          class="font-bold"
          :class="inputItemsLength && idx < inputItemsLength ? 'underline decoration-2' : ''"
        >
          {{ t(`global.item.${item.type}`) }}
        </span>
        <span
          class="font-bold"
          :class="inputItemsLength && idx < inputItemsLength ? '' : 'text-gray-400'"
        >
          #{{ idx + 1 }}
        </span>
      </div>

      <div v-if="item.enchantments.length > 0">
        <div v-for="e in item.enchantments">
          {{
            t('enchantment.format', {
              id: t(`global.enchantment.${e.id}`),
              level: t(`global.level.${e.level}`),
            })
          }}
        </div>
      </div>
      <div v-if="item.repairCost > 0" class="repairCost">
        {{ t('anvilHelper.result.repairCost.format', { lvl: item.repairCost }) }}
      </div>
    </div>
  </div>
</template>
<style lang="less">
@import (reference) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';
.repairCost {
  color: var(--color-error, #bf3c2c);
}
.cdx-select-vue__handle {
  min-width: 175px;
  display: flex;
  align-items: center;
  height: 36px;

  .long-handle & {
    min-width: 230px;
  }
}
</style>
