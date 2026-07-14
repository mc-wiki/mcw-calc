import { createI18n } from 'vue-i18n'
import DOMPurify from 'dompurify'
import { parentOrigin } from '../iframe'

const FALLBACK_CHAIN = new Map(
  Object.entries({
    zh: ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
    'zh-hans': ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
    'zh-cn': ['zh-tw', 'zh-hk', 'en'],
    'zh-hant': ['zh-tw', 'zh-hk', 'zh-cn', 'en'],
    'zh-tw': ['zh-hk', 'zh-cn', 'en'],
    'zh-hk': ['zh-tw', 'zh-cn', 'en'],
    lzh: ['zh-tw', 'zh-hk', 'zh-cn', 'en'],
    default: ['en'],
  }),
)

export function createMcwI18n(files: Record<string, { default: Record<string, string> }>[]) {
  const locale =
    new URLSearchParams(window.location.hash.substring(2)).get('locale') ??
    window.navigator.language.split('-')[0]
  const fallback = FALLBACK_CHAIN.get(locale) ?? FALLBACK_CHAIN.get('default')!
  console.log('locale:', locale, 'fallback:', fallback)

  const messages: Record<string, Record<string, string>> = {}
  for (const file of files) {
    for (const [path, content] of Object.entries(file)) {
      const localeName = path.match(/([a-z-]+)\.json/)![1]
      messages[localeName] = Object.assign(messages[localeName] ?? {}, content.default)
    }
  }

  console.log('messages:', messages)

  const finalI18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: fallback,
    messages,
    warningHtmlInMessage: 'off',
  })

  return finalI18n
}

export function parseWikitext(wikitext: string) {
  console.log('wikitext before parsing:', wikitext)
  // convert ''italic'' or '''bold''' to <i>italic</i> or <b>bold</b>
  wikitext = wikitext.replace(/'''''(.*?)'''''/g, '<b><i>$1</i></b>')
  wikitext = wikitext.replace(/'''(.*?)'''/g, '<b>$1</b>')
  wikitext = wikitext.replace(/''(.*?)''/g, '<i>$1</i>')

  console.log('wikitext after parsing:', wikitext)

  // convert [[wiki links]] or [[wiki links|with text]]
  // to <a href="/w/wiki links">with text</a>
  wikitext = wikitext.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, link, text) =>
      `<a href="${parentOrigin()}/w/${encodeURIComponent(link)}">${text ?? link}</a>`,
  )
  console.log('wikitext after parsing:', wikitext)

  return DOMPurify.sanitize(wikitext, {
    ALLOWED_TAGS: [
      'a',
      'abbr',
      'b',
      'br',
      'caption',
      'i',
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
      'p',
      'code',
      'kbd',
      'pre',
    ],
    ALLOWED_ATTR: [
      'href',
      'id',
      'class',
      'style',
      'title',
      'target',
      'rel',
      'lang',
      'dir',
      'tabindex',
    ],
  })
}
