import * as vue from 'vue'
import { z } from 'zod'
import { createMcwI18n } from '@/utils/i18n'
import { getParams, handleParseError } from '@/utils/params'
import plugin from '@/utils/plugin'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n([import.meta.glob('./locale/*.json', { eager: true })])

;(async () => {
  const parsed = z
    .object({
      player: z.string().default('MinecraftWiki'),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)
  vue.createApp(App, params).use(i18n).use(plugin).mount(targetEl)
})()
