export interface Enchantment {
  id: string
  level: number
}

export interface EnchantmentInfo {
  id: string
  anvilCost: number
  maxLevel: number
  weight: number
  supportedItems: string[]
  primaryItems: string[]
  exclusiveEnchantments: string[]
}

export interface RawEnchantmentInfo {
  anvil_cost: number
  max_level: number
  weight: number
  supported_items?: string[]
  primary_items?: string[]
  exclusive_enchantments?: string[]
}

export function parseRawEnchantmentInfo(id: string, raw: RawEnchantmentInfo): EnchantmentInfo {
  return {
    id,
    anvilCost: raw.anvil_cost ?? 0,
    maxLevel: raw.max_level ?? 1,
    weight: raw.weight ?? 1,
    supportedItems: raw.supported_items ?? [],
    primaryItems: raw.primary_items ?? [],
    exclusiveEnchantments: raw.exclusive_enchantments ?? [],
  }
}

import { enchantmentRegistryBE, itemBE } from './bedrock'
import { enchantmentRegistryJE, itemJE } from './java'

export function getEnchantmentInfo(enchantmentId: string, edition: 'java' | 'bedrock') {
  return edition === 'java'
    ? enchantmentRegistryJE[enchantmentId]
    : enchantmentRegistryBE[enchantmentId]
}

export function getAllEnchantmentIds(edition: 'java' | 'bedrock') {
  let result = new Set(
    Object.keys(edition === 'java' ? enchantmentRegistryJE : enchantmentRegistryBE),
  )
  return [...result]
}

export function getAllItemIds(edition: 'java' | 'bedrock') {
  return edition === 'java' ? itemJE : itemBE
}
