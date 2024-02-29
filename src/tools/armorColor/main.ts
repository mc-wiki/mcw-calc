/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'

const targetEl = document.querySelector('.mcw-calc[data-type="armorColor"]')!
const createApp =
  process.env.NODE_ENV === 'development' ? vue.createApp : vue.createMwApp || vue.createApp

const params = getParams(targetEl, ['icon'], {
  icon: 'normal',
})

createApp(App, {
  type: params.get('icon'),
}).mount(targetEl)
