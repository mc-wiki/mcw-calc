import type { SourcedValue } from './provenance'
import { sourcedValue } from './provenance'

export const je26_3ToolMaterialOrder = [
  'wooden',
  'stone',
  'copper',
  'golden',
  'iron',
  'diamond',
  'netherite',
] as const

export type Je26_3ToolMaterialId = (typeof je26_3ToolMaterialOrder)[number]
export type Je26_3PlayerMeleeWeaponType = 'bareHand' | 'sword' | 'axe'
export type Je26_3PlayerMeleeWeaponPresetId =
  | 'bareHand'
  | `${Je26_3ToolMaterialId}Sword`
  | `${Je26_3ToolMaterialId}Axe`

export type PlayerMeleeWeaponChoice =
  | { readonly type: 'bareHand' }
  | { readonly type: 'sword' | 'axe'; readonly material: Je26_3ToolMaterialId }

export interface Je26_3WeaponEnchantmentAvailability {
  readonly tablePrimary: SourcedValue<boolean>
  readonly anvilSupported: SourcedValue<boolean>
  readonly ordinarySurvivalMaximumLevel: SourcedValue<number>
}

export interface Je26_3PlayerMeleeWeaponPreset {
  readonly id: Je26_3PlayerMeleeWeaponPresetId
  readonly itemId: SourcedValue<`minecraft:${string}` | null>
  readonly weaponType: Je26_3PlayerMeleeWeaponType
  readonly material: Je26_3ToolMaterialId | null
  readonly effectiveAttackDamage: SourcedValue<number>
  readonly effectiveAttackSpeed: SourcedValue<number>
  readonly recoveryPeriodTicks: SourcedValue<number>
  readonly effectiveAttackKnockback: SourcedValue<0>
  readonly itemDamagePerAttack: SourcedValue<0 | 1 | 2>
  readonly disableBlockingForSeconds: SourcedValue<0 | 5>
  readonly sharpness: Je26_3WeaponEnchantmentAvailability
  readonly knockback: Je26_3WeaponEnchantmentAvailability
}

interface WeaponNumbers {
  readonly damage: number
  readonly speed: number
}

const weaponNumbers: Readonly<
  Record<'sword' | 'axe', Readonly<Record<Je26_3ToolMaterialId, WeaponNumbers>>>
> = Object.freeze({
  sword: Object.freeze({
    wooden: { damage: 4, speed: 1.6 },
    stone: { damage: 5, speed: 1.6 },
    copper: { damage: 5, speed: 1.6 },
    golden: { damage: 4, speed: 1.6 },
    iron: { damage: 6, speed: 1.6 },
    diamond: { damage: 7, speed: 1.6 },
    netherite: { damage: 8, speed: 1.6 },
  }),
  axe: Object.freeze({
    wooden: { damage: 7, speed: 0.8 },
    stone: { damage: 9, speed: 0.8 },
    copper: { damage: 9, speed: 0.8 },
    golden: { damage: 7, speed: 1 },
    iron: { damage: 9, speed: 0.9 },
    diamond: { damage: 9, speed: 1 },
    netherite: { damage: 10, speed: 1 },
  }),
})

function capitalize(value: string): string {
  return `${value[0]!.toUpperCase()}${value.slice(1)}`
}

function makeAvailability(
  tablePrimary: boolean,
  anvilSupported: boolean,
  maximumLevel: number,
): Je26_3WeaponEnchantmentAvailability {
  return Object.freeze({
    tablePrimary: sourcedValue(tablePrimary, ['playerMeleeEnchantmentAvailability']),
    anvilSupported: sourcedValue(anvilSupported, ['playerMeleeEnchantmentAvailability']),
    ordinarySurvivalMaximumLevel: sourcedValue(maximumLevel, [
      'playerMeleeEnchantmentAvailability',
    ]),
  })
}

function makeItemPreset(
  weaponType: 'sword' | 'axe',
  material: Je26_3ToolMaterialId,
): Je26_3PlayerMeleeWeaponPreset {
  const numbers = weaponNumbers[weaponType][material]
  const id = `${material}${capitalize(weaponType)}` as Je26_3PlayerMeleeWeaponPresetId
  const itemId = `minecraft:${material}_${weaponType}` as const
  const isSword = weaponType === 'sword'

  return Object.freeze({
    id,
    itemId: sourcedValue(itemId, ['playerMeleeWeaponPresets']),
    weaponType,
    material,
    effectiveAttackDamage: sourcedValue(numbers.damage, ['playerMeleeWeaponPresets']),
    effectiveAttackSpeed: sourcedValue(numbers.speed, ['playerMeleeWeaponPresets']),
    recoveryPeriodTicks: sourcedValue(20 / numbers.speed, ['playerMeleeWeaponPresets']),
    effectiveAttackKnockback: sourcedValue<0>(0, ['playerMeleeWeaponPresets']),
    itemDamagePerAttack: sourcedValue<1 | 2>(isSword ? 1 : 2, ['playerMeleeWeaponPresets']),
    disableBlockingForSeconds: sourcedValue<0 | 5>(isSword ? 0 : 5, ['playerMeleeWeaponPresets']),
    sharpness: makeAvailability(isSword, true, 5),
    knockback: makeAvailability(isSword, isSword, isSword ? 2 : 0),
  })
}

const bareHand = Object.freeze({
  id: 'bareHand',
  itemId: sourcedValue(null, ['playerMeleeWeaponPresets']),
  weaponType: 'bareHand',
  material: null,
  effectiveAttackDamage: sourcedValue(
    1,
    ['playerMeleeWeaponPresets'],
    'player base ATTACK_DAMAGE 1 with no held-item modifier',
  ),
  effectiveAttackSpeed: sourcedValue(
    4,
    ['playerMeleeWeaponPresets'],
    'player base ATTACK_SPEED 4 with no held-item modifier',
  ),
  recoveryPeriodTicks: sourcedValue(5, ['playerMeleeWeaponPresets'], '20 / 4'),
  effectiveAttackKnockback: sourcedValue<0>(0, ['playerMeleeWeaponPresets']),
  itemDamagePerAttack: sourcedValue<0>(0, ['playerMeleeWeaponPresets']),
  disableBlockingForSeconds: sourcedValue<0>(0, ['playerMeleeWeaponPresets']),
  sharpness: makeAvailability(false, false, 0),
  knockback: makeAvailability(false, false, 0),
} satisfies Je26_3PlayerMeleeWeaponPreset)

export const je26_3PlayerMeleeWeaponPresetOrder = [
  'bareHand',
  ...je26_3ToolMaterialOrder.map((material) => `${material}Sword` as const),
  ...je26_3ToolMaterialOrder.map((material) => `${material}Axe` as const),
] as const

export const je26_3PlayerMeleeWeaponPresets = Object.freeze(
  Object.fromEntries([
    ['bareHand', bareHand],
    ...je26_3ToolMaterialOrder.map((material) => {
      const preset = makeItemPreset('sword', material)
      return [preset.id, preset] as const
    }),
    ...je26_3ToolMaterialOrder.map((material) => {
      const preset = makeItemPreset('axe', material)
      return [preset.id, preset] as const
    }),
  ]),
) as Readonly<Record<Je26_3PlayerMeleeWeaponPresetId, Je26_3PlayerMeleeWeaponPreset>>

export function resolveJe26_3PlayerMeleeWeaponPreset(
  choice: PlayerMeleeWeaponChoice,
): Je26_3PlayerMeleeWeaponPreset {
  if (choice.type === 'bareHand') return je26_3PlayerMeleeWeaponPresets.bareHand

  const id = `${choice.material}${capitalize(choice.type)}` as Je26_3PlayerMeleeWeaponPresetId
  const preset = (
    je26_3PlayerMeleeWeaponPresets as Partial<
      Record<Je26_3PlayerMeleeWeaponPresetId, Je26_3PlayerMeleeWeaponPreset>
    >
  )[id]
  if (preset === undefined) {
    throw new RangeError(`unknown JE 26.3 player melee weapon choice: ${id}`)
  }
  return preset
}
