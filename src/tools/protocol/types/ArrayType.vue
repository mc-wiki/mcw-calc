<script setup lang="ts">
import { inject, ref } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { getAsPrimitiveProtocol, isActionKey } from '../constants.ts'
import { useGlobalState } from '../state.ts'
import TypeChoice from './TypeChoice.vue'

interface ArrayTypeDefinition {
  countType?: string
  count?: number | string
  type: object | string
}

const props = defineProps<{ data: object; version: number }>()
const { t } = useI18n()
const state = useGlobalState()
const scope = inject('scope') as string

const errorState =
  !Array.isArray(props.data) || props.data[0] !== 'array' || props.data.length !== 2
const content = (props.data as any[])[1] as ArrayTypeDefinition
const primitive = getAsPrimitiveProtocol(content.type)

const showSubType = ref(false)
</script>
<template>
  <div class="complex-padding flex">
    <span v-if="errorState" class="error-state">{{ t('protocol.error.data') }}</span>
    <I18nT
      v-else
      :keypath="primitive ? 'protocol.type.array.primitive' : 'protocol.type.array.complex'"
      tag="span"
      class="flex-1"
    >
      <template v-if="primitive" #type>{{ t(`protocol.type.${primitive}`) }}</template>
      <template #count>
        <I18nT
          :keypath="`protocol.type.array.count_${content.countType ? 'type' : 'fixed'}`"
          tag="span"
        >
          <template v-if="content.countType" #type>
            {{ t(`protocol.type.${content.countType}`) }}
          </template>
          <template v-else #count>
            <span
              v-if="typeof content.count === 'string'"
              class="var-link"
              translate="no"
              @mouseover="state.selectName(content.count, scope)"
              @mouseout="state.unselectName(content.count, scope)"
            >
              {{ content.count }}
            </span>
            <span v-else>{{ content.count }}</span>
          </template>
        </I18nT>
      </template>
    </I18nT>
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
  <TypeChoice
    v-if="showSubType"
    :data="content.type"
    :version="version"
    type="div"
    class="sub-type"
  />
</template>
