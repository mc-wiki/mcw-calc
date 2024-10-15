import { createMcwI18n } from '@/utils/i18n'
import { CdxTooltip } from '@wikimedia/codex'
import * as vue from 'vue'
import App from './App.vue'
import '@/init'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))
vue.createApp(App).use(i18n).directive('tooltip', CdxTooltip).mount(targetEl)
