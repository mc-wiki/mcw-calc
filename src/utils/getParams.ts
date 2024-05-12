export default function getParams<K extends string>(
  params: K[],
  defaults?: Record<K, string>,
): Map<K, string | undefined> {
  const targetEl = window.frameElement
  const query = new URLSearchParams(window.location.search)
  const result = new Map<K, string | undefined>()

  for (const param of params) {
    const paramEl = targetEl?.querySelector(`.mcw-calc-parameter[data-name="${param}"]`)
    const dataAttribute = targetEl?.getAttribute(`data-${param}`)
    const queryParam = query.get(param)

    if (paramEl) result.set(param, paramEl.innerHTML)
    else if (dataAttribute !== null && dataAttribute !== undefined) result.set(param, dataAttribute)
    else if (queryParam !== null) result.set(param, queryParam)
    else if (defaults && param in defaults) result.set(param, defaults[param])
    else {
      result.set(param, undefined)
      console.warn(`Param ${param} is not set and no default is provided.`)
    }
  }

  return result
}
