/**
 * An example counter tool for testing dependency resolution, bundling, and deployment, etc.
 * @dependencies vue, @wikimedia/codex
 * @public
 */
import '@/init'
import * as vue from 'vue'
import App from './App.vue'
import { createMcwI18n } from '@/utils/i18n'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }), 'en')
vue.createApp(App).use(i18n).mount(targetEl)
