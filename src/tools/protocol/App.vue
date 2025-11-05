<script setup lang="ts">
import type { MenuGroupData, MenuItemData } from '@wikimedia/codex'
import { asyncComputed, objectOmit } from '@vueuse/core'
import { CdxSelect } from '@wikimedia/codex'
import Papa from 'papaparse'
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import {
  INDEX_CSV,
  indexed,
  INITIAL_PROTOCOL,
  isVoidProtocol,
  PACKETS_CSV,
  VERSIONS_JSON,
} from './constants.ts'
import { useGlobalState } from './state.ts'
import RootContainer from './types/RootContainer.vue'

const props = defineProps<{
  versions?: string[]
  selectVersion?: string
  packets?: string[]
}>()

const { t } = useI18n()

// PROTOCOL STORAGE --------------------------------------------------------------------------------
interface ProtoMeta {
  key: string
  name: string
}

const versions: [string, [number, number]][] = []
const versionMapping = new Map<string, [number, number]>()
const indexesMapping = new Map<number, Record<string, number>>()
const packetMapping = new Map<number, Record<string, number>>()
const initialProtocolData = new Map<string, (any & ProtoMeta)[]>()
const cachedProtocolMeta = new Map<number, Map<string, (any & ProtoMeta)[]>>()
const sharedProtocolCache = new Map<string, any>()

async function setupProtocolVersions() {
  versions.push(
    ...(await (await fetch(VERSIONS_JSON)).json())
      .map((v: any) => [v.version, [v.protocol_version, v.data_version]])
      .filter((s: [string]) => !props.versions || props.versions.includes(s[0])),
  )
  versions.forEach((v) => versionMapping.set(v[0], v[1]))
  Papa.parse<any>(await (await fetch(INDEX_CSV)).text(), { header: true })
    .data.reverse()
    .forEach((s) => {
      indexesMapping.set(
        Number(s.protocol_version),
        Object.fromEntries(
          Object.entries(objectOmit(s, ['protocol_version'])).map(([k, v]) => [k, Number(v)]),
        ),
      )
    })
  Papa.parse<any>(await (await fetch(PACKETS_CSV)).text(), { header: true })
    .data.reverse()
    .forEach((s) => {
      packetMapping.set(
        Number(s.protocol_version),
        Object.fromEntries(
          Object.entries(objectOmit(s, ['protocol_version'])).map(([k, v]) => [k, Number(v)]),
        ),
      )
    })
  Object.entries(await (await fetch(INITIAL_PROTOCOL)).json()).forEach(([name, array]) => {
    initialProtocolData.set(name.replace('_', '/'), array as any[])
  })
}

async function setupProtocolMetadata(protocolVersion: number) {
  if (cachedProtocolMeta.has(protocolVersion)) return
  const index = getIndexFor(protocolVersion, 'protocol')
  if (index < 0) {
    cachedProtocolMeta.set(protocolVersion, new Map())
    return
  }
  const url = indexed(index, 'protocol.json')
  const meta = new Map()
  Object.entries(await (await fetch(url)).json()).forEach(([name, array]) => {
    meta.set(name.replace('_', '/'), array as any[])
  })
  cachedProtocolMeta.set(protocolVersion, meta)
}

provide('cache-get', cacheGet)
provide('get-index-for', getIndexFor)
provide('get-packet-for', getPacketFor)
provide('scope', '#root')

function getIndexFor(protocolVersion: number, key: string) {
  return indexesMapping.get(protocolVersion)?.[key] || -1
}

function getPacketFor(protocolVersion: number, key: string) {
  return packetMapping.get(protocolVersion)?.[key] || -1
}

async function cacheGet<T>(p: number, k: string, missing: () => Promise<T>): Promise<T> {
  const key = `${p}/${k}`
  if (sharedProtocolCache.has(key)) return sharedProtocolCache.get(key) as T
  const data = await missing()
  sharedProtocolCache.set(key, data)
  return data
}

// DISPLAY SETTINGS --------------------------------------------------------------------------------
const errorState = ref(false)
const loadingState = ref(true)
const selectedVersion = ref<string>('')
const candidateVersions = ref<MenuItemData[]>([])
const protocolVersion = computed(() => versionMapping.get(selectedVersion.value)?.[0] || -1)

const packetsLoadingState = ref(true)
const selectedPacket = ref<string>('handshake/server/0')
const candidatePackets = ref<MenuGroupData[]>([])

const packetLoadingState = ref(true)
const packetData = asyncComputed<string | object>(
  async () => {
    if (packetsLoadingState.value) return 'void'
    const protocol = cachedProtocolMeta.get(protocolVersion.value)
    if (!protocol) return 'void'
    const selected = selectedPacket.value
    const split = selected.lastIndexOf('/')
    const key = selected.substring(0, split)
    const index = Number(selected.substring(split + 1))
    if ([...initialProtocolData.keys()].includes(key)) {
      // await is necessary to add the microtask
      return await (initialProtocolData.get(key)?.[index].type || 'void')
    } else {
      const entry = protocol.get(key)?.[index]
      if (!entry) return 'void'
      if (entry.type) return entry.type
      const name = `${key.replace('/', '_')}_${entry.key.replace('/', '_')}`
      const indexName = indexed(getPacketFor(protocolVersion.value, name), `packets/${name}.json`)
      return await cacheGet(protocolVersion.value, name, async () => {
        return await (await fetch(indexName)).json()
      })
    }
  },
  'void',
  packetLoadingState,
)

function setupInitialVersionState() {
  candidateVersions.value = versions.map((s) => ({
    label: t('protocol.version.display', { name: s[0], protocol: s[1][0], data: s[1][1] }),
    value: s[0],
  }))
  selectedVersion.value = props.selectVersion || versions[0]?.[0] || ''
}

function updateProtocolSelectState() {
  const list: MenuGroupData[] = []
  ;[
    ...initialProtocolData.entries(),
    ...(cachedProtocolMeta.get(protocolVersion.value)?.entries() || []),
  ].forEach(([k, v]) => {
    const group: MenuItemData[] = []
    v.forEach((e, i) => {
      group.push({
        label: t('protocol.packet.display', { name: e.key, hex: `0x${i.toString(16)}`, id: i }),
        value: `${k}/${i}`,
      })
    })
    const filtered = props.packets
      ? group.filter((v) => (props.packets || []).includes(v.value as string))
      : group
    if (filtered.length > 0) {
      const [state, flow] = k.split('/')
      list.push({
        label: `${state[0].toUpperCase()}${state.substring(1)} (to ${flow[0].toUpperCase()}${flow.substring(1)})`,
        items: filtered,
      })
    }
  })

  candidatePackets.value = list

  if (!list.some((e) => e.items.some((v) => v.value === selectedPacket.value)))
    selectedPacket.value = list[0].items[0].value as string
}

watch(selectedVersion, async () => {
  packetsLoadingState.value = true
  await setupProtocolMetadata(protocolVersion.value)
  updateProtocolSelectState()
  packetsLoadingState.value = false
})

const globalState = useGlobalState()
watch([selectedVersion, selectedPacket], () => globalState.clearState())

// SETUP -------------------------------------------------------------------------------------------
onMounted(() => {
  ;(async () => {
    await setupProtocolVersions()
    setupInitialVersionState()
    loadingState.value = false
    await setupProtocolMetadata(protocolVersion.value)
    updateProtocolSelectState()
    packetsLoadingState.value = false
  })().catch((e: any) => {
    errorState.value = true
    console.error(e)
  })
})
</script>
<template>
  <CalcField v-if="!loadingState && !errorState">
    <template #heading>
      {{ t('protocol.title') }}
    </template>
    <div class="flex flex-row gap-2 mb-4">
      <div class="flex flex-col gap-4 justify-around">
        <label for="version">{{ t('protocol.version') }}</label>
        <label v-if="!packetsLoadingState" for="packets">{{ t('protocol.packet') }}</label>
      </div>
      <div class="flex flex-col gap-4">
        <CdxSelect
          id="version"
          v-model:selected="selectedVersion"
          :menu-items="candidateVersions"
        />
        <CdxSelect
          v-if="!packetsLoadingState"
          id="packets"
          v-model:selected="selectedPacket"
          :menu-items="candidatePackets"
        />
      </div>
    </div>
    <div v-if="packetLoadingState">{{ t('protocol.loading') }}</div>
    <div v-else-if="isVoidProtocol(packetData)" class="italic">
      {{ t('protocol.type.void') }}
    </div>
    <RootContainer v-else :data="packetData as object" :version="protocolVersion" />
  </CalcField>
  <div v-else-if="errorState" :style="{ color: 'red' }">{{ t('protocol.error.loading') }}</div>
  <div v-else>{{ t('protocol.loading') }}</div>
</template>
<style>
td {
  border: 1px solid var(--border-color-base, #a2a9b1);
  padding: 0.2em 0.4em;
}

td:not(.non-complex) {
  padding: 0;
}

.error-state {
  color: red;
  font-style: italic;
}

.complex-padding {
  padding: 0.2em 0.4em;
}

div.sub-type.non-complex {
  padding: 0.2em 0.4em;
}

div.sub-type {
  border-top: 1px solid var(--border-color-base, #a2a9b1);
}
</style>
