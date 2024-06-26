<script setup lang="ts">
import { defineProps, ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'
import { flip, offset, shift, useFloating } from '@floating-ui/vue'
import { onClickOutside, useElementHover } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  icon: string
  name: string
}>()

const button = ref()
const tooltip = ref()
const tooltipOpen = useElementHover(button)
const popup = ref()
const popupOpen = ref(false)

const { floatingStyles: tooltipStyles } = useFloating(button, tooltip, {
  open: tooltipOpen,
  placement: 'top',
  middleware: [offset(5), flip(), shift()],
})

const { floatingStyles: popupStyles } = useFloating(button, popup, {
  open: popupOpen,
  placement: 'top',
  middleware: [offset(5), flip(), shift()],
})
onClickOutside(popup, () => {
  popupOpen.value = false
})
</script>

<template>
  <cdx-button ref="button" @click="popupOpen = !popupOpen">
    <cdx-icon :icon="props.icon" :icon-label="props.name" />
  </cdx-button>
  <div
    v-if="tooltipOpen"
    class="dark"
    style="
      background-color: var(--background-color-base, #fff);
      border: 1px solid var(--border-color-base, #a2a9b1);
      border-radius: 4px;
      padding: 6px;
    "
    ref="tooltip"
    :style="{ ...tooltipStyles, display: tooltipOpen ? 'block' : 'none' }"
  >
    {{ props.name }}
  </div>
  <div
    v-if="popupOpen"
    style="
      background-color: var(--background-color-base, #fff);
      border: 1px solid var(--border-color-base, #a2a9b1);
      border-radius: 4px;
      padding: 12px;
    "
    ref="popup"
    :style="{ ...popupStyles, display: popupOpen ? 'block' : 'none' }"
  >
    <div style="display: flex; justify-content: space-between; align-items: center">
      <h3 style="margin-top: 0; margin-bottom: 12px">{{ props.name }}</h3>
      <cdx-button weight="quiet" @click="popupOpen = false">
        <cdx-icon :icon="cdxIconClose" :icon-label="t('blockStructureRenderer.closePopup')" />
      </cdx-button>
    </div>
    <slot />
  </div>
</template>
