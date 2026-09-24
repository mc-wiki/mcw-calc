import * as vue from 'vue'
import { createMcwI18n } from '@/utils/i18n'
import { isEmbedded } from '@/utils/iframe'
import { getParams } from '@/utils/params'
import plugin from '@/utils/plugin'
import { applyTheme } from '@/utils/theme'
import App from './App.vue'
import {
  parseSulfurCubeThemePreference,
  resolveSulfurCubeThemePreference,
  sulfurCubeThemePreferenceStorageKey,
} from './presentation/themePreference'
import { parseSulfurCubeViewMode } from './presentation/viewMode'
import '@/init'

const targetEl = document.querySelector('#app')!
const embedded = isEmbedded()

if (embedded) {
  document.documentElement.classList.add('sulfur-cube-embedded')
}

const i18n = createMcwI18n([import.meta.glob('./locale/*.json', { eager: true })])

;(async () => {
  const params = await getParams()
  const viewMode = parseSulfurCubeViewMode(params.view)
  const requestedThemePreference = parseSulfurCubeThemePreference(params.theme)
  let storedThemePreference = null

  try {
    storedThemePreference = parseSulfurCubeThemePreference(
      window.localStorage.getItem(sulfurCubeThemePreferenceStorageKey),
    )
  } catch {
    // URL and automatic preferences remain available when storage is unavailable.
  }

  const initialThemePreference = requestedThemePreference ?? storedThemePreference ?? 'auto'

  if (viewMode === 'full' || !embedded) {
    applyTheme(
      resolveSulfurCubeThemePreference(
        initialThemePreference,
        window.matchMedia('(prefers-color-scheme: dark)').matches,
      ),
    )
  }

  vue.createApp(App, { viewMode, initialThemePreference }).use(i18n).use(plugin).mount(targetEl)
})()
