<script setup lang="ts">
import { ref } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from 'vue-i18n'
import { hashCode } from '@/utils/seed'

const { t } = useI18n()

const seed = ref('Minecraft Wiki')
</script>

<template>
  <CalcField>
    <template #heading>{{ t('seedHashcode.title') }}</template>
    <CdxTextInput v-model="seed" />
    {{ t('seedHashcode.actual') }} <code v-if="seed !== ''">{{ hashCode(seed) }}</code
    ><template v-else>{{ t('seedHashcode.emptyString') }}</template>
  </CalcField>
</template>
