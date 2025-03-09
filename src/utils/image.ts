import { parentOrigin } from './iframe'

export function getImageLink(image: string, original: boolean = false) {
  const origin = image.startsWith('en:') ? 'https://minecraft.wiki' : parentOrigin()
  const normalized = image
    .replace(/^en:/, '')
    .replace(/^File:/, '')
    .replace(/ /g, '_')

  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  const query = original ? '?format=original' : ''
  return `${origin}/images/${encodeURIComponent(capitalized)}${query}`
}
