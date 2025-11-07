<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGlobalState } from '../state.ts'
import TypeChoice from './TypeChoice.vue'

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const scope = inject('scope') as string

const errorState =
  !Array.isArray(props.data) ||
  (props.data[0] !== 'save' && props.data[0] !== 'global_save') ||
  props.data.length !== 3
const data = props.data as any[]
const content = data[1] as string | object
const saveName = data[2] as string

const globalState = useGlobalState()
const showFrame = globalState.requireName(saveName, scope)
</script>
<template>
  <span v-if="errorState" class="error-state" :class="showFrame ? 'save-frame' : ''">
    {{ t('protocol.error.data') }}
  </span>
  <TypeChoice
    v-else
    :data="content"
    :version="version"
    type="div"
    class="save-sub-type"
    :class="showFrame ? 'save-frame' : ''"
  />
</template>
<style>
.save-sub-type {
  transition: background-color .3s;
}
.save-sub-type.non-complex {
  padding: 0.2em 0.4em;
}
.save-frame {
  background-color: #bbf;
  transition: background-color .1s cubic-bezier(0, 0.8, 1, 1);
}
.dark .save-frame {
  background-color: #338;
}
</style>

