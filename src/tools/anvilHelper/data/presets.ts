/**
 * Generate one item with any enchantment books that fit the item.
 * For each exclusive set, preferred to keep ones in whitelistedSet
 * Skip two curse enchantments, and items if they can only enchant
 * with these two enchantments.
 */
import {
  getAllEnchantmentIds,
  getAllItemIds,
  getEnchantmentInfo,
  type EnchantmentInfo,
} from '@/utils/enchantment'
import { newEnchantment, newItem, type Item } from '../worker'

const BOOK = 'enchanted_book'

const whitelistedSet = new Set([
  'protection', // armor
  'depth_strider', // boots
  'mending', // bow
  'piercing', // crossbow
  'sharpness', // damage
  'fortune', // mining
  'channeling', // riptide
  'loyalty', // riptide
])

const blacklistedSet = new Set(['binding_curse', 'vanishing_curse'])

function createItemPresetsMap(edition: 'java' | 'bedrock'): Record<string, Item[]> {
  const enchantmentInfo = getAllEnchantmentIds(edition)
    .filter((e) => !blacklistedSet.has(e))
    .map((e) => getEnchantmentInfo(e, edition))

  const itemFilter = new Set(enchantmentInfo.flatMap((e) => e.supportedItems))
  const itemTypes = getAllItemIds(edition).filter((i) => itemFilter.has(i))

  const isExclusive = (a: EnchantmentInfo, b: EnchantmentInfo): boolean =>
    a.exclusiveEnchantments.includes(b.id) || b.exclusiveEnchantments.includes(a.id)

  const selectEnchantments = (candidates: EnchantmentInfo[]): EnchantmentInfo[] => {
    const selected: EnchantmentInfo[] = []

    for (const enchantment of candidates) {
      const conflicts = selected.filter((other) => isExclusive(enchantment, other))

      if (conflicts.length === 0) {
        selected.push(enchantment)
        continue
      }

      if (
        whitelistedSet.has(enchantment.id) &&
        conflicts.every((other) => !whitelistedSet.has(other.id))
      ) {
        for (const conflict of conflicts) {
          selected.splice(selected.indexOf(conflict), 1)
        }

        selected.push(enchantment)
      }
    }

    return selected
  }

  return Object.fromEntries(
    [...itemTypes].map((itemType) => {
      const candidates = enchantmentInfo.filter((e) => e.supportedItems.includes(itemType))

      const selected = selectEnchantments(candidates)

      // 1 item + N enchantment books (each has one enchantment with max level)
      const items: Item[] = [
        newItem(itemType),

        ...selected.map((e) => newItem(BOOK, [newEnchantment(e.id, e.maxLevel)])),
      ]

      return [itemType, items]
    }),
  )
}

export function getPresets(edition: 'java' | 'bedrock') {
  const itemPresetsJE = createItemPresetsMap('java')
  const itemPresetsBE = createItemPresetsMap('bedrock')
  return edition === 'java' ? itemPresetsJE : itemPresetsBE
}
