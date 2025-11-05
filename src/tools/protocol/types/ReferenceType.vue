<script setup lang="ts">
import type { GetOrCache, IndexerType } from '../constants.ts'
import { asyncComputed } from '@vueuse/core'
import { inject, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { indexed, isVoidProtocol } from '../constants.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const getOrCache = inject('get-or-cache') as GetOrCache
const getPacketFor = inject('get-packet-for') as IndexerType

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'reference' || props.data.length !== 2
const content = (props.data as any[])[1] as string
const desc = t('protocol.type.reference', { type: content })
provide('recursive-root', content)

const showSubType = ref(false)
const loadingState = ref(true)
const data = asyncComputed<string | object>(
  async () => {
    if (!showSubType.value) return Promise.resolve([]) // lazy
    return await getOrCache(props.version, content, async () => {
      const index = getPacketFor(props.version, content)
      return (await (await fetch(indexed(index, `structures/${content}.json`))).json()) || 'void'
    })
  },
  'void',
  loadingState,
)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1 italic">{{ desc }}</span>
    <span v-if="!errorState" class="flex-none min-w-2" />
    <span v-if="!errorState" @click="showSubType = !showSubType">
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <div v-if="loadingState && showSubType" class="px-[0.4em] py-[0.2em]">
    {{ t('protocol.loading') }}
  </div>
  <div v-else-if="showSubType && isVoidProtocol(data)">{{ t('protocol.type.void') }}</div>
  <TypeChoice v-else-if="showSubType" :version="version" :data="data" type="div" class="sub-type" />
</template>
