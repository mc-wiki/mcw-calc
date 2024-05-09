/**
 * @dependencies vue, @wikimedia/codex
 * @public
 */
import * as vue from 'vue'
import App from './App.vue'

const targetEl = document.querySelector('.mcw-calc[data-type="seedHashcode"]')!
const createApp = vue.createApp
createApp(App).mount(targetEl)
