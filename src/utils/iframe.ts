export function parentOrigin(): string {
  const paramUrl = new URLSearchParams(window.location.hash.substring(2)).get('url')

  return new URL(paramUrl || document.referrer || location.href).origin
}
