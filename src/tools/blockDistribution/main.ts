/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'

const targetEl = document.querySelector('.mcw-calc[data-type="blockDistribution"]')!
const createApp = vue.createApp

const params = getParams(targetEl, ['blocks', 'block-names', 'page-name'], {
  blocks: 'minecraft:diamond_ore',
  'block-names': 'Diamond Ore',
  'page-name': mw.config.get('wgPageName'),
})

createApp(App, {
  blocks: params.get('blocks')?.split(','),
  blockNames: params.get('block-names')?.split(','),
  pageName: params.get('page-name'),
}).mount(targetEl)
