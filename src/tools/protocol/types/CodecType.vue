<script setup lang="ts">
import type { GetOrCache, IndexerType } from '../constants.ts'
import { asyncComputed } from '@vueuse/core'
import { CdxSelect } from '@wikimedia/codex'
import { computed, inject, provide, ref, watch } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { indexed, isVoidProtocol } from '../constants.ts'
import { useGlobalState } from '../state.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const state = useGlobalState()
const scope = inject('scope') as string
const cacheGet = inject('cache-get') as GetOrCache
const getIndexFor = inject('get-index-for') as IndexerType
const getPacketFor = inject('get-packet-for') as IndexerType

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'codec' || props.data.length !== 3
const data = props.data as any[]
const registry = data[1] as string
const varName = data[2] as string

const random = Math.random().toString(36).substring(2, 8)
provide('scope', `${scope}/${random}`)

const showChoice = ref(false)
const registryLoading = ref(false)
const registryData = asyncComputed(
  async () => {
    if (!showChoice.value) return Promise.resolve([]) // lazy
    return (
      await cacheGet(props.version, `registry.${registry}`, async () => {
        const index = getIndexFor(props.version, registry)
        return (await (await fetch(indexed(index, `registries/${registry}.json`))).json()) || []
      })
    ).map((c: string, i: number) => ({ value: c, label: `(0x${i.toString(16)}, ${i}) ${c}` }))
  },
  [],
  registryLoading,
)

const selectedCodec = ref('')
const codecLoading = ref(true)
const codecData = asyncComputed(
  async () => {
    if (!showChoice.value) return Promise.resolve('void') // lazy
    if (!selectedCodec.value) return Promise.resolve('void') // lazy
    return await cacheGet(props.version, `codec.${registry}/${selectedCodec.value}`, async () => {
      const index = getPacketFor(props.version, `${registry}/${selectedCodec.value}`)
      return (
        (await (
          await fetch(indexed(index, `codec/${registry}/${selectedCodec.value}.json`))
        ).json()) || 'void'
      )
    })
  },
  'void',
  codecLoading,
)

const loading = computed(() => registryLoading.value || codecLoading.value)
watch(registryData, () => (selectedCodec.value = registryData.value[0].value || ''))
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <I18nT v-else keypath="protocol.type.codec" tag="span" class="flex-1 italic">
      <template #link>
        <span
          class="underline"
          @mouseover="state.selectName(varName, scope)"
          @mouseout="state.unselectName(varName, scope)"
        >
          {{ varName }}
        </span>
      </template>
    </I18nT>
    <span v-if="!errorState" class="ml-2 cursor-pointer" @click="showChoice = !showChoice">
      [{{ showChoice ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <div v-if="showChoice">
    <div v-if="registryLoading" class="px-[0.4em] py-[0.2em]">{{ t('protocol.loading') }}</div>
    <CdxSelect v-else v-model:selected="selectedCodec" :menu-items="registryData" class="w-full" />
    <div v-if="loading" class="px-[0.4em] py-[0.2em]">{{ t('protocol.loading') }}</div>
    <div v-else-if="isVoidProtocol(codecData)" class="italic px-[0.4em] py-[0.2em]">
      {{ t('protocol.type.codec.void') }}
    </div>
    <TypeChoice v-else :data="codecData" :version="version" type="div" class="sub-type" />
  </div>
</template>
