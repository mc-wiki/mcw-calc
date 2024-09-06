<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxField, CdxTextInput } from '@wikimedia/codex'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { parseWikitext } from '@/utils/i18n'
import { isEmbedded, postMessageParent } from '@/utils/iframe'

const props = defineProps<{ player: string }>()

const { t } = useI18n()

const apiUrl = 'https://playerdb.co/api/player/minecraft/'
const playerName = ref(props.player)
const playerUuid = ref()
const playerAvatar = ref()
const isLoading = ref(false)

const errorText = ref()
const copyText = ref(t('playerUuid.copy'))

async function getUuid(username: string) {
  if (isValid(username)) {
    isLoading.value = true
    const response = await fetch(apiUrl + username)
    isLoading.value = false
    if (response.status === 200) {
      const data = await response.json()
      playerUuid.value = data.data.player.id
      playerAvatar.value = data.data.player.avatar
    } else {
      errorText.value = t('playerUuid.error.notFound')
      playerUuid.value = ''
      playerAvatar.value = ''
    }
  } else {
    errorText.value = t('playerUuid.error.invalid')
    playerUuid.value = ''
    playerAvatar.value = ''
  }
}

function isValid(username: string) {
  return username.match(/^\w{1,16}$/)
}

async function copyUuid(uuid: string) {
  if (isEmbedded()) {
    postMessageParent('mcw-calc-clipboard', {
      text: uuid,
    })
  } else {
    navigator.clipboard.writeText(uuid)
  }

  copyText.value = t('playerUuid.copied')
  setTimeout(() => {
    copyText.value = t('playerUuid.copy')
  }, 3000)
}

getUuid(playerName.value)
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('playerUuid.title') }}
    </template>

    <div
      :style="{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
      }"
    >
      <div>
        <CdxField>
          <template #label>
            {{ t('playerUuid.name') }}
          </template>

          <div
            :style="{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '.5rem',
            }"
          >
            <CdxTextInput v-model="playerName" input-type="text" />
            <CdxButton @click="getUuid(playerName)">
              <template v-if="isLoading">
                {{ t('playerUuid.loading') }}
              </template>
              <template v-else>
                {{ t('playerUuid.get') }}
              </template>
            </CdxButton>
          </div>
        </CdxField>
        <CdxField
          :status="playerUuid !== '' ? 'default' : 'error'"
          :messages="{
            error: errorText,
          }"
        >
          <template #label>
            <span v-html="parseWikitext(t('playerUuid.uuid'))" />
          </template>

          <div
            :style="{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '.5rem',
            }"
          >
            <CdxTextInput v-model="playerUuid" input-type="text" :disabled="true" />
            <CdxButton v-if="playerUuid !== ''" @click="copyUuid(playerUuid)">
              {{ copyText }}
            </CdxButton>
          </div>
        </CdxField>
      </div>
      <img v-if="playerUuid !== ''" width="64" height="64" :src="playerAvatar" />
    </div>
  </CalcField>
</template>
