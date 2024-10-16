import plugin from '@/utils/plugin'
import * as vue from 'vue'
import App from './App.vue'

const targetEl = document.querySelector('#app')!

vue.createApp(App).use(plugin).mount(targetEl)
