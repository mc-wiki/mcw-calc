import '@/init'
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'
import { createMcwI18n } from '@/utils/i18n'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const params = await getParams(['blocks', 'block-names', 'page-name'], {
    blocks: 'minecraft:diamond_ore',
    'block-names': 'Diamond Ore',
    'page-name': 'Diamond Ore',
  })

  vue
    .createApp(App, {
      blocks: params.get('blocks')?.split(','),
      blockNames: params.get('block-names')?.split(','),
      pageName: params.get('page-name'),
    })
    .use(i18n)
    .mount(targetEl)
})()
