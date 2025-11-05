<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) ||
  props.data[0] !== 'top_bit_set_terminated_array' ||
  props.data.length !== 2
const content = (props.data as any[])[1]

const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1">{{ t('protocol.type.top_bit_set_terminated_array') }}</span>
    <span v-if="!errorState" class="ml-2 cursor-pointer" @click="showSubType = !showSubType">
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <TypeChoice v-if="showSubType" :data="content" :version="version" type="div" class="sub-type" />
</template>
