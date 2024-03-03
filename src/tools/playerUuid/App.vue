<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton } from '@wikimedia/codex'
import Field from '@/components/Field.vue'
import { useI18n } from '@/utils/i18n'
import locales from './locales'

const props = defineProps<{ player: string }>()

const { t, message } = useI18n(__TOOL_NAME__, locales)

const apiUrl = 'https://playerdb.co/api/player/minecraft/'
const playerName = ref(props.player)
const playerUuid = ref()
const playerAvatar = ref()

const errorText = ref()
const copyText = ref(t('playerUuid.copy'))

async function getUuid(username: string) {
  if (isValid(username)) {
    const response = await fetch(apiUrl + username)
    if (response.status == 200) {
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
  return username.match(/^[a-z0-9_]{1,16}$/i)
}

async function copyUuid(uuid: string) {
  navigator.clipboard.writeText(uuid)

  copyText.value = t('playerUuid.copied')
  setTimeout(() => {
    copyText.value = t('playerUuid.copy')
  }, 3000)
}

getUuid(playerName.value)
</script>
<template>
  <Field>
    <template #heading>{{ t('playerUuid.title') }}</template>

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
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <label for="username-input">{{ t('playerUuid.name') }}</label>
          <input type="text" v-model="playerName" id="username-input" />
          <cdx-button @click="getUuid(playerName)">{{ t('playerUuid.get') }}</cdx-button>
        </div>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '.5rem',
          }"
        >
          <p v-html="message('playerUuid.uuid').parse()"></p>
          <code v-if="playerUuid !== ''">{{ playerUuid }}</code>
          <template v-else>{{ errorText }}</template>
          <cdx-button v-if="playerUuid !== ''" @click="copyUuid(playerUuid)">{{ copyText }}</cdx-button>
        </div>
      </div>
      <img v-if="playerUuid !== ''" width="64" height="64" :src="playerAvatar"/>
    </div>
  </Field>
</template>
