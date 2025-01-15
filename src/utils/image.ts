export function wikiImg(name: string): string {
  name = name.charAt(0).toUpperCase() + name.slice(1)
  name = name.replace(/ /g, '_')
  return `https://minecraft.wiki/images/${name}.png?format=original`
}
