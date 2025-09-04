<script setup lang="ts">
import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import { ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  icon: string
  type: 'warning' | 'error'
}>()

const { t } = useI18n()

const button = useTemplateRef('button')
const popupOpen = ref(false)
</script>

<template>
  <CdxButton
    ref="button"
    weight="quiet"
    :aria-label="t(`banner.${props.type}`)"
    @click="popupOpen = !popupOpen"
  >
    <CdxIcon size="small" :icon="props.icon" :class="`${props.type}-icon`" />
  </CdxButton>
  <CdxPopover v-model:open="popupOpen" :anchor="button" placement="top-start">
    <slot />
  </CdxPopover>
</template>

<style lang="less">
@import (reference) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.cdx-icon.warning-icon {
  color: @color-warning;
}

.cdx-icon.error-icon {
  color: @color-error;
}
</style>
