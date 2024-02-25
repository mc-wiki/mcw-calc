/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams.ts'

const targetEl = document.querySelector('.mcw-calc[data-type="blockDistribution"]')!
const createApp =
  process.env.NODE_ENV === 'development' ? vue.createApp : vue.createMwApp || vue.createApp

const params = getParams(targetEl, ['blocks', 'block-names'], {
  blocks: 'minecraft:diamond_ore',
  'block-names': 'Diamond Ore',
})

createApp(App, {
  blocks: params.get('blocks')?.split(','),
  blockNames: params.get('block-names')?.split(','),
}).mount(targetEl)
