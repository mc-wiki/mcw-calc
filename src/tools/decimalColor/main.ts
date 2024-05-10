/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'

const targetEls = [...document.querySelectorAll('.mcw-calc[data-type="decimalColor"]')!]

for (const targetEl of targetEls) {
  createApp(App).mount(targetEl)
}
