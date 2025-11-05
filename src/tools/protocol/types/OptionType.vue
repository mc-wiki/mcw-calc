<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAsPrimitiveProtocol } from '../constants.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'option' || props.data.length !== 2
const content = (props.data as any[])[1] as string | object
const primitive = getAsPrimitiveProtocol(content)
const desc = primitive
  ? t('protocol.type.option.primitive', { type: t(`protocol.type.${primitive}`) })
  : t('protocol.type.option.complex')

const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1">{{ desc }}</span>
    <span
      v-if="!primitive && !errorState"
      class="ml-2 cursor-pointer"
      @click="showSubType = !showSubType"
    >
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <TypeChoice v-if="showSubType" :data="content" :version="version" type="div" class="sub-type" />
</template>
