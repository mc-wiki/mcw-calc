/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'

const targetEl = document.querySelector('.mcw-calc[data-type="beaconColor"]')!
const createApp = vue.createApp
createApp(App).mount(targetEl)
