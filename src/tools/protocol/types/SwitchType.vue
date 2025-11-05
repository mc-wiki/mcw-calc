<script setup lang="ts">
import { ref } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { isVoidProtocol } from '../constants.ts'
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
const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <I18nT v-else keypath="protocol.type.switch" tag="span" class="flex-1 italic">
      <template #link>
        <span
          class="underline"
          @mouseover="state.selectName(content.compareTo)"
          @mouseout="state.unselectName(content.compareTo)"
        >
          {{ content.compareTo }}
        </span>
      </template>
    </I18nT>
    <span v-if="!errorState" class="ml-2 cursor-pointer" @click="showSubType = !showSubType">
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <table v-if="showSubType" class="switch-table w-full">
    <tr v-for="item in fields" :key="item[0]">
      <td class="non-complex">{{ item[0] }}</td>
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
