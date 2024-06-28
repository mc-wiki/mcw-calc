import '@/init'
import * as vue from 'vue'
import App from './App.vue'
import { getParams, handleParseError } from '@/utils/params'
import { createMcwI18n } from '@/utils/i18n'
import { z } from 'zod'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const parsed = z
    .object({
      player: z.string().default('MinecraftWiki'),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)
  vue.createApp(App, params).use(i18n).mount(targetEl)
})()
