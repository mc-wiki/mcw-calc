import * as vue from 'vue'
import { z } from 'zod'
import { getParams, handleParseError, sz } from '@/utils/params'
import plugin from '@/utils/plugin'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

;(async () => {
  const parsed = z
    .object({
      name: sz.string((s) =>
        s.regex(/^[a-z0-9]{10}$/, {
          message: 'Name should be 10-character combinations of lowercase letters or digits',
        }),
      ),
      title: sz.string().default(''),
      width: sz.number().default(500),
      height: sz.number().default(500),
      style: sz.string().default('border: 1px solid #ccc'),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, params).use(plugin).mount(targetEl)
})()
