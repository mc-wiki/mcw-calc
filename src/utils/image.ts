import { parentOrigin } from './iframe'

export function getImageLink(image: string, original: boolean = false) {
  const hasPrefix =
    image.split(':', 2).length === 2 && image.split(':', 2)[0].toLowerCase() !== 'file'
  const origin = hasPrefix ? `https://${image.split(':', 2)[0]}.minecraft.wiki` : parentOrigin()

  const normalized = image.replace(/.*?:/g, '').replace(/ /g, '_')

  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  const query = original ? '?format=original' : ''
  return `${origin}/images/${encodeURIComponent(capitalized)}${query}`
}

export function getRedirectedImageLink(image: string, original: boolean = false) {
  const hasPrefix =
    image.split(':', 2).length === 2 && image.split(':', 2)[0].toLowerCase() !== 'file'
  const origin = hasPrefix ? `https://${image.split(':', 2)[0]}.minecraft.wiki` : parentOrigin()

  const normalized = image.replace(/.*?:/g, '').replace(/ /g, '_')

  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  const query = original ? '?format=original' : ''
  return `${origin.replace(/^en:/, '')}/Special:Redirect/file/${encodeURIComponent(capitalized)}${query}`
}
