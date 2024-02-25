export default function getParams<K extends string>(
  targetEl: Element,
  params: K[],
  defaults?: Record<K, string>,
): Map<K, string | undefined> {
  const result = new Map<K, string | undefined>()

  for (const param of params) {
    const paramEl = targetEl.querySelector(`.mcw-calc-parameter[data-name="${param}"]`)
    if (paramEl) result.set(param, paramEl.innerHTML)
    else {
      const dataAttribute = targetEl.getAttribute(`data-${param}`)
      if (dataAttribute) result.set(param, dataAttribute)
      else if (defaults) result.set(param, defaults[param])
      else {
        result.set(param, undefined)
        console.warn(`Param ${param} is not set and no default is provided.`)
      }
    }
  }

  return result
}
