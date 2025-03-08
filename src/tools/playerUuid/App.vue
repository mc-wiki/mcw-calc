<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { parseWikitext } from '@/utils/i18n'
import { copyToClipboard } from '@/utils/iframe'
import { getImageLink } from '@/utils/image'
import { CdxButton, CdxField, CdxTextInput } from '@wikimedia/codex'
import SparkMD5 from 'spark-md5'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ player: string }>()

const { t } = useI18n()

const API_URL = 'https://playerdb.co/api/player/minecraft/'
const OFFLINE_PLAYER_PREFIX = 'OfflinePlayer:'
const SKIN_LOCATION = [
  'alex',
  'ari',
  'efe',
  'kai',
  'makena',
  'noor',
  'steve',
  'sunny',
  'zuri',
  'alex',
  'ari',
  'efe',
  'kai',
  'makena',
  'noor',
  'steve',
  'sunny',
  'zuri',
]
const SKIN_NAME = [
  'Alex (Slim)',
  'Ari (Slim)',
  'Efe (Slim)',
  'Kai (Slim)',
  'Makena (Slim)',
  'Noor (Slim)',
  'Steve (Slim)',
  'Sunny (Slim)',
  'Zuri (Slim)',
  'Alex (Wide)',
  'Ari (Wide)',
  'Efe (Wide)',
  'Kai (Wide)',
  'Makena (Wide)',
  'Noor (Wide)',
  'Steve (Wide)',
  'Sunny (Wide)',
  'Zuri (Wide)',
]

const playerName = ref(props.player)
const playerOnlineUUID = ref()
const playerOfflineUUID = ref()
const playerOnlineAvatar = ref()
const playerOfflineSkinLocation = ref(SKIN_LOCATION[6])
const playerOfflineSkinName = ref(SKIN_NAME[6])
const isLoading = ref(false)

const errorText = ref()

const copyTextOnline = ref(t('playerUuid.copy'))
const copyTextOffline = ref(t('playerUuid.copy'))

async function updatePlayerInfo() {
  const prefixedName = OFFLINE_PLAYER_PREFIX + playerName.value
  const bytes = SparkMD5.hash(prefixedName, true)
    .split('')
    .map((byte) => byte.charCodeAt(0))
  bytes[6] = (bytes[6] & 0x0f) | 0x30
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const uuid = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  playerOfflineUUID.value = `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20, 32)}`

  const mostSigBits = BigInt(`0x${uuid.slice(0, 16)}`)
  const leastSigBits = BigInt(`0x${uuid.slice(16, 32)}`)
  const xorBits = mostSigBits ^ leastSigBits
  const hashUUID = BigInt.asIntN(32, (xorBits ^ ((xorBits >> 32n) & 0xffffffffn)) & 0xffffffffn)
  const r = hashUUID % 18n
  const index = (r ^ 18n) < 0 && r !== 0n ? r + 18n : r
  playerOfflineSkinLocation.value = SKIN_LOCATION[Number(index)]
  playerOfflineSkinName.value = SKIN_NAME[Number(index)]

  if (isValid(playerName.value)) {
    isLoading.value = true
    const response = await fetch(API_URL + playerName.value)
    isLoading.value = false
    if (response.status === 200) {
      const data = await response.json()
      playerOnlineUUID.value = data.data.player.id
      playerOnlineAvatar.value = data.data.player.avatar
    } else {
      errorText.value = t('playerUuid.error.notFound')
      playerOnlineUUID.value = ''
      playerOnlineAvatar.value = ''
    }
  } else {
    errorText.value = t('playerUuid.error.invalid')
    playerOnlineUUID.value = ''
    playerOnlineAvatar.value = ''
  }
}

function isValid(username: string) {
  return username.match(/^\w{1,16}$/)
}

const copyTextIndex = [copyTextOnline, copyTextOffline]

async function copyUuid(uuid: string, index: number) {
  copyToClipboard(uuid)

  copyTextIndex[index].value = t('playerUuid.copied')
  setTimeout(() => {
    copyTextIndex[index].value = t('playerUuid.copy')
  }, 1000)
}

updatePlayerInfo()
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('playerUuid.title') }}
    </template>
    <div class="flex flex-col justify-between">
      <CdxField>
        <template #label>
          {{ t('playerUuid.name') }}
        </template>

        <div class="flex flex-row align-center gap-2">
          <CdxTextInput
            v-model="playerName"
            input-type="text"
            @keydown="
              (e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  updatePlayerInfo()
                }
              }
            "
          />
          <CdxButton @click="updatePlayerInfo()">
            <template v-if="isLoading">
              {{ t('playerUuid.loading') }}
            </template>
            <template v-else>
              {{ t('playerUuid.get') }}
            </template>
          </CdxButton>
        </div>
      </CdxField>

      <div class="flex items-center gap-6">
        <CdxField>
          <template #label>
            <span v-html="parseWikitext(t('playerUuid.uuidOffline'))" />
          </template>

          <div class="flex flex-row align-center gap-2">
            <CdxTextInput v-model="playerOfflineUUID" input-type="text" :disabled="true" />
            <CdxButton @click="copyUuid(playerOfflineUUID, 1)">
              {{ copyTextOffline }}
            </CdxButton>
          </div>
        </CdxField>
        <img
          width="48"
          height="48"
          class="pixel-image"
          :src="getImageLink(`en:EntitySprite_${playerOfflineSkinLocation}.png`)"
          :title="playerOfflineSkinName"
        />
      </div>

      <div class="flex items-center gap-6">
        <CdxField
          :status="playerOnlineUUID !== '' ? 'default' : 'error'"
          :messages="{
            error: errorText,
          }"
        >
          <template #label>
            <span v-html="parseWikitext(t('playerUuid.uuid'))" />
          </template>

          <div class="flex flex-row align-center gap-2">
            <CdxTextInput v-model="playerOnlineUUID" input-type="text" :disabled="true" />
            <CdxButton v-if="playerOnlineUUID !== ''" @click="copyUuid(playerOnlineUUID, 0)">
              {{ copyTextOnline }}
            </CdxButton>
          </div>
        </CdxField>
        <img v-if="playerOnlineUUID !== ''" width="48" height="48" :src="playerOnlineAvatar" />
      </div>
    </div>
  </CalcField>
</template>
