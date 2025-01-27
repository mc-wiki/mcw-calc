import type { SafeParseReturnType } from 'zod'
import { postMessageParent } from './iframe'

import * as sz from './sz'
export { sz }

export function getParams(): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    postMessageParent('mcw-calc-init-request-data', {})

    const fromSearch = Object.fromEntries(new URLSearchParams(window.location.search))
    for (const [key, value] of Object.entries(fromSearch)) {
      fromSearch[key] = kebabToCamel(value)
    }

    if (!new URLSearchParams(window.location.hash.substring(2)).has('id')) resolve(fromSearch)
    window.addEventListener('message', (event) => {
      if (event.data.type !== 'mcw-calc-init') return

      const source: {
        innerHTML?: string
        dataset?: Record<string, string>
      } = event.data.data

      const targetEl = source.innerHTML
        ? new DOMParser().parseFromString(source.innerHTML, 'text/html').body
        : null

      const result = Object.assign(fromSearch, source.dataset)

      targetEl?.querySelectorAll('.mcw-calc-parameter').forEach((el) => {
        const param = (el as HTMLElement).dataset.name
        if (param) result[kebabToCamel(param)] = el.innerHTML
      })

      resolve(result)
    })
  })
}

function kebabToCamel(str: string) {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

export function handleParseError<I, O>(returnValue: SafeParseReturnType<I, O>, targetEl: Element) {
  if (returnValue.error) {
    const errorEl = document.createElement('ul')
    errorEl.id = 'error'
    errorEl.style.color = 'red'

    errorEl.innerHTML = '<h2 style="margin: 0">oopsie detected!!!!</h2>'

    for (const issue of returnValue.error.issues) {
      const path = issue.path.join('.')
      const li = document.createElement('li')
      li.innerHTML = `<details>
                        <summary>
                          <code>${sanitize(path)}</code>: ${sanitize(issue.message)} (<code>${sanitize(issue.code)}</code>)
                        </summary>
                        <pre>${sanitize(returnValue.error.message)}</pre>
                      </details>`
      errorEl.appendChild(li)
    }

    targetEl.appendChild(errorEl)
    throw returnValue.error
  }

  return returnValue.data
}

export function sanitize(text: string) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
