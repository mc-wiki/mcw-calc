import '@/init'
import * as vue from 'vue'
import App from './App.vue'
import { z } from 'zod'
import { getParams, handleParseError } from '@/utils/params'
import { createMcwI18n } from '@/utils/i18n'

const targetEl = document.querySelector('#app')!
const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const parsed = z
    .object({
      icon: z.enum(['normal', 'horse', 'wolf']).default('normal'),
    })
    .safeParse(await getParams())
  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, { type: params.icon }).use(i18n).mount(targetEl)
})()
