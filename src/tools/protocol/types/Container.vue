<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'container' || !Array.isArray(props.data[1])
const content = ((props.data as any[])[1] || []) as any[]
</script>
<template>
  <div v-if="errorState" :style="{ color: 'red' }">{{ t('protocol.error.data') }}</div>
  <table v-else>
    <tr v-for="item in content" :key="item.name">
      <td>{{ item.name }}</td>
      <TypeChoice :data="item.type" :version="props.version" />
    </tr>
  </table>
</template>
