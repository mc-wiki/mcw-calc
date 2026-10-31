<script setup lang="ts">
import { computed } from 'vue'

import CalcField from '@/components/CalcField.vue'

const props = defineProps<AppEmbedProps>()

interface AppEmbedProps {
  name: string
  title: string
  width: number
  height: number
  style: string
}

const iframeUrl = computed(() => `https://www.desmos.com/calculator/${props.name}?embed`)
</script>

<template>
  <CalcField
    :style="{
      width: 'max-content',
    }"
  >
    <template v-if="props.title" #heading>
      {{ props.title }}
    </template>

    <iframe
      loading="lazy"
      :src="iframeUrl"
      :width="props.width"
      :height="props.height"
      :style="props.style"
    />
  </CalcField>
</template>
