import App from '@/tools/blockStructureRenderer/App.vue'
import { createMcwI18n } from '@/utils/i18n'
import { fetchJigsawAPI } from '@/utils/jigsaw.ts'
import { getParams, handleParseError, sz } from '@/utils/params.ts'
import * as vue from 'vue'
import { z } from 'zod'
import '@/init'

const targetEl = document.querySelector('#app')!

const i18n = createMcwI18n(
  import.meta.glob('../blockStructureRenderer/locale/*.json', { eager: true }),
)

;(async () => {
  const parsed = z
    .object({
      id: sz.string(),
      variant: sz.number().int().min(0).default(0),

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

  let data
  try {
    data = await (
      await fetchJigsawAPI(`structure?id=${params.id}&variant=${params?.variant ?? 0}`)
    ).json()
  } catch (e) {
    data = {
      resolved: false,
      errorMessage: typeof e === 'string' ? e : (e as Error).message,
    }
  }

  if (data.resolved) {
    const nameMapper = data.data.blocks as Record<string, string>
    const structure = data.data.structure as string
    vue
      .createApp(App, {
        blocks: Object.entries(nameMapper).map((v) => `${v[0]}=${v[1]}`),
        structure,
        marks: [],
        ...params,
        orthographicDefault: params.orthographic,
        animatedTextureDefault: params.animatedTexture,
        showInvisibleBlocksDefault: params.showInvisibleBlocks,
        displayMarksDefault: params.displayMarks,
        backgroundColorDefault: params.backgroundColor,
        backgroundAlphaDefault: params.backgroundAlpha,
      })
      .use(i18n)
      .mount(targetEl)
  } else {
    const errorEl = document.createElement('ul')
    errorEl.id = 'error'
    errorEl.style.color = 'red'
    errorEl.innerHTML = '<h2 style="margin: 0">Structure Data Fetching Failed</h2>'
    const li = document.createElement('li')
    li.textContent = data.errorMessage as string
    errorEl.appendChild(li)
    targetEl.appendChild(errorEl)
  }
})()
