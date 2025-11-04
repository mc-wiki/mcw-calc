<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface BitfieldTypeDefinition {
  name: string
  size: number
  signed?: boolean
  saveName: string
}

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'bitfield' || props.data.length !== 2
const content = (props.data as any[])[1] as BitfieldTypeDefinition[]
const length = content.map((c) => c.size).reduce((p, c) => p + c, 0)
const display: { offset: string; name: string }[] = []
let offset = 0
for (const entry of content) {
  if (entry.name !== 'unused') {
    display.push({
      offset: `${offset} - ${offset + entry.size}`,
      name: t(`protocol.type.bitfield.${(entry.signed ?? true) ? 'signed' : 'unsigned'}`, {
        name: entry.name,
      }),
    })
  }
  offset += entry.size
}

const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <span v-else class="flex-1">{{ t('protocol.type.bitfield', { length }) }}</span>
    <span v-if="!errorState" class="flex-none min-w-2" />
    <span v-if="!errorState" @click="showSubType = !showSubType">
      [{{ showSubType ? t('protocol.action.collapse') : t('protocol.action.expand') }}]
    </span>
  </div>
  <table v-if="showSubType" class="bitfield-table w-full">
    <tr v-for="item in display" :key="item.offset">
      <td class="non-complex">{{ item.offset }}</td>
      <td class="non-complex">{{ item.name }}</td>
    </tr>
  </table>
</template>
<style>
.bitfield-table > tr > td:first-child {
  border-left: none;
}
.bitfield-table > tr > td:last-child {
  border-right: none;
}
.bitfield-table > tr:last-child > td {
  border-bottom: none;
}
</style>
