import { z } from 'zod'
import { getParams, handleParseError } from '@/utils/params'
import '@/init'

const targetEl = document.querySelector('#app')!
const iframe = document.querySelector<HTMLIFrameElement>('#lifeviewer')!

const EMBED_ORIGIN = 'https://mc-wiki.github.io'
const EMBED_URL = `${EMBED_ORIGIN}/lifeviewer/`

;(async () => {
  const parsed = z
    .object({
      pattern: z.string().default(`x = 8, y = 3, rule = B3/S23
bo3b3o$b3o2bo$2bo!`),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  window.addEventListener('message', (event) => {
    if (event.origin !== EMBED_ORIGIN) return
    if (event.source !== iframe.contentWindow) return
    if (event.data?.type !== 'lifeviewer-ready') return

    iframe.contentWindow?.postMessage(
      { type: 'lifeviewer-pattern', pattern: params.pattern },
      EMBED_ORIGIN,
    )
  })

  iframe.src = EMBED_URL
})()
