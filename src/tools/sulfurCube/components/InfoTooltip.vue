<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconInfo } from '@wikimedia/codex-icons'

withDefaults(
  defineProps<{
    text: string
    label?: string
    placement?: 'top' | 'bottom' | 'left' | 'right'
  }>(),
  {
    label: undefined,
    placement: 'top',
  },
)
</script>

<template>
  <CdxButton
    v-tooltip:[placement]="text"
    class="info-tooltip"
    size="small"
    weight="quiet"
    :aria-label="label ?? text"
    :draggable="false"
    @mousedown.stop.prevent
    @pointerdown.stop.prevent
    @click.stop.prevent
    @dragstart.stop.prevent
  >
    <CdxIcon :icon="cdxIconInfo" size="x-small" />
  </CdxButton>
</template>

<style scoped>
.info-tooltip {
  min-width: 1.5rem;
  min-height: 1.5rem;
  padding: 0.125rem;
  vertical-align: middle;
  cursor: default;
  user-select: none;
}

.info-tooltip *,
.info-tooltip:hover *,
.info-tooltip:active * {
  cursor: default;
}

.info-tooltip:hover,
.info-tooltip:active {
  border-color: transparent;
  background: transparent;
}

:global(.cdx-tooltip),
:global(.cdx-tooltip *) {
  cursor: default;
}

:global(.cdx-tooltip) {
  pointer-events: auto;
  -webkit-user-drag: none;
  box-sizing: border-box;
  width: max-content;
  max-width: min(32rem, calc(100vw - 2rem));
  border: 2px solid #202122;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  background: #fff;
  color: #202122;
  box-shadow: 0 2px 8px rgb(0 0 0 / 18%);
  line-height: 1.4;
  text-align: justify;
  user-select: text;
  white-space: normal;
}

:global(.cdx-tooltip *) {
  -webkit-user-drag: none;
  user-select: text;
}

:global(.dark .cdx-tooltip) {
  border-color: #fff;
  background: #202122;
  color: #fff;
}

@media (max-width: 32rem) {
  :global(.cdx-tooltip) {
    right: 1rem !important;
    left: 1rem !important;
    width: auto;
    max-width: none;
  }
}
</style>
