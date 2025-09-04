<script setup lang="ts">
import { CdxButton } from '@wikimedia/codex'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'

const { t } = useI18n()
const count = ref(0)
const increment = () => count.value++
</script>

<template>
  <CalcField>
    {{ t('exampleCounter.count') }}{{ count }}
    <CdxButton @click="increment">
      {{ t('exampleCounter.increment') }}
    </CdxButton>
  </CalcField>
</template>
