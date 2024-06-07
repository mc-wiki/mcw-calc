export function parentOrigin() {
  return new URL(document.referrer).origin
}
