<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { shouldSkip } from '../constants.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'container' || !Array.isArray(props.data[1])
const content = ((props.data as any[])[1] || []) as any[]
</script>
<template>
  <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
  <table v-else class="container-table w-full">
    <tr
      v-for="item in content
        .filter((c) => c.name !== '<unnamed>')
        .filter((c) => !shouldSkip(c.type))"
      :key="item.name"
    >
      <td class="non-complex">{{ item.name }}</td>
      <TypeChoice :data="item.type" :version="props.version" />
    </tr>
  </table>
</template>
<style>
.container-table td:first-child {
  border-left: none;
}
.container-table td:last-child {
  border-right: none;
}
.container-table > tr:first-child > td {
  border-top: none;
}
.container-table > tr:last-child > td {
  border-bottom: none;
}
</style>
