<script setup lang="ts">
import type { GetOrCache, IndexerType } from '../constants.ts'
import { asyncComputed } from '@vueuse/core'
import { inject, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { indexed, isActionKey, isVoidProtocol } from '../constants.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const cacheGet = inject('cache-get') as GetOrCache
const getPacketFor = inject('get-packet-for') as IndexerType

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'reference' || props.data.length !== 2
const content = (props.data as any[])[1] as string
const desc = t('protocol.type.reference', { type: content })

const fatherScope = inject('scope')
const random = Math.random().toString(36).substring(2, 8)
provide('recursive-root', content)
provide('scope', `${fatherScope}/${random}`)

const showSubType = ref(false)
const loadingState = ref(true)
const data = asyncComputed<string | object>(
  async () => {
    if (!showSubType.value) return Promise.resolve([]) // lazy
    return await cacheGet(props.version, `structure.${content}`, async () => {
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
  <div v-if="loadingState && showSubType" class="px-[0.4em] py-[0.2em]">
    {{ t('protocol.loading') }}
  </div>
  <div v-else-if="showSubType && isVoidProtocol(data)">{{ t('protocol.type.void') }}</div>
  <TypeChoice v-else-if="showSubType" :version="version" :data="data" type="div" class="sub-type" />
</template>
