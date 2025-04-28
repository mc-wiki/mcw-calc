<script setup lang="ts">
import type { Icon } from '@wikimedia/codex-icons'
import { onClickOutside } from '@vueuse/core'
import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import { ref } from 'vue'

const props = defineProps<{
  icon: Icon
  name: string
}>()

const button = ref()
const popup = ref()
const popupOpen = ref(false)

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
  <CdxPopover
    v-model:open="popupOpen"
    :title="props.name"
    placement="top"
    :anchor="button"
    :use-close-button="true"
  >
    <slot />
  </CdxPopover>
</template>
