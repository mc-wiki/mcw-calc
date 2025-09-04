<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import CalcField from '@/components/CalcField.vue'
import { theme } from '@/utils/theme'

const rawLocale =
  new URLSearchParams(window.location.hash.substring(2)).get('locale') ??
  window.navigator.language.split('-')[0]

let locale = 'en'
if (rawLocale.startsWith('de')) {
  locale = 'de'
} else if (rawLocale.startsWith('es')) {
  locale = 'es-ES'
} else if (rawLocale.startsWith('fr')) {
  locale = 'fr-FR'
} else if (rawLocale.startsWith('it')) {
  locale = 'it-IT'
} else if (rawLocale.startsWith('nl')) {
  locale = 'nl'
} else if (rawLocale.startsWith('pl')) {
  locale = 'pl-PL'
} else if (rawLocale.startsWith('pt')) {
  locale = 'pt-BR'
} else if (rawLocale.startsWith('ru')) {
  locale = 'ru-RU'
} else if (rawLocale.startsWith('uk')) {
  locale = 'ua-UA'
} else if (rawLocale.startsWith('zh')) {
  locale = 'zh-CN'
} else if (rawLocale.startsWith('ja')) {
  locale = 'ja-JP'
}

const iframe = useTemplateRef<HTMLIFrameElement>('iframe')

onMounted(() => {
  window.addEventListener('message', (event) => {
    if (event.source === null) return
    if (event.origin !== 'https://mc-wiki.github.io') return
    if (iframe.value === null) return

    if (event.data.type === 'height-change') {
      iframe.value.style.height = `${event.data.height}px`
    }
  })
})
</script>
<template>
  <CalcField>
    <iframe
      ref="iframe"
      :src="`https://mc-wiki.github.io/enchant-order/?lang=${locale}&theme=${theme}`"
      style="border: medium; display: block; width: 100%; color-scheme: auto"
    />
  </CalcField>
</template>
<style>
.mcw-calc-field {
  padding: 0.5em;
}
</style>
