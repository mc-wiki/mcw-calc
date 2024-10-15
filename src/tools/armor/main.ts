import * as vue from 'vue'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

vue.createApp(App).mount(targetEl)
