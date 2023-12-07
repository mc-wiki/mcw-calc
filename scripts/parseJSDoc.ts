export default function parseJSDoc(file: string) {
  const jsdoc = file.match(/\/\*\*\n(( \*.*\n)+) \*\//s)![1]
  const lines = jsdoc.split('\n')
  const result: Record<string, string> = {}
  let key = ''
  for (const line of lines) {
    if (line.startsWith(' * @')) {
      const [k, v] = (
        line.slice(4).match(/^(.+?) (.+)$/)! ?? [
          undefined,
          line.slice(4),
          'true',
        ]
      ).slice(1)
      if (k in result) result[k] = `${result[k]}, ${v}`
      result[k] = v
    } else if (line.startsWith(' * ')) {
      key += line.slice(3)
    } else if (line.startsWith(' */')) {
      result['description'] = key
    }
  }
  return result
}
