/**
 * @public
 * @dependencies vue, @wikimedia/codex
 */
import * as vue from 'vue'
import App from './App.vue'
import getParams from '@/utils/getParams'

const targetEl = document.querySelector('#app')!

const params = getParams(targetEl, ['icon'], {
  icon: 'normal',
})

vue
  .createApp(App, {
    type: params.get('icon'),
  })
  .mount(targetEl)
