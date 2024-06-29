export function parentOrigin(): string {
  const paramOrigin = new URLSearchParams(window.location.hash.substring(2)).get('origin')
  if (paramOrigin) return paramOrigin

  return new URL(document.referrer || location.href).origin
}
