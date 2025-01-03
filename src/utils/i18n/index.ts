import { createI18n } from 'vue-i18n'
import { parentOrigin } from '../iframe'

const FALLBACK_CHAIN = new Map(
  Object.entries({
    zh: ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
    'zh-hans': ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
    'zh-cn': ['zh-tw', 'zh-hk', 'en'],
    'zh-hant': ['zh-tw', 'zh-hk', 'zh-cn', 'en'],
    'zh-tw': ['zh-hk', 'zh-cn', 'en'],
    'zh-hk': ['zh-tw', 'zh-cn', 'en'],
    default: ['en'],
  }),
)

export function createMcwI18n(files: Record<string, { default: Record<string, string> }>) {
  const globalFiles: Record<string, { default: Record<string, string> }> = import.meta.glob(
    '@/globalLocale/*.json',
    { eager: true },
  )

  const locale =
    new URLSearchParams(window.location.hash.substring(2)).get('locale') ??
    window.navigator.language.split('-')[0]
  const fallback = FALLBACK_CHAIN.get(locale) ?? FALLBACK_CHAIN.get('default')!
  console.log('locale:', locale, 'fallback:', fallback)

  const globalMessages: Record<string, Record<string, string>> = Object.fromEntries(
    Object.entries(globalFiles).map(([path, value]) => [
      path.match(/([a-z-]+)\.json/)![1],
      value.default,
    ]),
  )

  const messages: Record<string, Record<string, string>> = Object.fromEntries(
    Object.entries(files).map(([path, value]) => [
      path.match(/([a-z-]+)\.json/)![1],
      value.default,
    ]),
  )

  for (const [key, value] of Object.entries(messages)) {
    if (globalMessages[key]) {
      Object.assign(value, globalMessages[key])
    }
  }

  const finalI18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: fallback,
    messages,
  })

  return finalI18n
}

export function parseWikitext(wikitext: string) {
  // convert ''italic'' or '''bold''' to <i>italic</i> or <b>bold</b>
  wikitext = wikitext.replace(/'''''(.*?)'''''/g, '<b><i>$1</i></b>')
  wikitext = wikitext.replace(/'''(.*?)'''/g, '<b>$1</b>')
  wikitext = wikitext.replace(/''(.*?)''/g, '<i>$1</i>')

  // convert [[wiki links]] or [[wiki links|with text]]
  // to <a href="/w/wiki links">with text</a>
  wikitext = wikitext.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, link, text) =>
      `<a href="${parentOrigin()}/w/${encodeURIComponent(link)}">${text ?? link}</a>`,
  )

  // Escape HTML tags except those in whitelist
  const whitelisted = [
    'a',
    'b',
    'i',
    'br',
    'div',
    'span',
    'strong',
    'em',
    'u',
    's',
    'sub',
    'sup',
    'del',
    'ins',
  ]
  wikitext = wikitext.replace(/<([^>]+)>/g, (match, tag: string) => {
    const [tagNameRaw] = tag.split(/\s+/)
    const tagName = tagNameRaw.toLowerCase().replace(/^\//, '')
    if (whitelisted.includes(tagName)) {
      return match
    }
    return `&lt;${tag}&gt;`
  })

  return wikitext
}
