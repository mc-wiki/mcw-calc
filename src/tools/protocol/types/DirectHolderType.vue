<script setup lang="ts">
import type { GetOrCache, IndexerType } from '../constants.ts'
import { asyncComputed } from '@vueuse/core'
import { CdxButton, CdxTextInput } from '@wikimedia/codex'
import { computed, inject, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAsPrimitiveProtocol, indexed, isActionKey } from '../constants.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const cacheGet = inject('cache-get') as GetOrCache
const getIndexFor = inject('get-index-for') as IndexerType

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'direct_holder' || props.data.length !== 3
const registry = (props.data as any[])[1] as string
const content = (props.data as any[])[2] as string | object
const primitive = getAsPrimitiveProtocol(content)
const desc = primitive
  ? t('protocol.type.direct_holder.primitive', { registry, type: t(`protocol.type.${primitive}`) })
  : t('protocol.type.direct_holder.complex', { registry })

const showSubType = ref(false)
const loadingState = ref(true)
const data = asyncComputed<string[]>(
  async () => {
    if (!showSubType.value) return Promise.resolve([]) // lazy
    const index = getIndexFor(props.version, registry)
    if (index === -1) return Promise.resolve([])
    return await cacheGet(props.version, `registry.${registry}`, async () => {
      return (await (await fetch(indexed(index, `registries/${registry}.json`))).json()) || []
    })
  },
  [],
  loadingState,
)
const writeableRegistry = computed(() => data.value.length === 0)

const mode = ref(true)
const input = ref('0')
const result = computed(() => {
  if (mode.value) {
    const num = Number(input.value)
    if (Number.isNaN(num)) return 'Not a number'
    return data.value[num] || 'Invalid network ID'
  } else {
    const index = data.value.findIndex((i) => i === input.value)
    if (index >= 0) return `${index}`
    return 'Invalid ID'
  }
})

function changeMode() {
  const lastResult = result.value
  mode.value = !mode.value
  nextTick(() => (input.value = lastResult))
}
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1">{{ desc }}</span>
    <span
      v-if="!primitive && !errorState"
      class="action-text"
      tabindex="0"
      @click="showSubType = !showSubType"
      @keyup="(e: KeyboardEvent) => isActionKey(e) && (showSubType = !showSubType)"
    >
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <div v-if="loadingState && showSubType" class="px-[0.4em]">{{ t('protocol.loading') }}</div>
  <div v-else-if="showSubType && writeableRegistry" class="px-[0.4em] pb-[0.2em] italic">
    {{ t('protocol.type.registry.writeable') }}
  </div>
  <div v-else-if="showSubType" class="sub-type w-full flex flex-row items-center">
    <CdxButton @click="changeMode">
      {{ t(`protocol.action.search_registry.${mode ? 'network_id' : 'id_network'}`) }}
    </CdxButton>
    <CdxTextInput v-model="input" :input-type="mode ? 'number' : 'text'" translate="no" />
    <span class="px-[0.4em] py-[0.2em] min-w-16 text-center" translate="no">{{ result }}</span>
  </div>
  <TypeChoice v-if="showSubType" :data="content" :version="version" type="div" class="sub-type" />
</template>
