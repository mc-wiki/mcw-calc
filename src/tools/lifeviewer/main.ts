import { z } from 'zod'
import { getParams, handleParseError } from '@/utils/params'
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

  const textArea = targetEl.querySelector('textarea')
  if (textArea) {
    textArea.textContent = params.pattern
  }
})()
