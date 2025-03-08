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
      image0: z.string().default('en:Panorama_0_JE2.png'),
      image1: z.string().default('en:Panorama_1_JE1.png'),
      image2: z.string().default('en:Panorama_2_JE1.png'),
      image3: z.string().default('en:Panorama_3_JE1.png'),
      image4: z.string().default('en:Panorama_4_JE1.png'),
      image5: z.string().default('en:Panorama_5_JE1.png'),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue
    .createApp(App, {
      images: [
        params.image0,
        params.image1,
        params.image2,
        params.image3,
        params.image4,
        params.image5,
      ],
    })
    .use(i18n)
    .use(plugin)
    .mount(targetEl)
})()
