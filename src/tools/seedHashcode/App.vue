<script setup lang="ts">
import { ref } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const { t } = useI18n(__TOOL_NAME__, locales)

const seed = ref('Minecraft Wiki')

// Java String.hashCode() implementation
function hashCode(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}
</script>
<template>
  <CalcField>
    <template #heading>{{ t('seedHashcode.title') }}</template>
    <CdxTextInput v-model="seed" />
    {{ t('seedHashcode.actual') }} <code v-if="seed !== ''">{{ hashCode(seed) }}</code
    ><template v-else>{{ t('seedHashcode.emptyString') }}</template>
  </CalcField>
</template>
