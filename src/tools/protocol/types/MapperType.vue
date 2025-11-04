<script setup lang="ts">
import type { GetOrCache, IndexerType } from '../constants.ts'
import { asyncComputed } from '@vueuse/core'
import { inject, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAsPrimitiveProtocol, indexed } from '../constants.ts'

interface MapperTypeDefinition {
  type?: string | object
  var?: string
  mappings?: Record<string, string>
  source?: string
}

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const getOrCache = inject('get-or-cache') as GetOrCache
const getIndexFor = inject('get-index-for') as IndexerType

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'mapper' || props.data.length !== 2
const content = (props.data as any[])[1] as MapperTypeDefinition
const primitive = getAsPrimitiveProtocol(content.type ?? '')
const desc = primitive
  ? t('protocol.type.mapper.primitive', { type: t(`protocol.type.${primitive}`) })
  : t('protocol.type.mapper.complex')

const showSubType = ref(false)
const loadingState = ref(true)
const mapping = asyncComputed(
  async () => {
    if (!showSubType.value) return Promise.resolve([]) // lazy
    if (content.mappings) return Promise.resolve(Object.entries(content.mappings))
    return await getOrCache(props.version, content.source || '<unknown>', async () => {
      const index = getIndexFor(props.version, content.source || '<unknown>')
      return (
        Object.entries(
          await (await fetch(indexed(index, `mappings/${content.source}.json`))).json(),
        ) || []
      )
    })
  },
  [],
  loadingState,
)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1">{{ desc }}</span>
    <span v-if="!errorState" class="flex-none min-w-2" />
    <span v-if="!errorState" @click="showSubType = !showSubType">
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <div v-if="loadingState && showSubType" class="px-[0.4em]">{{ t('protocol.loading') }}</div>
  <table v-else-if="showSubType" class="mapper-table w-full">
    <tr v-for="item in mapping" :key="item[0]">
      <td class="non-complex">{{ item[0] }}</td>
      <td class="non-complex">{{ item[1] }}</td>
    </tr>
  </table>
</template>
<style>
.mapper-table > tr > td:first-child {
  border-left: none;
}
.mapper-table > tr > td:last-child {
  border-right: none;
}
.mapper-table > tr:last-child > td {
  border-bottom: none;
}
</style>
