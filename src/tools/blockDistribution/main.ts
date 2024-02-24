/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'

const targetEl = document.querySelector('.mcw-calc[data-type="blockDistribution"]')!
const createApp =
  process.env.NODE_ENV === 'development' ? vue.createApp : vue.createMwApp || vue.createApp
createApp(App, {
  blocks: targetEl?.querySelector('.mcw-calc-parameter[data-name="blocks"]')?.textContent?.split(',') ?? ['minecraft:diamond_ore'],
  blockNames: targetEl?.querySelector('.mcw-calc-parameter[data-name="block-names"]')?.textContent?.split(',') ?? ['Diamond Ore'],
}).mount(targetEl)
