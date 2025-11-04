<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getAsPrimitiveProtocol } from '../constants.ts'

const props = defineProps<{ data: object | string; version: number }>()
const { t } = useI18n()

const primitive = getAsPrimitiveProtocol(props.data)
</script>
<template>
  <td v-if="!!primitive">{{ t(`protocol.type.${primitive}`) }}</td>
  <td v-else :style="{ color: 'red', fontStyle: 'italic' }">
    {{ t(`protocol.type.unsupported`) }}
  </td>
</template>
