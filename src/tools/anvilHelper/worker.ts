import type { Enchantment } from '@/utils/enchantment'
import { getEnchantmentInfo } from '@/utils/enchantment'

const BOOK = 'enchanted_book'

export interface Item {
  type: string
  enchantments: Enchantment[]
  repairCost: number
}

interface AnvilResult {
  item: Item
  /**
   * XP Level
   */
  cost: number
}

type MergeNode = InputNode | CombinedNode

interface InputNode {
  kind: 'input'
  index: number
  item: Item
}

interface CombinedNode {
  kind: 'merge'
  left: MergeNode
  right: MergeNode
  item: Item
  /**
   * XP Level
   */
  cost: number
}

interface DPEntry {
  item: Item
  cost: number
  tree: MergeNode
}

interface MergeStep {
  input: { item: Item; idx: number }
  addition: { item: Item; idx: number }
  result: { item: Item; idx: number }
  /**
   * XP Level
   */
  cost: number
}

interface InternalMergePlan {
  finalResult: Item
  usedIndexes: number[]
  tree: MergeNode
  /**
   * XP Level
   */
  totalCost: number
}

export interface MergePlan extends InternalMergePlan {
  steps: MergeStep[]
}

export function lvl2xp(lvl: number) {
  if (lvl === 0) {
    return 0
  }
  if (lvl < 17) {
    return lvl ** 2 + 6 * lvl
  }
  if (lvl < 32) {
    return 2.5 * lvl ** 2 - 40.5 * lvl + 360
  }
  return 4.5 * lvl ** 2 - 162.5 * lvl + 2220
}

export function newEnchantment(id: string = '', level: number = 1): Enchantment {
  return { id, level }
}
export function newItem(
  type: string,
  enchantments: Enchantment[] = [],
  repairCost: number = 0,
): Item {
  return type === BOOK
    ? {
        type,
        enchantments: enchantments.length > 0 ? enchantments : [newEnchantment()],
        repairCost: repairCost,
      }
    : {
        type,
        enchantments,
        repairCost: repairCost,
      }
}
function normalizeItem(item: Item): Item {
  return {
    ...item,

    enchantments: [...item.enchantments]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((e) => ({ ...e })),
  }
}
function itemKey(item: Item): string {
  const normalized = normalizeItem(item)

  const enchantments = normalized.enchantments.map((e) => `${e.id}:${e.level}`).join(',')

  return [normalized.type, normalized.repairCost, enchantments].join('|')
}
function isBook(item: Item): boolean {
  return item.type === BOOK
}

export function combineTwoItems(
  input: Item,
  addition: Item,
  edition: 'java' | 'bedrock',
): AnvilResult | null {
  let inputIsBook = isBook(input)
  let additionIsBook = isBook(addition)

  // 1 validate input items' type =>
  // return null if A is a book but B is not a book
  if (inputIsBook && !additionIsBook) {
    return null
  }
  // if (!inputIsBook && !additionIsBook) {
  //   if (input.type !== addition.type) {
  //     return null
  //   }
  // }

  const result: Item = {
    ...input,
    enchantments: input.enchantments.map((e) => ({ ...e })),
  }

  const enchantments = new Map<string, number>(result.enchantments.map((e) => [e.id, e.level]))

  // 2 initialize constants and variables
  const tax = input.repairCost + addition.repairCost
  let price = 0
  let hasCompatible = false
  let hasIncompatible = false

  // 3 loop
  for (const e2 of addition.enchantments) {
    const info = getEnchantmentInfo(e2.id, edition)

    if (info === undefined) {
      throw new Error(`Unknown enchantment: ${e2.id}`)
    }

    const currentLevel = enchantments.get(e2.id) ?? 0
    let level = currentLevel === e2.level ? e2.level + 1 : Math.max(currentLevel, e2.level)
    let compatible = inputIsBook || info.supportedItems.includes(input.type)

    // 4 add one level for every incompatible enchantment on the target (Only JE)
    for (const i of enchantments.keys()) {
      if (i === e2.id) {
        continue
      }
      if (info.exclusiveEnchantments.includes(i)) {
        compatible = false
        price = edition === 'java' ? price + 1 : price
      }
    }

    // 5 discard if any incompatible enchantment exists
    if (!compatible) {
      hasIncompatible = true
      continue
    }
    hasCompatible = true

    // 6 clamp enchantment level to their max level
    level = Math.min(level, info.maxLevel)
    enchantments.set(e2.id, level)

    // 7 calculate enchant level cost
    let fee = additionIsBook ? Math.max(Math.floor(info.anvilCost / 2), 1) : info.anvilCost
    price += edition === 'java' ? fee * level : fee * (level - currentLevel)

    // 8 if all enchantments fail to be applied, fail this combine
    if (hasIncompatible && !hasCompatible) {
      return null
    }
    if (price <= 0) {
      return null
    }
  }

  // 9 Too expensive!
  const cost = tax + price
  if (cost >= 40) {
    return null
  }

  // 10 update repair cost
  result.repairCost = Math.max(input.repairCost, addition.repairCost) * 2 + 1
  result.enchantments = Array.from(enchantments, ([id, level]) => newEnchantment(id, level))
  return {
    item: result,
    cost,
  }
}

// DP things

/**
 * bit mask -> Item indexes
 */
function maskToIndexes(mask: bigint, count: number): number[] {
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    if ((mask & (1n << BigInt(i))) !== 0n) {
      result.push(i)
    }
  }
  return result
}

/**
 * Decide whether merge plan A is better than B.
 *
 * Priority
 * 1. More enchantments
 * 2. Higher total enchantment level
 * 3. Lower total experience consumption
 * 4. Less input items used
 */
function isBetterPlan(a: InternalMergePlan, b: InternalMergePlan): boolean {
  // Result Item's "score"
  function enchantmentScore(item: Item): {
    count: number
    totalLevels: number
  } {
    return {
      count: item.enchantments.length,
      totalLevels: item.enchantments.reduce((sum, e) => sum + e.level, 0),
    }
  }
  const scoreA = enchantmentScore(a.finalResult)
  const scoreB = enchantmentScore(b.finalResult)

  if (scoreA.count !== scoreB.count) {
    return scoreA.count > scoreB.count
  }

  if (scoreA.totalLevels !== scoreB.totalLevels) {
    return scoreA.totalLevels > scoreB.totalLevels
  }

  if (a.totalCost !== b.totalCost) {
    return a.totalCost < b.totalCost
  }

  return a.usedIndexes.length < b.usedIndexes.length
}

/**
 * Insert the result into a certain DP state.
 *
 * Regarding: same mask + same final item =>
 * only retain the solution with the lowest xp level cost
 */
function insertEntry(map: Map<string, DPEntry>, entry: DPEntry): boolean {
  const key = itemKey(entry.item)
  const existing = map.get(key)
  if (existing !== undefined && existing.cost <= entry.cost) {
    return false
  }

  map.set(key, entry)
  return true
}

function processMerge(
  left: DPEntry,
  right: DPEntry,
  target: Map<string, DPEntry>,
  edition: 'java' | 'bedrock',
): void {
  const result = combineTwoItems(left.item, right.item, edition)

  if (result === null) {
    return
  }

  const item = normalizeItem(result.item)

  const cost = left.cost + right.cost + result.cost

  const tree: CombinedNode = {
    kind: 'merge',
    left: left.tree,
    right: right.tree,
    item,
    cost: result.cost,
  }

  insertEntry(target, {
    item,
    cost,
    tree,
  })
}

/**
 * Gosper's Hack.
 */
function generateMasksOfSize(n: number, k: number): bigint[] {
  if (k <= 0 || k > n) {
    return []
  }

  const result: bigint[] = []

  let mask = (1n << BigInt(k)) - 1n

  const limit = 1n << BigInt(n)

  while (mask < limit) {
    result.push(mask)

    const c = mask & -mask

    const r = mask + c

    mask = (((r ^ mask) >> 2n) / c) | r
  }

  return result
}

function flattenMergeTree(root: MergeNode, initialItemCount: number): MergeStep[] {
  const steps: MergeStep[] = []
  // Intermediate's index starts from `initialItemCount`
  let nextId = initialItemCount
  function visit(node: MergeNode) {
    if (node.kind === 'input') {
      return node.index
    }
    const leftId = visit(node.left)
    const rightId = visit(node.right)
    const resultId = nextId++
    steps.push({
      input: { item: node.left.item, idx: leftId },
      addition: { item: node.right.item, idx: rightId },
      result: { item: node.item, idx: resultId },
      cost: node.cost,
    })
    return resultId
  }
  visit(root)
  return steps
}

function findBestMergePlan(inputItems: Item[], edition: 'java' | 'bedrock'): MergePlan | null {
  if (inputItems.length === 0) {
    return null
  }
  /*
   * ------------------------------------------------
   * DP:
   *
   * mask =>
   * Map<
   *   mask,
   *   cheapest way to reach that state
   * >
   * ------------------------------------------------
   */
  const dp = new Map<bigint, Map<string, DPEntry>>()

  function getDP(mask: bigint) {
    let map = dp.get(mask)
    if (map === undefined) {
      map = new Map()
      dp.set(mask, map)
    }
    return map
  }

  // Initialize
  for (let i = 0; i < inputItems.length; i++) {
    const mask = 1n << BigInt(i)
    const item = normalizeItem(inputItems[i])
    const tree: InputNode = {
      kind: 'input',
      index: i,
      item,
    }
    insertEntry(getDP(mask), { item, cost: 0, tree })
  }

  /*
   * ------------------------------------------------
   *
   * size = 2
   * size = 3
   * ...
   * ------------------------------------------------
   */
  for (let size = 2; size <= inputItems.length; size++) {
    const masks = generateMasksOfSize(inputItems.length, size)

    for (const mask of masks) {
      const target = getDP(mask)

      /*
       * ------------------------------------------------
       * Split the mask in:
       *
       * leftMask | rightMask = mask
       *
       * They do not intersect with each other
       * to avoid (A,B) and (B,A)
       * repeat at the subset level,
       * and only enumerate one way of splitting.
       *
       * Note:
       * Both order will still be attempted.
       * ------------------------------------------------
       */

      const lowestBit = mask & -mask
      for (let leftMask = (mask - 1n) & mask; leftMask > 0n; leftMask = (leftMask - 1n) & mask) {
        /*
         * Force the lowestBit to be in the leftMask
         * to avoid repeating the partition.
         */
        if ((leftMask & lowestBit) === 0n) {
          continue
        }
        const rightMask = mask ^ leftMask

        if (rightMask === 0n) {
          continue
        }

        const leftDP = dp.get(leftMask)

        const rightDP = dp.get(rightMask)

        if (leftDP === undefined || rightDP === undefined) {
          continue
        }
        /*
         * ------------------------------------------------
         * Try all the intermediates produced by the two subsets.
         * ------------------------------------------------
         */
        for (const left of leftDP.values()) {
          for (const right of rightDP.values()) {
            /**
             * A+B
             */
            processMerge(left, right, target, edition)

            /**
             * B+A
             * This step is necessary, because Minecraft
             * anvil doesn't follow the commutative law,
             */
            processMerge(right, left, target, edition)
          }
        }
      }
      /*
       * If no result is produced,
       * discard this mask.
       */
      if (target.size === 0) {
        dp.delete(mask)
      }
    }
  }

  /*
   * ------------------------------------------------
   * Search for result item from all DP states.
   *
   * Note:
   * It is not necessary for mask to be equal to all the input items.
   * Because some spellbooks may have to be discarded due to mutual exclusivity.
   * ------------------------------------------------
   */

  let best: InternalMergePlan | null = null

  for (const [mask, entries] of dp) {
    for (const entry of entries.values()) {
      if (isBook(entry.item)) {
        continue
      }

      const candidate: InternalMergePlan = {
        finalResult: entry.item,
        usedIndexes: maskToIndexes(mask, inputItems.length),
        tree: entry.tree,
        totalCost: entry.cost,
      }

      if (best === null || isBetterPlan(candidate, best)) {
        best = candidate
      }
    }
  }

  /*
   * ------------------------------------------------
   * Special Cases:
   *
   * If all the inputs are enchantment books,
   * then the final result can be an enchantment book.
   * ------------------------------------------------
   */
  if (best === null) {
    for (const [mask, entries] of dp) {
      for (const entry of entries.values()) {
        const candidate: InternalMergePlan = {
          finalResult: entry.item,
          usedIndexes: maskToIndexes(mask, inputItems.length),
          tree: entry.tree,
          totalCost: entry.cost,
        }

        if (best === null || isBetterPlan(candidate, best)) {
          best = candidate
        }
      }
    }
  }
  if (best === null) {
    return null
  }
  return { ...best, steps: flattenMergeTree(best.tree, inputItems.length) }
}

export async function bestMergePlan(inputItems: Item[], edition: 'java' | 'bedrock') {
  const best = findBestMergePlan(inputItems, edition)
  console.log(best)
  return best
}
