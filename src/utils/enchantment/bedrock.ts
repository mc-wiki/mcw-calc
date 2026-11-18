import { parseRawEnchantmentInfo, type EnchantmentInfo } from '.'
import rawData from './data/bedrock.json'

export const enchantmentRegistryBE: Record<string, EnchantmentInfo> = Object.fromEntries(
  Object.entries(rawData.data).map(([id, raw]) => [id, parseRawEnchantmentInfo(id, raw)]),
)

export const itemBE = rawData.item
