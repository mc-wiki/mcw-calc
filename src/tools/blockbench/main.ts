import { createMcwI18n } from '@/utils/i18n'
import { getParams, handleParseError, sz } from '@/utils/params'
import plugin from '@/utils/plugin'
import * as vue from 'vue'
import { z } from 'zod'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

;(async () => {
  const parsed = z
    .object({
      loadtype: z.enum(['json', 'image', 'minecraft_skin']),
      loadname: z.string().optional(),
      loaddata: z.string().optional(),
    })
    .or(z.object({ m: z.string() }))
    .and(
      z.object({
        additionalParams: z.string().optional(),
      }),
    )

    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, params).use(plugin).mount(targetEl)
})()
