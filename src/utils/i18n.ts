const FALLBACK_CHAIN = {
  zh: ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
  'zh-hans': ['zh-cn', 'zh-tw', 'zh-hk', 'en'],
  'zh-cn': ['zh-tw', 'zh-hk', 'en'],
  'zh-hant': ['zh-tw', 'zh-hk', 'zh-cn', 'en'],
  'zh-tw': ['zh-hk', 'zh-cn', 'en'],
  'zh-hk': ['zh-tw', 'zh-cn', 'en'],
  default: ['en'],
}
const MESSAGES_LOCAL = ['en']
const MESSAGES_PAGE = ['zh']

const contentLanguage = mw.config.get('wgContentLanguage')
const pageContentLanguage = mw.config.get('wgPageContentLanguage')
const resolvedLanguage = MESSAGES_PAGE.includes(contentLanguage)
  ? pageContentLanguage
  : contentLanguage

export function useI18n(toolName: string, localMessages: Record<string, Record<string, string>>) {
  const messages = resolveFallback(toolName, localMessages)

  for (const [key, value] of Object.entries(messages)) {
    mw.messages.set(key, value)
  }

  return {
    t: mw.message,
    message: (key: string, parameters?: any[] | undefined) =>
      new mw.Message(mw.messages, key, parameters),
    messagesMap: messages,
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
    const json =
      process.env.NODE_ENV == 'production'
        ? __non_webpack_require__<Record<string, Record<string, string>>>(
            `./mcw-calc-${__webpack_runtime_id__}-locales.json`,
          )
        : {}

    return isKeyOfObject(language, json) ? json[language] : {}
  }
}

function isKeyOfObject<T extends object>(key: string | number | symbol, obj: T): key is keyof T {
  // Type guard
  return key in obj
}
