<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getAsPrimitiveProtocol } from '../constants.ts'
import ArrayType from './ArrayType.vue'
import BitfieldType from './BitfieldType.vue'
import Container from './Container.vue'
import EntityMetadataLoopType from './EntityMetadataLoopType.vue'
import MapperType from './MapperType.vue'
import OptionType from './OptionType.vue'
import ReferenceType from './ReferenceType.vue'
import TopBitSetTerminatedArrayType from './TopBitSetTerminatedArrayType.vue'

const props = defineProps<{ data: object | string; version: number; type?: string }>()
const { t } = useI18n()

const primitive = getAsPrimitiveProtocol(props.data)
const type = props.type || 'td'
</script>
<template>
  <component :is="type" v-if="!!primitive" class="non-complex">
    {{ t(`protocol.type.${primitive}`) }}
  </component>
  <component :is="type" v-else-if="!Array.isArray(props.data)" class="non-complex error-state">
    {{ t('protocol.error.data') }}
  </component>
  <component :is="type" v-else-if="props.data[0] === 'container'">
    <Container :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'array'">
    <ArrayType :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'option'">
    <OptionType :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'mapper'">
    <MapperType :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'bitfield'">
    <BitfieldType :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'reference'">
    <ReferenceType :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'top_bit_set_terminated_array'">
    <TopBitSetTerminatedArrayType :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'entity_metadata_loop'">
    <EntityMetadataLoopType :data="props.data" :version="props.version" />
  </component>
  <component :is="type" v-else-if="props.data[0] === 'fix_buffer'" class="non-complex">
    {{ t('protocol.type.fix_buffer', { length: props.data[1] }) }}
  </component>
  <component :is="type" v-else class="non-complex error-state">
    {{ t('protocol.type.unsupported') }}
  </component>
</template>
