<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAsPrimitiveProtocol } from '../constants.ts'
import TypeChoice from './TypeChoice.vue'

interface ArrayTypeDefinition {
  countType?: string
  count?: number
  type: object | string
}

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'array' || props.data.length !== 2
const content = (props.data as any[])[1] as ArrayTypeDefinition
const primitive = getAsPrimitiveProtocol(content.type)
const countType = content.countType
  ? t('protocol.type.array.count_type', { type: t(`protocol.type.${content.countType}`) })
  : t('protocol.type.array.count_fixed', { count: content.count || '<INVALID>' })
const desc = primitive
  ? t('protocol.type.array.primitive', { count: countType, type: t(`protocol.type.${primitive}`) })
  : t('protocol.type.array.complex', { count: countType })

const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1">{{ desc }}</span>
    <span v-if="!primitive && !errorState" class="flex-none min-w-2" />
    <span v-if="!primitive && !errorState" @click="showSubType = !showSubType">
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <TypeChoice
    v-if="showSubType"
    :data="content.type"
    :version="version"
    type="div"
    class="array-sub-type"
  />
</template>
<style>
div.array-sub-type.non-complex {
  padding: 0 0.4em 0.2em;
}
div.array-sub-type .container-table tr:first-child > td {
  border-top: 1px solid var(--border-color-base, #a2a9b1);
}
</style>
