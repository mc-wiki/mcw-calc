import '@/init'
import * as vue from 'vue'
import { z } from 'zod'
import App from './App.vue'
import { getParams, handleParseError, sz } from '@/utils/params'
import { createMcwI18n } from '@/utils/i18n'
import { hashCode } from '@/utils/seed'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const parsed = z
    .object({
      seed: z
        .preprocess((val) => {
          try {
            return BigInt(val as string)
            // eslint-disable-next-line unused-imports/no-unused-vars
          } catch (e) {
            return hashCode(val as string)
          }
        }, z.bigint())
        .default(crypto.getRandomValues(new BigInt64Array(1))[0]),
      showBiomes: sz.boolean().default(true),
      terrain: sz.boolean().default(true),
      platform: sz.string().default('java_1_21'),
      pois: sz.string().nullable().default(null),
      biomeHeight: sz.string().default('depth0'),
      zoom: sz.number().default(0),
      x: sz.number().default(0),
      z: sz.number().default(0),
      dimension: sz.string().default('overworld'),
      promo: sz.boolean().default(true),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue.createApp(App, params).use(i18n).mount(targetEl)
})()
