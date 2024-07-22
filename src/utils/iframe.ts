export function parentOrigin(): string {
  const paramUrl = new URLSearchParams(window.location.hash.substring(2)).get('url')

  return new URL(paramUrl || document.referrer || location.href).origin
}

export function parentUrl(): URL {
  const paramUrl = new URLSearchParams(window.location.hash.substring(2)).get('url')

  return new URL(paramUrl || document.referrer || location.href)
}

export function isEmbedded() {
  try {
    return window.self !== window.top
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (_e) {
    return true
  }
}

export function postMessageParent(type: string, data: any) {
  const id = new URLSearchParams(window.location.hash.substring(2)).get('id')
  window.parent.postMessage({ type, id, data }, '*')
}
