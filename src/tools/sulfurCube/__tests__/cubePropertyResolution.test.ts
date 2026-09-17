import type {
  AttributeModifierOperation,
  DefinitionField,
  VersionedNumericField,
} from '../data/je26_3'
import type { ResolvableAttributeModifier, ResolvableCubeDefinition } from '../resolution'
import { describe, expect, it } from 'vitest'
import { je26_3Archetypes, je26_3ArchetypesById } from '../data/je26_3'
import { standardNumerics } from '../numerics/standard'
import { createBouncyTrajectoryAssumptions } from '../presets/defaults'
import {
  foldAttributeModifiers,
  foldMatchingDefinitions,
  resolveArchetype,
  toCubeMechanicsProperties,
  toResolvableCubeDefinition,
  toTrajectoryAssumptions,
} from '../resolution'

const testSource = { sourcePath: 'test fixture', locator: '/' }

function field<T>(value: T): DefinitionField<T> {
  return { value, source: testSource }
}

function floatField(sourceDecimal: number): VersionedNumericField {
  return {
    sourceDecimal,
    decodedValue: Math.fround(sourceDecimal),
    numericSourceType: 'float',
    source: testSource,
  }
}

function modifier(
  attributeId: string,
  id: string,
  amount: number,
  operation: AttributeModifierOperation,
): ResolvableAttributeModifier {
  return { attributeId, id, amount, operation, source: testSource }
}

function syntheticDefinition(
  id: string,
  attributeModifiers: readonly ResolvableAttributeModifier[] = [],
  overrides: Partial<ResolvableCubeDefinition> = {},
): ResolvableCubeDefinition {
  return {
    id,
    attributeModifiers,
    buoyant: false,
    explosion: null,
    contactDamage: null,
    knockbackModifiers: {
      horizontalPower: floatField(0.4),
      verticalPower: floatField(0.1),
    },
    soundSettings: {
      hitSound: field('minecraft:entity.sulfur_cube.regular.hit'),
      pushSound: field('minecraft:entity.sulfur_cube.regular.push'),
      pushSoundImpulseThreshold: floatField(0.2),
      pushSoundCooldown: floatField(0.5),
    },
    ...overrides,
  }
}

const expectedVanillaAttributes = [
  ['minecraft:bouncy', -2, 0, 0.8999999761581421, 0.30000001192092896, 0.009999999776482582],
  ['minecraft:explosive', -1, 0, 0.5, 0.30000001192092896, 0.30000001192092896],
  ['minecraft:fast_flat', -1, 0, 0.5, 0.20000000298023224, 0.009999999776482582],
  [
    'minecraft:fast_sliding',
    0.5,
    0.5,
    0.10000000149011612,
    0.05000000074505806,
    0.009999999776482582,
  ],
  [
    'minecraft:high_resistance',
    0.699999988079071,
    0.699999988079071,
    0.20000000298023224,
    1,
    0.009999999776482582,
  ],
  ['minecraft:hot', -1, 0, 0.5, 0.30000001192092896, 0.10000000149011612],
  ['minecraft:light', -1, 0, 1, 0.30000001192092896, 1.7999999523162842],
  ['minecraft:regular', -1, 0, 0.5, 0.30000001192092896, 0.10000000149011612],
  [
    'minecraft:slow_bouncy',
    0.4000000059604645,
    0.4000000059604645,
    0.6000000238418579,
    0.30000001192092896,
    0.05000000074505806,
  ],
  ['minecraft:slow_flat', 0.5, 0.5, 0.4000000059604645, 0.4000000059604645, 0.10000000149011612],
  [
    'minecraft:slow_sliding',
    0.800000011920929,
    0.800000011920929,
    0.10000000149011612,
    0.05000000074505806,
    0.009999999776482582,
  ],
  ['minecraft:sticky', -2, 0, 0, 2, 0.009999999776482582],
] as const

describe('attribute folding for JE 26.3', () => {
  it('applies add, multiplied-base, and multiplied-total operations in source order', () => {
    const result = foldAttributeModifiers([
      {
        candidateId: 'test:operations',
        modifiers: [
          modifier('minecraft:friction_modifier', 'test:add', 1, 'add_value'),
          modifier('minecraft:friction_modifier', 'test:base', 0.5, 'add_multiplied_base'),
          modifier('minecraft:friction_modifier', 'test:total', 1, 'add_multiplied_total'),
        ],
      },
    ])
    const friction = result.attributes['minecraft:friction_modifier']

    expect(friction.definition.baseValue).toBe(1)
    expect(friction.baseAfterAddValue).toBe(2)
    expect(friction.afterMultipliedBase).toBe(3)
    expect(friction.preSanitization).toBe(6)
    expect(friction.effectiveValue).toBe(6)
    expect(friction.activeModifiersByOperation.add_value).toHaveLength(1)
    expect(friction.activeModifiersByOperation.add_multiplied_base).toHaveLength(1)
    expect(friction.activeModifiersByOperation.add_multiplied_total).toHaveLength(1)
  })

  it('sanitizes NaN and values outside each source-defined range with diagnostics', () => {
    const result = foldAttributeModifiers([
      {
        candidateId: 'test:sanitization',
        modifiers: [
          modifier('minecraft:bounciness', 'test:nan', Number.NaN, 'add_value'),
          modifier('minecraft:friction_modifier', 'test:max', 3000, 'add_value'),
          modifier('minecraft:explosion_knockback_resistance', 'test:min', -2, 'add_value'),
        ],
      },
    ])

    expect(result.attributes['minecraft:bounciness'].effectiveValue).toBe(0)
    expect(result.attributes['minecraft:friction_modifier'].effectiveValue).toBe(2048)
    expect(result.attributes['minecraft:explosion_knockback_resistance'].effectiveValue).toBe(0)
    expect(
      result.diagnostics
        .filter(({ kind }) => kind === 'attribute_value_sanitized')
        .map((diagnostic) => diagnostic.kind === 'attribute_value_sanitized' && diagnostic.reason),
    ).toEqual(['clamped_to_minimum', 'nan_to_minimum', 'clamped_to_maximum'])
  })

  it('replaces a same-operation modifier ID with the later value', () => {
    const result = foldAttributeModifiers([
      {
        candidateId: 'test:a',
        modifiers: [modifier('minecraft:knockback_resistance', 'test:shared', 0.25, 'add_value')],
      },
      {
        candidateId: 'test:b',
        modifiers: [modifier('minecraft:knockback_resistance', 'test:shared', 0.75, 'add_value')],
      },
    ])
    const resistance = result.attributes['minecraft:knockback_resistance']

    expect(resistance.effectiveValue).toBe(0.75)
    expect(resistance.activeModifiersByOperation.add_value).toEqual([
      expect.objectContaining({ amount: 0.75, sourceCandidateId: 'test:b' }),
    ])
    expect(result.actionGroups[1].actions[0]).toMatchObject({
      status: 'replaced_same_operation',
      replacedModifier: { amount: 0.25, sourceCandidateId: 'test:a' },
      leavesEarlierOperationEntry: false,
    })
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ kind: 'same_operation_modifier_replaced' }),
    )
    expect(result.supported).toBe(true)
  })

  it('exposes and rejects a cross-operation duplicate-ID stateful edge case', () => {
    const result = foldAttributeModifiers([
      {
        candidateId: 'test:a',
        modifiers: [modifier('minecraft:knockback_resistance', 'test:shared', 0.5, 'add_value')],
      },
      {
        candidateId: 'test:b',
        modifiers: [
          modifier('minecraft:knockback_resistance', 'test:shared', 1, 'add_multiplied_total'),
        ],
      },
    ])
    const resistance = result.attributes['minecraft:knockback_resistance']

    expect(resistance.baseAfterAddValue).toBe(0.5)
    expect(resistance.preSanitization).toBe(1)
    expect(resistance.activeModifiersByOperation.add_value).toHaveLength(1)
    expect(resistance.activeModifiersByOperation.add_multiplied_total).toHaveLength(1)
    expect(result.actionGroups[1].actions[0].leavesEarlierOperationEntry).toBe(true)
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ kind: 'unsupported_cross_operation_modifier_id' }),
    )
    expect(result.supported).toBe(false)
  })

  it('ignores a modifier for an attribute the sulfur cube does not own', () => {
    const result = foldAttributeModifiers([
      {
        candidateId: 'test:unknown',
        modifiers: [modifier('test:unavailable', 'test:ignored', 4, 'add_value')],
      },
    ])

    expect(result.actions[0]).toMatchObject({ status: 'ignored' })
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ kind: 'ignored_unavailable_attribute' }),
    )
    expect(result.supported).toBe(true)
  })
})

describe('cube property folding for JE 26.3', () => {
  it('resolves the source-audited effective attributes for every vanilla archetype', () => {
    expect(
      je26_3Archetypes.map((definition) => {
        const profile = resolveArchetype(definition)
        return [
          definition.id,
          profile.attributes['minecraft:knockback_resistance'].effectiveValue,
          profile.attributes['minecraft:explosion_knockback_resistance'].effectiveValue,
          profile.attributes['minecraft:bounciness'].effectiveValue,
          profile.attributes['minecraft:friction_modifier'].effectiveValue,
          profile.attributes['minecraft:air_drag_modifier'].effectiveValue,
        ]
      }),
    ).toEqual(expectedVanillaAttributes)
  })

  it('returns the complete no-match defaults without inventing a candidate', () => {
    const profile = foldMatchingDefinitions([])

    expect(profile.orderedCandidateIds).toEqual([])
    expect(profile.foldTrace).toEqual([])
    expect(profile.buoyant).toBe(false)
    expect(profile.explosion).toBeNull()
    expect(profile.contactDamages).toEqual([])
    expect(profile.attributes['minecraft:friction_modifier'].effectiveValue).toBe(1)
    expect(profile.knockbackModifiers.horizontalPower).toMatchObject({
      value: { sourceDecimal: 0.33, decodedValue: 0.33000001311302185 },
      sourceCandidateId: null,
    })
    expect(profile.knockbackModifiers.verticalPower).toMatchObject({
      value: { sourceDecimal: 0.06, decodedValue: 0.05999999865889549 },
      sourceCandidateId: null,
    })
    expect(profile.soundSettings).toMatchObject({
      hitSound: { value: 'minecraft:entity.sulfur_cube.regular.hit' },
      pushSound: { value: 'minecraft:entity.sulfur_cube.regular.push' },
      pushSoundImpulseThreshold: { value: { decodedValue: 0.20000000298023224 } },
      pushSoundCooldown: { value: { decodedValue: 0.5 } },
      sourceCandidateId: null,
    })
    expect(profile.supported).toBe(true)
  })

  it('preserves explosion and contact data from their source candidates', () => {
    const explosive = resolveArchetype(je26_3ArchetypesById['minecraft:explosive'])
    const hot = resolveArchetype(je26_3ArchetypesById['minecraft:hot'])

    expect(explosive.explosion).toMatchObject({
      sourceCandidateId: 'minecraft:explosive',
      value: {
        power: { decodedValue: 3 },
        causesFire: { value: false },
        fuse: { decodedValue: 120 },
      },
    })
    expect(hot.contactDamages).toEqual([
      expect.objectContaining({
        sourceCandidateId: 'minecraft:hot',
        value: expect.objectContaining({
          damageType: expect.objectContaining({ value: 'minecraft:sulfur_cube_hot' }),
          amount: expect.objectContaining({ sourceDecimal: 1, decodedValue: 1 }),
          attributeToSource: expect.objectContaining({ value: false }),
        }),
      }),
    ])
  })

  it('combines an ordered overlap with OR, append, last-present, and last-wins behavior', () => {
    const bouncy = je26_3ArchetypesById['minecraft:bouncy']
    const explosive = je26_3ArchetypesById['minecraft:explosive']
    const profile = foldMatchingDefinitions([bouncy, explosive])

    expect(profile.orderedCandidateIds).toEqual(['minecraft:bouncy', 'minecraft:explosive'])
    expect(profile.buoyant).toBe(true)
    expect(profile.explosion?.sourceCandidateId).toBe('minecraft:explosive')
    expect(profile.knockbackModifiers.verticalPower).toMatchObject({
      sourceCandidateId: 'minecraft:explosive',
      value: { sourceDecimal: 0.09, decodedValue: 0.09000000357627869 },
    })
    expect(profile.soundSettings.sourceCandidateId).toBe('minecraft:explosive')
    expect(profile.attributes['minecraft:knockback_resistance']).toMatchObject({
      baseAfterAddValue: -3,
      preSanitization: -3,
      effectiveValue: -2,
    })
    expect(profile.attributes['minecraft:bounciness']).toMatchObject({
      preSanitization: 1.399999976158142,
      effectiveValue: 1,
    })
    expect(profile.attributes['minecraft:air_drag_modifier'].effectiveValue).toBeCloseTo(
      0.0030000000521540615,
      15,
    )
    expect(profile.foldTrace.map(({ explosionAction }) => explosionAction)).toEqual([
      'retain_previous',
      'overwrite_with_present_value',
    ])
    expect(profile.supported).toBe(true)
  })

  it('retains an earlier present explosion while later knockback and sounds overwrite', () => {
    const explosive = je26_3ArchetypesById['minecraft:explosive']
    const regular = je26_3ArchetypesById['minecraft:regular']
    const profile = foldMatchingDefinitions([explosive, regular])

    expect(profile.explosion?.sourceCandidateId).toBe('minecraft:explosive')
    expect(profile.foldTrace[1].explosionAction).toBe('retain_previous')
    expect(profile.knockbackModifiers.horizontalPower.sourceCandidateId).toBe('minecraft:regular')
    expect(profile.soundSettings.sourceCandidateId).toBe('minecraft:regular')
  })

  it('appends every present contact-damage entry in candidate order', () => {
    const hot = toResolvableCubeDefinition(je26_3ArchetypesById['minecraft:hot'])
    const second = syntheticDefinition('test:second-hot', [], {
      contactDamage: hot.contactDamage,
    })
    const profile = foldMatchingDefinitions([hot, second])

    expect(profile.contactDamages.map(({ sourceCandidateId }) => sourceCandidateId)).toEqual([
      'minecraft:hot',
      'test:second-hot',
    ])
    expect(profile.foldTrace.map(({ contactDamageAction }) => contactDamageAction)).toEqual([
      'append',
      'append',
    ])
  })

  it('propagates attribute folding diagnostics to the combined profile', () => {
    const profile = foldMatchingDefinitions([
      syntheticDefinition('test:a', [
        modifier('minecraft:knockback_resistance', 'test:shared', 0.5, 'add_value'),
      ]),
      syntheticDefinition('test:b', [
        modifier('minecraft:knockback_resistance', 'test:shared', 1, 'add_multiplied_total'),
      ]),
    ])

    expect(profile.supported).toBe(false)
    expect(profile.diagnostics).toContainEqual(
      expect.objectContaining({ kind: 'unsupported_cross_operation_modifier_id' }),
    )
    expect(profile.foldTrace[1].attributeActions[0].leavesEarlierOperationEntry).toBe(true)
  })

  it('does not mutate caller-owned definitions or modifier arrays', () => {
    const definition = syntheticDefinition('test:immutable', [
      modifier('minecraft:bounciness', 'test:add', 0.5, 'add_value'),
    ])
    const snapshot = structuredClone(definition)

    const profile = foldMatchingDefinitions([definition])

    expect(definition).toEqual(snapshot)
    expect(profile.candidateDefinitions[0]).toBe(definition)
    expect(profile.foldTrace[0].attributeActions).not.toBe(definition.attributeModifiers)
  })

  it('projects source-decimal or decoded-float properties without changing the profile', () => {
    const profile = resolveArchetype(je26_3ArchetypesById['minecraft:bouncy'])
    const before = structuredClone(profile)

    expect(toCubeMechanicsProperties(profile)).toEqual({
      horizontalPower: 0.4125,
      verticalPower: 0.105,
      knockbackResistance: -2,
    })
    expect(toCubeMechanicsProperties(profile, 'decoded_float32')).toEqual({
      horizontalPower: 0.4124999940395355,
      verticalPower: 0.10499999672174454,
      knockbackResistance: -2,
    })
    expect(toTrajectoryAssumptions(profile, standardNumerics)).toEqual(
      createBouncyTrajectoryAssumptions(standardNumerics),
    )
    expect(profile).toEqual(before)
  })
})
