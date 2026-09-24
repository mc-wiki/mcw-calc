import type { NumericBackend } from '../numerics/types'
import type { PlayerMeleeInputs } from '../presets/playerMelee'
import { describe, expect, it } from 'vitest'
import { createPlayerMeleeFormState, parsePlayerMeleeFormState } from '../components/formState'
import {
  je26_3PlayerMeleeMechanics,
  je26_3PlayerMeleeWeaponPresetOrder,
  je26_3PlayerMeleeWeaponPresets,
  resolveJe26_3PlayerMeleeWeaponPreset,
} from '../data/je26_3'
import { standardNumerics } from '../numerics/standard'
import { createDefaultDiagnosticInputs } from '../presets/diagnostic'
import {
  createDefaultPlayerMeleeInputs,
  deriveMinecraftYawDegreesFromAim,
  evaluatePlayerMeleeInputs,
  resolveOrdinaryMeleeEnchantments,
  resolvePlayerMeleeVanillaSurvivalAvailability,
  resolveSharpnessDamageBonus,
} from '../presets/playerMelee'

const sourceFloatNumerics: NumericBackend = Object.freeze({
  ...standardNumerics,
  id: 'test-source-float',
  sourceFloat: Math.fround,
})

const presetAssertions = [
  ['bareHand', 1, 4, 5],
  ['woodenSword', 4, 1.6, 12.5],
  ['stoneSword', 5, 1.6, 12.5],
  ['copperSword', 5, 1.6, 12.5],
  ['goldenSword', 4, 1.6, 12.5],
  ['ironSword', 6, 1.6, 12.5],
  ['diamondSword', 7, 1.6, 12.5],
  ['netheriteSword', 8, 1.6, 12.5],
  ['woodenAxe', 7, 0.8, 25],
  ['stoneAxe', 9, 0.8, 25],
  ['copperAxe', 9, 0.8, 25],
  ['goldenAxe', 7, 1, 20],
  ['ironAxe', 9, 0.9, 20 / 0.9],
  ['diamondAxe', 9, 1, 20],
  ['netheriteAxe', 10, 1, 20],
] as const

function inputs(overrides: Partial<PlayerMeleeInputs>): PlayerMeleeInputs {
  return { ...createDefaultPlayerMeleeInputs(), ...overrides }
}

describe('audited JE 26.3 ordinary melee weapon data', () => {
  it('contains the accepted 15-item catalogue in reader order', () => {
    expect(je26_3PlayerMeleeWeaponPresetOrder).toEqual(presetAssertions.map(([id]) => id))

    for (const [id, damage, speed, recovery] of presetAssertions) {
      const preset = je26_3PlayerMeleeWeaponPresets[id]
      expect(preset.effectiveAttackDamage.value).toBe(damage)
      expect(preset.effectiveAttackSpeed.value).toBe(speed)
      expect(preset.recoveryPeriodTicks.value).toBe(recovery)
      expect(preset.effectiveAttackKnockback.value).toBe(0)
      expect(preset.itemDamagePerAttack.value).toBe(
        preset.weaponType === 'bareHand' ? 0 : preset.weaponType === 'sword' ? 1 : 2,
      )
      expect(preset.disableBlockingForSeconds.value).toBe(preset.weaponType === 'axe' ? 5 : 0)
    }
  })

  it('resolves the reader-facing type and material choice without UI logic', () => {
    expect(resolveJe26_3PlayerMeleeWeaponPreset({ type: 'bareHand' }).id).toBe('bareHand')
    expect(resolveJe26_3PlayerMeleeWeaponPreset({ type: 'sword', material: 'copper' }).id).toBe(
      'copperSword',
    )
    expect(resolveJe26_3PlayerMeleeWeaponPreset({ type: 'axe', material: 'netherite' }).id).toBe(
      'netheriteAxe',
    )
  })
})

describe('audited JE 26.3 ordinary melee enchantments', () => {
  it.each([
    [1, 1],
    [2, 1.5],
    [5, 3],
    [10, 5.5],
    [255, 128],
  ])('derives Sharpness %i as a %f damage bonus', (level, expected) => {
    expect(resolveSharpnessDamageBonus({ enabled: true, level })).toBe(expected)
    expect(resolveSharpnessDamageBonus({ enabled: true, level }, sourceFloatNumerics)).toBe(
      Math.fround(expected),
    )
  })

  it('keeps decoded and ordinary enchantment maxima in versioned mechanics data', () => {
    expect(je26_3PlayerMeleeMechanics).toMatchObject({
      maximumDecodedEnchantmentLevel: 255,
      ordinarySurvivalSharpnessMaximum: 5,
      ordinarySurvivalKnockbackMaximum: 2,
    })
  })

  it.each([0, -1, 1.5, 256, Number.NaN])('rejects invalid enabled Sharpness level %s', (level) => {
    expect(() => resolveSharpnessDamageBonus({ enabled: true, level })).toThrow(/1 to 255/)
  })

  it('rejects an invalid enabled Knockback level at the source-specific producer boundary', () => {
    const invalid = inputs({ knockback: { enabled: true, level: 256 } })

    expect(resolvePlayerMeleeVanillaSurvivalAvailability(invalid).status).toBe('invalid')
    expect(() => resolveOrdinaryMeleeEnchantments(invalid)).toThrow(/Knockback.*1 to 255/)
  })

  it('classifies ordinary, above-maximum, incompatible, and empty-hand configurations', () => {
    expect(
      resolvePlayerMeleeVanillaSurvivalAvailability(
        inputs({
          weapon: { type: 'axe', material: 'diamond' },
          sharpness: { enabled: true, level: 5 },
        }),
      ).status,
    ).toBe('ordinarySurvival')

    expect(
      resolvePlayerMeleeVanillaSurvivalAvailability(
        inputs({
          weapon: { type: 'sword', material: 'wooden' },
          sharpness: { enabled: true, level: 10 },
        }),
      ).issues.map((issue) => issue.code),
    ).toEqual(['aboveVanillaSurvivalMaximum'])

    expect(
      resolvePlayerMeleeVanillaSurvivalAvailability(
        inputs({
          weapon: { type: 'axe', material: 'diamond' },
          knockback: { enabled: true, level: 7 },
        }),
      ).issues.map((issue) => issue.code),
    ).toEqual(['unsupportedEnchantmentForWeapon', 'aboveVanillaSurvivalMaximum'])

    expect(
      resolvePlayerMeleeVanillaSurvivalAvailability(
        inputs({ sharpness: { enabled: true, level: 1 } }),
      ).issues.map((issue) => issue.code),
    ).toEqual(['enchantmentWithoutItem'])
  })

  it('preserves disabled working levels at the form boundary without validating them', () => {
    const form = {
      ...createPlayerMeleeFormState(createDefaultPlayerMeleeInputs()),
      sharpnessLevel: 'working text',
      knockbackLevel: '',
    }
    expect(parsePlayerMeleeFormState(form)).toMatchObject({
      sharpness: { enabled: false },
      knockback: { enabled: false },
    })
    expect(
      createPlayerMeleeFormState(createDefaultPlayerMeleeInputs()).allowNonVanillaEnchantmentLevels,
    ).toBe(false)
    expect(
      createPlayerMeleeFormState(inputs({ sharpness: { enabled: true, level: 255 } }))
        .allowNonVanillaEnchantmentLevels,
    ).toBe(true)
  })

  it('matches accepted damage and call-count diagnostics for combined settings', () => {
    const diagnostic = createDefaultDiagnosticInputs()
    const evaluation = evaluatePlayerMeleeInputs(
      diagnostic,
      inputs({
        weapon: { type: 'sword', material: 'iron' },
        sharpness: { enabled: true, level: 5 },
        knockback: { enabled: true, level: 2 },
        sprinting: true,
      }),
      deriveMinecraftYawDegreesFromAim(diagnostic, 0),
    )

    expect(evaluation.weaponPreset.id).toBe('ironSword')
    expect(evaluation.resolvedEnchantments).toEqual({
      sharpnessEnabled: true,
      sharpnessLevel: 5,
      sharpnessBonus: 3,
      knockbackEnabled: true,
      knockbackLevel: 2,
      enchantmentKnockbackAddition: 2,
    })
    expect(evaluation.availability.status).toBe('ordinarySurvival')
    expect(evaluation.attackResolution.diagnostics).toMatchObject({
      damageEnchantmentBonus: 3,
      magicBoost: 3,
      damageArgument: 9,
      combinedKnockback: 1.5,
      effectFactor: 0.375,
    })
    expect(evaluation.operationSequence.operationResults).toHaveLength(2)
  })
})
