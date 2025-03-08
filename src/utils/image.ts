import { parentOrigin } from './iframe'

export function getImageLink(image: string) {
  const origin = image.startsWith('en:') ? 'https://minecraft.wiki' : parentOrigin()
  const normalized = image
    .replace(/^en:/, '')
    .replace(/^File:/, '')
    .replace(/ /g, '_')

  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1)
  return `${origin}/images/${encodeURIComponent(capitalized)}?format=original`
}
