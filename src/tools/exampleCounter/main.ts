/**
 * An example counter tool for testing dependency resolution, bundling, and deployment, etc.
 * @dependencies vue, @wikimedia/codex
 * @public
 */
import * as vue from 'vue'
import App from './App.vue'

const targetEl = document.querySelector('.mcw-calc[data-type="exampleCounter"]')!
const createApp = vue.createApp
createApp(App).mount(targetEl)
