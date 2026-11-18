import { parseRawEnchantmentInfo, type EnchantmentInfo } from '.'
import rawData from './data/java.json'

export const enchantmentRegistryJE: Record<string, EnchantmentInfo> = Object.fromEntries(
  Object.entries(rawData.data).map(([id, raw]) => [id, parseRawEnchantmentInfo(id, raw)]),
)

export const itemJE = rawData.item
