<script setup lang="ts">
import { asyncComputed, objectOmit } from '@vueuse/core'
import { CdxSelect } from '@wikimedia/codex'
import Papa from 'papaparse'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import {
  INDEX_CSV,
  indexed,
  INITIAL_PROTOCOL,
  isVoidProtocol,
  PACKETS_CSV,
  VERSIONS_JSON,
} from '@/tools/protocol/constants.ts'

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

function getIndexFor(protocolVersion: number, key: string) {
  return indexesMapping.get(protocolVersion)?.[key] || -1
}

function getPacketFor(protocolVersion: number, key: string) {
  return packetMapping.get(protocolVersion)?.[key] || -1
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

async function getOrCache<T>(p: number, k: string, missing: () => Promise<T>): Promise<T> {
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
const candidateVersions = ref<any[]>([])
const protocolVersion = computed(() => versionMapping.get(selectedVersion.value)?.[0] || -1)

const packetsLoadingState = ref(true)
const selectedPacket = ref<string>('handshake/server/0')
const candidatePackets = ref<any[]>([])

const packetData = asyncComputed<string | object>(async () => {
  if (packetsLoadingState.value) return 'void'
  const protocol = cachedProtocolMeta.get(protocolVersion.value)
  if (!protocol) return 'void'
  const selected = selectedPacket.value
  const split = selected.lastIndexOf('/')
  const key = selected.substring(0, split)
  const index = Number(selected.substring(split + 1))
  if ([...initialProtocolData.keys()].includes(key)) {
    return initialProtocolData.get(key)?.[index].type || 'void'
  } else {
    const entry = protocol.get(key)?.[index]
    if (!entry) return 'void'
    if (entry.type) return entry.type
    const name = `${key.replace('/', '_')}_${entry.key.replace('/', '_')}`
    const indexName = indexed(getPacketFor(protocolVersion.value, name), `packets/${name}.json`)
    return await getOrCache(protocolVersion.value, name, async () => {
      return await (await fetch(indexName)).json()
    })
  }
}, 'void')

function setupInitialVersionState() {
  candidateVersions.value = versions.map((s) => ({
    label: t('protocol.version.display', { name: s[0], protocol: s[1][0], data: s[1][1] }),
    value: s[0],
  }))
  selectedVersion.value = props.selectVersion || versions[0]?.[0] || ''
}

function updateProtocolSelectState() {
  const list: any[] = []
  ;[
    ...initialProtocolData.entries(),
    ...(cachedProtocolMeta.get(protocolVersion.value)?.entries() || []),
  ].forEach(([k, v]) =>
    v.forEach((e, i) => {
      list.push({
        label: t('protocol.packet.display', { name: e.key, state: k, id: i }),
        value: `${k}/${i}`,
      })
    }),
  )
  candidatePackets.value = list

  if (!list.some((e) => e.value === selectedPacket.value)) selectedPacket.value = list[0].value
}

watch(selectedVersion, async () => {
  packetsLoadingState.value = true
  await setupProtocolMetadata(protocolVersion.value)
  updateProtocolSelectState()
  packetsLoadingState.value = false
})

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
    <div :style="{ display: 'flex', flexDirection: 'row', gap: '.5rem', marginBottom: '1rem' }">
      <div
        :style="{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          justifyContent: 'space-around',
        }"
      >
        <label for="version">{{ t('protocol.version') }}</label>
        <label v-if="!packetsLoadingState" for="packets">{{ t('protocol.packet') }}</label>
      </div>
      <div :style="{ display: 'flex', flexDirection: 'column', gap: '1rem' }">
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
    <div v-if="isVoidProtocol(packetData)" :style="{ fontStyle: 'italic' }">
      {{ t('protocol.type.void') }}
    </div>
    <div v-else>{{ packetData }}</div>
  </CalcField>
  <div v-else-if="errorState" :style="{ color: 'red' }">{{ t('protocol.error.loading') }}</div>
  <div v-else>{{ t('protocol.loading') }}</div>
</template>
