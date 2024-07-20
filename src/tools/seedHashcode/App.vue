<script setup lang="ts">
import { ref } from 'vue'
import { CdxMessage, CdxTextInput } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { useI18n } from 'vue-i18n'
import { hashCode } from '@/utils/seed'

const { t } = useI18n()

const seed = ref('Minecraft Wiki')
</script>

<template>
  <CalcField>
    <template #heading>{{ t('seedHashcode.title') }}</template>
    <div class="flex flex-col gap-2">
      <CdxTextInput v-model="seed" />

      <div>
        {{ t('seedHashcode.actual') }}
        <template v-if="seed === ''">{{ t('seedHashcode.emptyString') }}</template>
        <template v-else-if="seed === '0'">{{ t('seedHashcode.zero') }}</template>
        <code v-else>{{ hashCode(seed) }}</code>
      </div>

      <CdxMessage v-if="/^[0-9]*$/.test(seed)" type="warning">
        {{ t('seedHashcode.number') }}
      </CdxMessage>
    </div>
  </CalcField>
</template>
