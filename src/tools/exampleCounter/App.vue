<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton } from '@wikimedia/codex'
import Field from '@/components/Field.vue'
import { useI18n } from '@/utils/i18n.ts'
import locales from './locales.ts'

const { t } = useI18n(__TOOL_NAME__, locales)
const count = ref(0)
const increment = () => count.value++
</script>
<template>
  <Field>
    {{ t('exampleCounter.count') }}{{ count }}
    <CdxButton @click="increment">{{ t('exampleCounter.increment') }}</CdxButton>
  </Field>
</template>
