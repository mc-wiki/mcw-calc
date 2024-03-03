const FALLBACK_CHAIN = {
  fr: ['fr-fr', 'en'],
  zh: ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
  'zh-hans': ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
  'zh-cn': ['zh-tw', 'zh-hk', 'en'],
  'zh-hant': ['zh-tw', 'zh-hk', 'zh-cn', 'en'],
  'zh-tw': ['zh-hk', 'zh-cn', 'en'],
  'zh-hk': ['zh-tw', 'zh-cn', 'en'],
  default: ['en'],
}
const MESSAGES_LOCAL = ['en']
const USE_PAGE_CONTENT_LANGUAGE = ['zh']

const contentLanguage = mw.config.get('wgContentLanguage')
const pageContentLanguage = mw.config.get('wgPageContentLanguage')
const resolvedLanguage = USE_PAGE_CONTENT_LANGUAGE.includes(contentLanguage)
  ? pageContentLanguage
  : contentLanguage

export function useI18n<K extends string>(
  toolName: string,
  localMessages: Record<string, Record<K, string>>,
) {
  const messages = resolveFallback(toolName, localMessages)

  for (const [key, value] of Object.entries(messages)) {
    mw.messages.set(key, value)
  }

  return {
    t: (key: K, ...parameters: any[]) => mw.msg(key, ...parameters),
    message: (key: string, parameters?: any[] | undefined) =>
      new mw.Message(mw.messages, key, parameters),
    messagesMap: messages,
    language: mw.language,
  }
}

function resolveFallback(
  toolName: string,
  localMessages: Record<string, Record<string, string>>,
): Record<string, string> {
  const messages = findMessages(resolvedLanguage, toolName, localMessages) as Record<string, string>
  const fallbackChain = isKeyOfObject(resolvedLanguage, FALLBACK_CHAIN)
    ? FALLBACK_CHAIN[resolvedLanguage]
    : FALLBACK_CHAIN.default

  const fallbackMessages = fallbackChain.map((fallback) =>
    findMessages(fallback, toolName, localMessages),
  )

  for (const dictionary of fallbackMessages) {
    for (const [key, value] of Object.entries(dictionary)) {
      if (!isKeyOfObject(key, messages)) {
        messages[key] = value
      }
    }
  }

  return messages
}

function findMessages(
  language: string,
  toolName: string,
  localMessages: Record<string, Record<string, string>>,
) {
  if (MESSAGES_LOCAL.includes(resolvedLanguage)) {
    return localMessages[language]
  } else {
    if (process.env.NODE_ENV == 'development') {
      return {}
    }

    let json
    try {
      json = __non_webpack_require__<Record<string, Record<string, string>>>(
        `./mcw-calc-${toolName}-locales.json`,
      )
    } catch {
      json = {}
      console.warn(`${toolName} is missing messages for ${language}.`)
    }

    return isKeyOfObject(language, json) ? json[language] : {}
  }
}

function isKeyOfObject<T extends object>(key: string | number | symbol, obj: T): key is keyof T {
  // Type guard
  return key in obj
}
