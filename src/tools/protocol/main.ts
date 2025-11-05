import * as vue from 'vue'
import { z } from 'zod'
import App from '@/tools/protocol/App.vue'
import { createMcwI18n } from '@/utils/i18n'
import { getParams, handleParseError, sz } from '@/utils/params.ts'
import plugin from '@/utils/plugin'
import '@/init'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n([import.meta.glob('../protocol/locale/*.json', { eager: true })])

;(async () => {
  const parsed = z
    .object({
      versions: sz.array(sz.string(), ';').optional(),
      selectVersion: sz.string().optional(),
      packets: sz.array(sz.string(), ';').optional(),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, params).use(i18n).use(plugin).mount(targetEl)
})()
