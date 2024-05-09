/**
 * @dependencies vue, @wikimedia/codex
 * @public
 */
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'

const targetEl = document.querySelector('.mcw-calc[data-type="playerUuid"]')!
const createApp = vue.createApp

const params = getParams(targetEl, ['player'], {
  player: 'MinecraftWiki',
})

createApp(App, {
  player: params.get('player'),
}).mount(targetEl)
