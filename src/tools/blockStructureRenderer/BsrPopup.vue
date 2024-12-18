<script setup lang="ts">
import { flip, offset, shift, useFloating } from '@floating-ui/vue'
import { onClickOutside } from '@vueuse/core'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  icon: string
  name: string
}>()

const { t } = useI18n()

const button = ref()
const popup = ref()
const popupOpen = ref(false)

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
  <CdxButton
    ref="button"
    v-tooltip="props.name"
    :aria-label="props.name"
    @click="popupOpen = !popupOpen"
  >
    <CdxIcon :icon="props.icon" :icon-label="props.name" />
  </CdxButton>
  <div
    v-if="popupOpen"
    ref="popup"
    style="
      background-color: var(--background-color-base, #fff);
      border: 1px solid var(--border-color-base, #a2a9b1);
      border-radius: 4px;
      padding: 12px;
    "
    :style="{ ...popupStyles, display: popupOpen ? 'block' : 'none' }"
  >
    <div
      style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      "
    >
      <h3 style="margin: 0">
        {{ props.name }}
      </h3>
      <CdxButton weight="quiet" @click="popupOpen = false">
        <CdxIcon :icon="cdxIconClose" :icon-label="t('blockStructureRenderer.closePopup')" />
      </CdxButton>
    </div>
    <slot />
  </div>
</template>
