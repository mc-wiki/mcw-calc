import { parentOrigin } from '@/utils/iframe'
import { getParams, handleParseError, sz } from '@/utils/params'
import { z } from 'zod'
import '@/init'

const targetEl = document.querySelector('#app')!

;(async () => {
  const parsed = z
    .object({
      pattern: z.string().default(`x = 8, y = 3, rule = B3/S23
bo3b3o$b3o2bo$2bo!`),
    })
    .safeParse(await getParams())

  const params = handleParseError(parsed, targetEl)

  targetEl.querySelector('textarea').textContent = params.pattern

  await import('./lv-viewer.js')
})()
