import '@/init'
import * as vue from 'vue'
import { CdxTooltip } from '@wikimedia/codex'
import App from './App.vue'
import { z } from 'zod'
import { getParams, handleParseError, sz } from '@/utils/params'
import { createMcwI18n } from '@/utils/i18n'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(import.meta.glob('./locale/*.json', { eager: true }))

;(async () => {
  const parsed = z
    .object({
      // Required parameters
      blocks: sz.array(sz.string(), ';'),
      structure: sz.string().default('+'),
      blockStates: sz.array(sz.string(), ';'),
      models: sz.array(sz.string(), ';'),
      textureAtlas: sz.array(sz.string(), ';'),
      renderTypes: sz.array(sz.string(), ';'),
      occlusionShapes: sz.array(sz.string(), ';'),
      specialBlocksData: sz.array(sz.string(), ';'),
      liquidComputationData: sz.array(sz.string(), ';'),
      // Additional render object
      marks: sz.array(sz.string(), ';'),
      // Default options
      cameraPosData: sz.array(sz.string(), ';').default([]),
      orthographic: sz.boolean().default(false),
      animatedTexture: sz.boolean().default(true),
      showInvisibleBlocks: sz.boolean().default(false),
      displayMarks: sz.boolean().default(true),
      backgroundColor: sz.string().default('#ffffff'),
      backgroundAlpha: sz.number().default(255),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  vue
    .createApp(App, {
      ...params,
      orthographicDefault: params.orthographic,
      animatedTextureDefault: params.animatedTexture,
      showInvisibleBlocksDefault: params.showInvisibleBlocks,
      displayMarksDefault: params.displayMarks,
      backgroundColorDefault: params.backgroundColor,
      backgroundAlphaDefault: params.backgroundAlpha,
    })
    .use(i18n)
    .directive('tooltip', CdxTooltip)
    .mount(targetEl)
})()
