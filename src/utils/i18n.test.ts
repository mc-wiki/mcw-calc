import { describe, expect, it, vi } from 'vitest'
import { createMcwI18n, parseWikitext } from './i18n'

describe('parseWikitext', () => {
  it('should convert italic and bold tags', () => {
    const wikitext = "''italic'' '''bold'''"
    const expected = '<i>italic</i> <b>bold</b>'
    expect(parseWikitext(wikitext)).toBe(expected)
  })

  it('should convert wiki links', () => {
    const wikitext = '[[wiki links]] [[wiki links|with text]]'
    const expected =
      '<a href="http://localhost:3000/w/wiki%20links">wiki links</a> <a href="http://localhost:3000/w/wiki%20links">with text</a>'
    expect(parseWikitext(wikitext)).toBe(expected)
  })

  it('should convert nested tags', () => {
    const wikitext = "'''''italic and bold'''''''italic''"
    const expected = '<b><i>italic and bold</i></b><i>italic</i>'
    expect(parseWikitext(wikitext)).toBe(expected)
  })

  it('should escape HTML tags except those in whitelist', () => {
    const wikitext = '<link href="http://example.com">Link</link> <script>alert("XSS")</script>'
    const expected =
      '&lt;link href="http://example.com"&gt;Link&lt;/link&gt; &lt;script&gt;alert("XSS")&lt;/script&gt;'
    expect(parseWikitext(wikitext)).toBe(expected)
  })

  it('should not escape whitelisted tags', () => {
    const wikitext = '<a href="http://example.com">Link</a> <b>Bold</b>'
    const expected = '<a href="http://example.com">Link</a> <b>Bold</b>'
    expect(parseWikitext(wikitext)).toBe(expected)
  })
})

describe('createMcwI18n', () => {
  it('should return an instance of vue-i18n', () => {
    const files = {
      'en.json': { default: { greeting: 'Hello' } },
      'fr.json': { default: { greeting: 'Bonjour' } },
    }
    const i18n = createMcwI18n(files).global
    expect(i18n).toBeDefined()
    expect(i18n.locale.value).toBe('en')
    expect(i18n.fallbackLocale.value).toStrictEqual(['en'])
    expect(i18n.messages.value).toEqual({
      en: { greeting: 'Hello' },
      fr: { greeting: 'Bonjour' },
    })
  })

  it('should use the locale from URL if available', () => {
    const files = {
      'en.json': { default: { greeting: 'Hello' } },
      'fr.json': { default: { greeting: 'Bonjour' } },
    }
    vi.stubGlobal('location', { hash: '#?locale=fr' })
    const i18n = createMcwI18n(files).global
    expect(i18n.locale.value).toBe('fr')
    expect(i18n.fallbackLocale.value).toStrictEqual(['en'])
    vi.unstubAllGlobals()
  })

  it('should use the fallback locale if URL locale is not available', () => {
    const files = {
      'en.json': { default: { greeting: 'Hello' } },
      'fr.json': { default: { greeting: 'Bonjour' } },
    }
    vi.stubGlobal('location', { hash: '#?locale=es' })
    const i18n = createMcwI18n(files).global
    expect(i18n.locale.value).toBe('es')
    expect(i18n.fallbackLocale.value).toStrictEqual(['en'])
    expect(i18n.t('greeting')).toBe('Hello')
    vi.unstubAllGlobals()
  })

  it('should use the locale from the browser if no URL locale is available', () => {
    const files = {
      'en.json': { default: { greeting: 'Hello' } },
      'fr.json': { default: { greeting: 'Bonjour' } },
    }
    vi.stubGlobal('location', { hash: '' })
    vi.stubGlobal('navigator', { language: 'fr-FR' })
    const i18n = createMcwI18n(files).global
    expect(i18n.locale.value).toBe('fr')
    expect(i18n.fallbackLocale.value).toStrictEqual(['en'])
    vi.unstubAllGlobals()
  })

  it('should use the default locale if no locale is specified', () => {
    const files = {
      'en.json': { default: { greeting: 'Hello' } },
      'fr.json': { default: { greeting: 'Bonjour' } },
    }
    vi.stubGlobal('location', { hash: '' })
    const i18n = createMcwI18n(files).global
    expect(i18n.locale.value).toBe('en')
    expect(i18n.fallbackLocale.value).toStrictEqual(['en'])
    vi.unstubAllGlobals()
  })

  it('should resolve complex fallback for Chinese', () => {
    const files = {
      'en.json': { default: { audio: 'Audio', video: 'Video' } },
      'zh-cn.json': { default: { audio: '音频', batchFile: '批处理文件' } },
      'zh-tw.json': { default: { audio: '音訊', batchFile: '批次檔' } },
      'zh-hk.json': { default: { audio: '音頻' } },
    }
    vi.stubGlobal('location', { hash: '#?locale=zh-hk' })
    const i18n = createMcwI18n(files).global
    expect(i18n.locale.value).toBe('zh-hk')
    expect(i18n.fallbackLocale.value).toStrictEqual(['zh-tw', 'zh-cn', 'en'])
    expect(i18n.t('audio')).toBe('音頻')
    expect(i18n.t('batchFile')).toBe('批次檔')
    expect(i18n.t('video')).toBe('Video')
    vi.unstubAllGlobals()
  })
})
