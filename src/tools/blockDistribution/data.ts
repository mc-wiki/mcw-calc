import { theme } from '@/utils/theme'
import overworldData from './overworld_block_count.json'
import endData from './the_end_block_count.json'
import netherData from './the_nether_block_count.json'

const colorMap = JSON.parse(`{
"black_carpet":"141519",
"black_glazed_terracotta":"27272E",
"black_wall_banner":"141519",
"black_wool":"141519",
"blue_bed":"35399D",
"blue_carpet":"35399D",
"blue_ice":"74A7FD",
"blue_orchid":"2FA2A8",
"blue_terracotta":"4A3B5B",
"blue_wool":"35399D",
"brain_coral":"CF5B9F",
"brain_coral_block":"CF5B9F",
"brain_coral_fan":"CF5B9F",
"brain_coral_wall_fan":"CF5B9F",
"brown_carpet":"724728",
"brown_mushroom":"99745C",
"brown_mushroom_block":"956F51",
"brown_stained_glass":"664C32",
"brown_stained_glass_pane":"664C33",
"brown_terracotta":"4D3323",
"brown_wall_banner":"724728",
"brown_wool":"724728",
"bubble_coral":"A51AA2",
"bubble_coral_block":"A51AA2",
"bubble_coral_fan":"A51AA2",
"bubble_coral_wall_fan":"A51AA2",
"cyan_bed":"158991",
"cyan_carpet":"158991",
"cyan_glazed_terracotta":"474F52",
"cyan_terracotta":"565B5B",
"cyan_wool":"158991",
"dead_brain_coral_block":"7C7572",
"dead_bubble_coral_block":"837B77",
"dead_bush":"6B4E28",
"dead_fire_coral_block":"837B77",
"dead_horn_coral_block":"857E7A",
"dead_tube_coral_block":"827B77",
"fire_coral":"A3232E",
"fire_coral_block":"A3232E",
"fire_coral_fan":"A3232E",
"fire_coral_wall_fan":"A3232E",
"gray_carpet":"3E4447",
"gray_terracotta":"392A23",
"gray_wall_banner":"3E4447",
"gray_wool":"3E4447",
"green_bed":"546D1B",
"green_carpet":"546D1B",
"green_wool":"546D1B",
"horn_coral":"D8C742",
"horn_coral_block":"D8C742",
"horn_coral_fan":"D8C742",
"horn_coral_wall_fan":"D8C742",
"light_blue_carpet":"3AAFD9",
"light_blue_glazed_terracotta":"4DB9DD",
"light_blue_terracotta":"716C89",
"light_blue_wool":"3AAFD9",
"light_gray_carpet":"8E8E86",
"light_gray_glazed_terracotta":"CCD0D2",
"light_gray_terracotta":"876A61",
"light_gray_wall_banner":"8E8E86",
"light_gray_wool":"8E8E86",
"lime_bed":"70B919",
"lime_carpet":"70B919",
"lime_glazed_terracotta":"A2C537",
"lime_terracotta":"677534",
"lime_wool":"70B919",
"magenta_carpet":"BD44B3",
"magenta_stained_glass":"B24CD8",
"magenta_wall_banner":"BD44B3",
"orange_bed":"F07613",
"orange_carpet":"F07613",
"orange_glazed_terracotta":"9A935B",
"orange_stained_glass_pane":"D87F33",
"orange_terracotta":"A15325",
"orange_tulip":"5D8E1E",
"orange_wool":"F07613",
"pink_carpet":"ED8DAC",
"pink_petals":"FCCBE7",
"pink_tulip":"639D4E",
"purple_bed":"792AAC",
"purple_carpet":"792AAC",
"purple_glazed_terracotta":"6D3098",
"red_bed":"A02722",
"red_carpet":"A02722",
"red_mushroom":"D84B43",
"red_mushroom_block":"C82E2D",
"red_sand":"BE6621",
"red_sandstone":"BA631D",
"red_terracotta":"8F3D2E",
"red_tulip":"598020",
"red_wool":"A02722",
"tube_coral":"3157CE",
"tube_coral_block":"3157CE",
"tube_coral_fan":"3157CE",
"tube_coral_wall_fan":"3157CE",
"white_bed":"E9ECEC",
"white_candle":"E0E5E5",
"white_carpet":"E9ECEC",
"white_glazed_terracotta":"BCD4CA",
"white_stained_glass_pane":"FFFFFF",
"white_terracotta":"D1B2A1",
"white_tulip":"5DA447",
"white_wall_banner":"E9ECEC",
"white_wool":"E9ECEC",
"yellow_bed":"F8C527",
"yellow_carpet":"F8C527",
"yellow_glazed_terracotta":"EAC058",
"yellow_stained_glass_pane":"E5E533",
"yellow_terracotta":"BA8523",
"yellow_wool":"F8C527"
}`)

function hashCode(s: string) {
  let h = 0
  let i = 0
  const l = s.length
  if (l > 0) {
    while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0
  }
  return h
}

export function getColor(key: string) {
  if (colorMap[key]) return `#${colorMap[key]}`
  const hash = hashCode(key)
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

  const colorScheme = theme.value === 'light' ? colorSchemeLight : colorSchemeDark
  return colorScheme[Math.abs(hash) % colorScheme.length]
}

export interface Block {
  block: string
  count: number
  pos: number
  color: string
}

export const overworldBlockMap = generateBlockMap(
  overworldData.block,
  overworldData.chunkCount * 256,
  -64,
  255,
)
export const netherBlockMap = generateBlockMap(
  netherData.block,
  netherData.chunkCount * 256,
  0,
  130,
)
export const endBlockMap = generateBlockMap(endData.block, endData.chunkCount * 256, 0, 255)

function generateBlockMap(
  data: Record<string, number[]>,
  totalBlocks: number,
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
        count: (count / totalBlocks) * 100000,
        pos,
        color: getColor(key),
      })
    }
  }

  return blockMap
}
