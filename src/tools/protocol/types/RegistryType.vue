<script setup lang="ts">
import type { GetOrCache, IndexerType } from '../constants.ts'
import { asyncComputed } from '@vueuse/core'
import { CdxButton, CdxTextInput } from '@wikimedia/codex'
import { computed, inject, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { indexed } from '../constants.ts'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const cacheGet = inject('cache-get') as GetOrCache
const getIndexFor = inject('get-index-for') as IndexerType

const errorState =
  !Array.isArray(props.data) ||
  props.data[0] !== 'registry' ||
  props.data.length > 3 ||
  props.data.length < 2
const propData = props.data as any[]
const content = propData[1] as string
const offset = propData[2]

const showSearching = ref(false)
const loadingState = ref(true)
const data = asyncComputed<string[]>(
  async () => {
    if (!showSearching.value) return Promise.resolve([]) // lazy
    return await cacheGet(props.version, `registry.${content}`, async () => {
      const index = getIndexFor(props.version, content)
      return (await (await fetch(indexed(index, `registries/${content}.json`))).json()) || []
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
    <span v-else class="flex-1">
      {{ t(`protocol.type.registry${offset ? '.offset' : ''}`, { type: content, offset }) }}
    </span>
    <span v-if="!errorState" class="ml-2 cursor-pointer" @click="showSearching = !showSearching">
      [{{ showSearching ? t('protocol.action.collapse') : t('protocol.action.search_registry') }}]
    </span>
  </div>
  <div v-if="loadingState && showSearching" class="px-[0.4em]">{{ t('protocol.loading') }}</div>
  <div v-else-if="showSearching && writeableRegistry" class="px-[0.4em] pb-[0.2em] italic">
    {{ t('protocol.type.registry.writeable') }}
  </div>
  <div v-else-if="showSearching" class="sub-type w-full flex flex-row items-center">
    <CdxButton @click="changeMode">
      {{ t(`protocol.action.search_registry.${mode ? 'network_id' : 'id_network'}`) }}
    </CdxButton>
    <CdxTextInput v-model="input" :input-type="mode ? 'number' : 'text'" />
    <span class="px-[0.4em] py-[0.2em] min-w-16 text-center">{{ result }}</span>
  </div>
</template>
