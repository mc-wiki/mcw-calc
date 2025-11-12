<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { isActionKey } from '../constants.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'either' || props.data.length !== 3
const trueContent = (props.data as any[])[1] as string | object
const falseContent = (props.data as any[])[2] as string | object

const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1">{{ t('protocol.type.either') }}</span>
    <span
      v-if="!errorState"
      class="action-text"
      tabindex="0"
      @click="showSubType = !showSubType"
      @keyup="(e: KeyboardEvent) => isActionKey(e) && (showSubType = !showSubType)"
    >
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <table v-if="showSubType" class="either-table w-full">
    <tr>
      <td class="non-complex">{{ t('protocol.type.either.true') }}</td>
      <TypeChoice :data="trueContent" :version="version" />
    </tr>
    <tr>
      <td class="non-complex">{{ t('protocol.type.either.false') }}</td>
      <TypeChoice :data="falseContent" :version="version" />
    </tr>
  </table>
</template>
<style>
.either-table > tr > td:first-child {
  border-left: none;
}
.either-table > tr > td:last-child {
  border-right: none;
}
.either-table > tr:last-child > td {
  border-bottom: none;
}
</style>
