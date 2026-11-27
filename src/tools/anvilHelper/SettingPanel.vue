<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { CdxAccordion, CdxButton, CdxCheckbox, CdxField, CdxRadio } from '@wikimedia/codex'
import { computed, ref, watch } from 'vue'
import type { Settings } from './worker'

const { t } = useI18n()

const props = defineProps<{ settings: Settings }>()
const emit = defineEmits<{ 'update:settings': [settings: Settings] }>()

const draftSettings = ref<Settings>(JSON.parse(JSON.stringify(props.settings)))

watch(
  () => props.settings,
  (settings) => {
    draftSettings.value = JSON.parse(JSON.stringify(settings))
  },
  { deep: true },
)

const hasDraftChanges = computed(
  () =>
    draftSettings.value.edition !== props.settings.edition ||
    draftSettings.value.mode !== props.settings.mode ||
    draftSettings.value.allowExclusive !== props.settings.allowExclusive ||
    draftSettings.value.allowExceedProcessLimit !== props.settings.allowExceedProcessLimit,
)

function applySettings() {
  emit('update:settings', JSON.parse(JSON.stringify(draftSettings.value)))
}
</script>
<template>
  <CdxAccordion heading-level="h3">
    <template #title> {{ t('anvilHelper.settings.title') }} </template>
    <div class="flex flex-col justify-around items-start gap-3 pl-15 pr-15">
      <CdxField :is-fieldset="true" class="flex flex-1 justify-start items-center gap-2">
        <template #label>
          <span class="text-lg">{{ t('anvilHelper.settings.gameEdition') }}</span>
        </template>
        <CdxRadio
          v-model="draftSettings.edition"
          name="edition"
          :inline="true"
          :input-value="'java'"
        >
          {{ t('anvilHelper.java') }}
        </CdxRadio>
        <CdxRadio
          v-model="draftSettings.edition"
          name="edition"
          :inline="true"
          :input-value="'bedrock'"
        >
          {{ t('anvilHelper.bedrock') }}
        </CdxRadio>
      </CdxField>
      <CdxField :is-fieldset="true" class="flex flex-col justify-start gap-2">
        <template #label>
          <span class="text-lg">{{ t('anvilHelper.settings.optimizationGoal') }}</span>
        </template>
        <CdxRadio v-model="draftSettings.mode" name="mode" :input-value="'leastXp'">
          {{ t('anvilHelper.leastXp') }}
        </CdxRadio>
        <CdxRadio v-model="draftSettings.mode" name="mode" :input-value="'leastLvl'">
          {{ t('anvilHelper.leastLvl') }}
        </CdxRadio>
        <CdxRadio v-model="draftSettings.mode" name="mode" :input-value="'leastRepairCost'">
          {{ t('anvilHelper.leastRepairCost') }}
        </CdxRadio>
      </CdxField>
      <CdxField :is-fieldset="true" class="flex flex-1 justify-start items-center gap-2">
        <template #label>
          <span class="text-lg">{{ t('anvilHelper.settings.others') }}</span>
        </template>
        <CdxCheckbox
          v-model="draftSettings.allowExclusive"
          name="allowExclusive             "
          :input-value="false"
        >
          {{ t('anvilHelper.settings.allowExclusive') }}
        </CdxCheckbox>
        <CdxCheckbox
          v-model="draftSettings.allowExceedProcessLimit"
          name="allowExceedProcessLimit"
          :input-value="false"
        >
          {{ t('anvilHelper.settings.allowExceedProcessLimit') }}
        </CdxCheckbox>
      </CdxField>
      <div v-if="hasDraftChanges" class="flex flex-wrap items-center gap-x-5 gap-y-2 warning">
        {{ t('anvilHelper.settings.applyWarning') }}
        <CdxButton action="destructive" @click="applySettings()" class="min-h-0">
          {{ t('anvilHelper.settings.apply') }}
        </CdxButton>
      </div>
    </div>
  </CdxAccordion>
</template>
<style lang="less">
@import (reference) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';
.cdx-accordion .cdx-accordion__header {
  font-size: 1.2em;
}
.warning {
  color: var(--color-error, #bf3c2c);
}
</style>
