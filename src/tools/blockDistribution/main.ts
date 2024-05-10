/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'

const targetEl = document.querySelector('#app')!

const params = getParams(targetEl, ['blocks', 'block-names', 'page-name'], {
  blocks: 'minecraft:diamond_ore',
  'block-names': 'Diamond Ore',
  'page-name': mw.config.get('wgPageName'),
})

vue
  .createApp(App, {
    blocks: params.get('blocks')?.split(','),
    blockNames: params.get('block-names')?.split(','),
    pageName: params.get('page-name'),
  })
  .mount(targetEl)
