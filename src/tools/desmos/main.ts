import * as vue from 'vue'
import { z } from 'zod'
import { createMcwI18n } from '@/utils/i18n'
import { getParams, handleParseError, sz } from '@/utils/params'
import plugin from '@/utils/plugin'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n([import.meta.glob('./locale/*.json', { eager: true })])

;(async () => {
  const parsed = z
    .object({
      name: sz.string().default(''),
      title: sz.string().default(''),
      width: sz.number().default(500),
      height: sz.number().default(500),
      style: sz.string().default('border: 1px solid #ccc'),
      frameborder: sz.number().default(0),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, params).use(i18n).use(plugin).mount(targetEl)
})()
