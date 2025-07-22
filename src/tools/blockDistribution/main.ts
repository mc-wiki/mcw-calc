import { createMcwI18n } from '@/utils/i18n'
import { getParams, handleParseError, sz } from '@/utils/params'
import plugin from '@/utils/plugin'
import * as vue from 'vue'
import { z } from 'zod'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n([import.meta.glob('./locale/*.json', { eager: true })])

;(async () => {
  const parsed = z
    .object({
      blocks: sz.array(z.string()).default(['minecraft:diamond_ore']),
      blockNames: sz.array(z.string()).default(['Diamond Ore']),
      pageName: z.string().optional(),
      dimensions: sz.array(z.string()).default(['overworld', 'nether', 'end']),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, params).use(i18n).use(plugin).mount(targetEl)
})()
