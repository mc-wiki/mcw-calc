export default function getParams<K extends string>(
  params: K[],
  defaults?: Record<K, string>,
): Promise<Map<K, string | undefined>> {
  return new Promise((resolve) => {
    window.parent.postMessage(
      {
        type: 'mcw-calc-init-request-data',
        data: {
          id: new URLSearchParams(window.location.hash.substring(2)).get('id'),
        },
      },
      '*',
    )

    if (new URLSearchParams(window.location.hash.substring(2)).has('id')) {
      window.addEventListener('message', (event) => {
        if (event.data.type !== 'mcw-calc-init') return

        const source: {
          innerHTML?: string
          dataset?: Record<string, string>
        } = event.data.data

        const targetEl = source.innerHTML
          ? new DOMParser().parseFromString(source.innerHTML, 'text/html').body
          : null

        const result = fromSearchDefault(params, defaults)

        for (const param of params) {
          const camelCaseParam = kebabCaseToCamelCase(param)

          const paramEl = targetEl?.querySelector(`.mcw-calc-parameter[data-name="${param}"]`)
          const dataAttribute = source.dataset?.[camelCaseParam]
          if (paramEl) result.set(param, paramEl.innerHTML)
          else if (dataAttribute !== null && dataAttribute !== undefined)
            result.set(param, dataAttribute)
        }

        resolve(result)
      })
    } else {
      resolve(fromSearchDefault(params, defaults))
    }
  })
}

function fromSearchDefault<K extends string>(
  params: K[],
  defaults?: Record<K, string>,
): Map<K, string | undefined> {
  const query = new URLSearchParams(window.location.search)
  const result = new Map<K, string | undefined>()

  for (const param of params) {
    const queryParam = query.get(param)

    if (queryParam !== null) result.set(param, queryParam)
    else if (defaults && param in defaults) result.set(param, defaults[param])
    else {
      result.set(param, undefined)
      console.warn(`Param ${param} is not set and no default is provided.`)
    }
  }

  return result
}

function kebabCaseToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}
