/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'

const targetEls = [...document.querySelectorAll('.mcw-calc[data-type="decimalColor"]')!]
const createApp = vue.createApp
for (const targetEl of targetEls) {
  createApp(App).mount(targetEl)
}
