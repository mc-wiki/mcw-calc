<script setup lang="ts">
import { inject, ref } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { isActionKey, isVoidProtocol } from '../constants.ts'
import { useGlobalState } from '../state.ts'
import TypeChoice from './TypeChoice.vue'

interface SwitchTypeDefinition {
  compareTo: string
  fields: Record<string, string | object>
  default?: string | object
}

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'switch' || props.data.length !== 2
const content = (props.data as any[])[1] as SwitchTypeDefinition

const fields = Object.entries(content.fields)
if (content.default) fields.push([t('protocol.type.switch.default'), content.default])

const state = useGlobalState()
const scope = inject('scope') as string
const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <I18nT v-else keypath="protocol.type.switch" tag="span" class="flex-1 italic">
      <template #link>
        <span
          class="var-link"
          translate="no"
          @mouseover="state.selectName(content.compareTo, scope)"
          @mouseout="state.unselectName(content.compareTo, scope)"
        >
          {{ content.compareTo }}
        </span>
      </template>
    </I18nT>
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
  <table v-if="showSubType" class="switch-table w-full">
    <tr v-for="item in fields" :key="item[0]">
      <td class="non-complex" translate="no">{{ item[0] }}</td>
      <td v-if="isVoidProtocol(item[1])" class="italic non-complex">
        {{ t('protocol.type.switch.void') }}
      </td>
      <TypeChoice v-else :data="item[1]" :version="props.version" />
    </tr>
  </table>
</template>
<style>
.switch-table > tr > td:first-child {
  border-left: none;
}
.switch-table > tr > td:last-child {
  border-right: none;
}
.switch-table > tr:last-child > td {
  border-bottom: none;
}
</style>
