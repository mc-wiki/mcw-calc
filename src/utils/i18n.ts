import { createI18n } from 'vue-i18n'
import { parentOrigin } from './iframe'

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
  const locale =
    new URLSearchParams(window.location.hash.substring(2)).get('locale') ??
    window.navigator.language.split('-')[0]
  const fallback = FALLBACK_CHAIN.get(locale) ?? FALLBACK_CHAIN.get('default')!
  console.log('locale:', locale, 'fallback:', fallback)

  const messages: Record<string, Record<string, string>> = Object.fromEntries(
    Object.entries(files).map(([path, value]) => [
      path.match(/([a-z-]+)\.json/)![1],
      value.default,
    ]),
  )

  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: fallback,
    messages,
  })
}

export function parseWikitext(wikitext: string) {
  // convert ''italic'' or '''bold''' to <i>italic</i> or <b>bold</b>
  wikitext = wikitext.replace(/'''''(.*?)'''''/g, '<b><i>$1</i></b>')
  wikitext = wikitext.replace(/'''(.*?)'''/g, '<b>$1</b>')
  wikitext = wikitext.replace(/''(.*?)''/g, '<i>$1</i>')

  // convert [[wiki links]] or [[wiki links|with text]]
  // to <a href="/w/wiki links">with text</a>
  return wikitext.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, link, text) =>
      `<a href="${parentOrigin()}/w/${encodeURIComponent(link)}">${text ?? link}</a>`,
  )
}
