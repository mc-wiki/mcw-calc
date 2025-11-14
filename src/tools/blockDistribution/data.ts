import colorMap from './block_colors.json'
import overworldData from './overworld_block_count.json'
import endData from './the_end_block_count.json'
import netherData from './the_nether_block_count.json'

const colorSchemeLight = [
  '#C62828',
  '#C2185B',
  '#512DA8',
  '#AA00FF',
  '#5E35B1',
  '#3949AB',
  '#304FFE',
  '#1565C0',
  '#01579B',
  '#006064',
  '#00796B',
  '#1B5E20',
  '#33691E',
  '#F57F17',
  '#E65100',
  '#BF360C',
  '#6D4C41',
  '#424242',
  '#546E7A',
]

const colorSchemeDark = [
  '#F44336',
  '#FF5252',
  '#EC407A',
  '#BA68C8',
  '#E040FB',
  '#9575CD',
  '#7986CB',
  '#B388FF',
  '#42A5F5',
  '#8C9EFF',
  '#81D4FA',
  '#448AFF',
  '#4DD0E1',
  '#40C4FF',
  '#18FFFF',
  '#80CBC4',
  '#64FFDA',
  '#81C784',
  '#69F0AE',
  '#AED581',
  '#B2FF59',
  '#DCE775',
  '#EEFF41',
  '#FFF59D',
  '#FFEE58',
  '#FFCC80',
  '#FF8A65',
  '#BCAAA4',
  '#E0E0E0',
  '#B0BEC5',
]

function hashCode(s: string) {
  let h = 0
  let i = 0
  const l = s.length
  if (l > 0) {
    while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0
  }
  return h
}

export interface Block {
  block: string
  count: number
  pos: number
}

export const overworldBlockMap = generateBlockMap(
  overworldData.block,
  overworldData.chunkCount,
  -64,
  255,
)
export const netherBlockMap = generateBlockMap(netherData.block, netherData.chunkCount, 0, 130)
export const endBlockMap = generateBlockMap(endData.block, endData.chunkCount, 0, 255)

export function computeColors(blocks: string[], theme: string) {
  const themeColors = theme === 'light' ? colorSchemeLight : colorSchemeDark
  const candidateColors: string[] = []
  const forceColors = colorMap as Record<string, string>

  const nextColor = (key: string) => {
    key = key.split(':')[1] || key
    if (forceColors[key]) return `#${forceColors[key]}`
    if (!candidateColors.length) candidateColors.push(...themeColors)
    const index = Math.abs(hashCode(key)) % candidateColors.length
    return candidateColors.splice(index, 1)[0]
  }

  return new Map(blocks.map((block) => [block, nextColor(block)]))
}

function generateBlockMap(
  data: Record<string, number[]>,
  totalChunks: number,
  offset: number,
  cutoff: number,
) {
  const blockMap: Block[] = []
  for (const key in data) {
    for (const [index, count] of data[key].entries()) {
      const pos = index + offset
      if (pos > cutoff) break
      blockMap.push({
        block: `minecraft:${key}`,
        // number of X found in 100,000 blocks
        count: (count / (totalChunks * 256)) * 100000,
        pos,
      })
    }
  }

  return blockMap
}
