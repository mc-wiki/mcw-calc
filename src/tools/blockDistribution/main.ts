/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'

const targetEl = document.querySelector('.mcw-calc[data-type="blockDistribution"]')
const createApp =
  process.env.NODE_ENV === 'development'
    ? vue.createApp
    : // @ts-expect-error
      vue.createMwApp || vue.createApp
createApp(App, {
  blocks: targetEl?.getAttribute('data-blocks')?.split(',') ?? ['minecraft:diamond_ore'],
  blockNames: targetEl?.getAttribute('data-block-names')?.split(',') ?? ['Diamond Ore'],
}).mount(targetEl)
