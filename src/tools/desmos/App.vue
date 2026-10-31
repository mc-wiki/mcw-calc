<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import CalcField from '@/components/CalcField.vue'

const props = defineProps<AppEmbedProps>()

const { t } = useI18n()

interface AppEmbedProps {
  name: string
  title: string
  width: number
  height: number
  style: string
  frameborder: number
}

const isValidName = computed(() => /^[a-z0-9]{10}$/.test(props.name)) //Only 10-character combinations of lowercase letters or digits are accepted. If the settings in Desmos are changed, please modify this line.

const iframeUrl = computed(() => `https://www.desmos.com/calculator/${props.name}?embed`)
</script>

<template>
  <CalcField>
    <template v-if="props.title" #heading>
      {{ props.title }}
    </template>

    <iframe
      v-if="isValidName"
      loading="lazy"
      :src="iframeUrl"
      :width="props.width"
      :height="props.height"
      :style="props.style"
      :frameborder="props.frameborder"
    />
    <strong v-else-if="!props.name" class="error" v-html="t('desmos.nameRequired')" />
    <strong v-else class="error" v-html="t('desmos.nameInvalid')" />
  </CalcField>
</template>
