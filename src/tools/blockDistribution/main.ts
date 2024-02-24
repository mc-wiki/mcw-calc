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
  blocks: targetEl?.getElementsByClassName('mcw-clac-parameter-blocks')[0]?.textContent?.split(',') ?? ['minecraft:diamond_ore'],
  blockNames: targetEl?.getElementsByClassName('mcw-clac-parameter-block-names')[0]?.textContent?.split(',') ?? ['Diamond Ore'],
}).mount(targetEl)
