import * as vue from 'vue'
import plugin from '@/utils/plugin'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

vue.createApp(App).use(plugin).mount(targetEl)
