<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const { t } = useI18n(__TOOL_NAME__, locales)
const count = ref(0)
const increment = () => count.value++
</script>
<template>
  <CalcField>
    {{ t('exampleCounter.count') }}{{ count }}
    <CdxButton @click="increment">{{ t('exampleCounter.increment') }}</CdxButton>
  </CalcField>
</template>
