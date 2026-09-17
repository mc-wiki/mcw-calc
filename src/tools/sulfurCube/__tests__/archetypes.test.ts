import { describe, expect, it } from 'vitest'
import {
  bouncyArchetype,
  bouncyArchetypeDefinition,
  je26_3ArchetypeRegistryOrder,
  je26_3Archetypes,
  je26_3ArchetypesById,
} from '../data/je26_3'

const expectedArchetypes = [
  {
    id: 'minecraft:bouncy',
    amounts: [-2, -2, 0.8999999761581421, -0.699999988079071, -0.9900000002235174],
    buoyant: true,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.105, 0.10499999672174454],
    threshold: [0.3, 0.30000001192092896],
    cooldown: [0.7, 0.699999988079071],
  },
  {
    id: 'minecraft:explosive',
    amounts: [-1, -1, 0.5, -0.699999988079071, -0.699999988079071],
    buoyant: true,
    explosion: { power: 3, causesFire: false, fuse: 120 },
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.1, 0.10000000149011612],
    cooldown: [0.7, 0.699999988079071],
  },
  {
    id: 'minecraft:fast_flat',
    amounts: [-1, -1, 0.5, -0.7999999970197678, -0.9900000002235174],
    buoyant: false,
    horizontal: [0.9125, 0.9125000238418579],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.03, 0.029999999329447746],
    cooldown: [0.9, 0.8999999761581421],
  },
  {
    id: 'minecraft:fast_sliding',
    amounts: [0.5, 0.5, 0.10000000149011612, -0.9499999992549419, -0.9900000002235174],
    buoyant: false,
    horizontal: [0.6625, 0.6625000238418579],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.05, 0.05000000074505806],
    cooldown: [1, 1],
  },
  {
    id: 'minecraft:high_resistance',
    amounts: [0.699999988079071, 0.699999988079071, 0.20000000298023224, 0, -0.9900000002235174],
    buoyant: false,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.03, 0.029999999329447746],
    cooldown: [0.7, 0.699999988079071],
  },
  {
    id: 'minecraft:hot',
    amounts: [-1, -1, 0.5, -0.699999988079071, -0.8999999985098839],
    buoyant: true,
    contactDamage: {
      damageType: 'minecraft:sulfur_cube_hot',
      amount: [1, 1],
      attributeToSource: false,
    },
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.2, 0.20000000298023224],
    cooldown: [0.7, 0.699999988079071],
  },
  {
    id: 'minecraft:light',
    amounts: [-1, -1, 1, -0.699999988079071, 0.7999999523162842],
    buoyant: true,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.18, 0.18000000715255737],
    threshold: [0.2, 0.20000000298023224],
    cooldown: [0.7, 0.699999988079071],
  },
  {
    id: 'minecraft:regular',
    amounts: [-1, -1, 0.5, -0.699999988079071, -0.8999999985098839],
    buoyant: true,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.2, 0.20000000298023224],
    cooldown: [0.5, 0.5],
  },
  {
    id: 'minecraft:slow_bouncy',
    amounts: [
      0.4000000059604645, 0.4000000059604645, 0.6000000238418579, -0.699999988079071,
      -0.9499999992549419,
    ],
    buoyant: false,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.24, 0.23999999463558197],
    threshold: [0.05, 0.05000000074505806],
    cooldown: [0.5, 0.5],
  },
  {
    id: 'minecraft:slow_flat',
    amounts: [0.5, 0.5, 0.4000000059604645, -0.5999999940395355, -0.8999999985098839],
    buoyant: false,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.105, 0.10499999672174454],
    threshold: [0.03, 0.029999999329447746],
    cooldown: [0.9, 0.8999999761581421],
  },
  {
    id: 'minecraft:slow_sliding',
    amounts: [
      0.800000011920929, 0.800000011920929, 0.10000000149011612, -0.9499999992549419,
      -0.9900000002235174,
    ],
    buoyant: false,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.02, 0.019999999552965164],
    cooldown: [1, 1],
  },
  {
    id: 'minecraft:sticky',
    amounts: [-2, -2, 0, 1, -0.9900000002235174],
    buoyant: false,
    horizontal: [0.4125, 0.4124999940395355],
    vertical: [0.09, 0.09000000357627869],
    threshold: [0.05, 0.05000000074505806],
    cooldown: [0.5, 0.5],
  },
] as const

const expectedAttributes = [
  ['minecraft:knockback_resistance', 'add_knockback_resistance', 'add_value'],
  ['minecraft:explosion_knockback_resistance', 'add_explosion_knockback_resistance', 'add_value'],
  ['minecraft:bounciness', 'add_bounciness', 'add_value'],
  ['minecraft:friction_modifier', 'mul_friction_modifier', 'add_multiplied_total'],
  ['minecraft:air_drag_modifier', 'mul_air_drag_modifier', 'add_multiplied_total'],
] as const

describe('sulfur cube archetype definitions for Java Edition 26.3', () => {
  it('preserves the verified identifier-sorted runtime registry order', () => {
    expect(je26_3Archetypes.map(({ id }) => id)).toEqual(je26_3ArchetypeRegistryOrder)
    expect(je26_3Archetypes.map(({ registryIndex }) => registryIndex)).toEqual(
      je26_3Archetypes.map((_, index) => index),
    )
    expect(Object.keys(je26_3ArchetypesById)).toEqual(je26_3ArchetypeRegistryOrder)
  })

  it('transcribes every non-pattern value from the accepted source inventory', () => {
    expect(
      je26_3Archetypes.map((definition) => ({
        id: definition.id,
        amounts: definition.attributeModifiers.map(({ amount }) => amount.sourceDecimal),
        buoyant: definition.buoyant.value,
        ...(definition.explosion === null
          ? {}
          : {
              explosion: {
                power: definition.explosion.power.sourceDecimal,
                causesFire: definition.explosion.causesFire.value,
                fuse: definition.explosion.fuse.sourceDecimal,
              },
            }),
        ...(definition.contactDamage === null
          ? {}
          : {
              contactDamage: {
                damageType: definition.contactDamage.damageType.value,
                amount: [
                  definition.contactDamage.amount.sourceDecimal,
                  definition.contactDamage.amount.decodedValue,
                ],
                attributeToSource: definition.contactDamage.attributeToSource.value,
              },
            }),
        horizontal: [
          definition.knockbackModifiers.horizontalPower.sourceDecimal,
          definition.knockbackModifiers.horizontalPower.decodedValue,
        ],
        vertical: [
          definition.knockbackModifiers.verticalPower.sourceDecimal,
          definition.knockbackModifiers.verticalPower.decodedValue,
        ],
        threshold: [
          definition.soundSettings.pushSoundImpulseThreshold.sourceDecimal,
          definition.soundSettings.pushSoundImpulseThreshold.decodedValue,
        ],
        cooldown: [
          definition.soundSettings.pushSoundCooldown.sourceDecimal,
          definition.soundSettings.pushSoundCooldown.decodedValue,
        ],
      })),
    ).toEqual(expectedArchetypes)
  })

  it('preserves every vanilla attribute entry and required holder/sound field', () => {
    for (const definition of je26_3Archetypes) {
      const name = definition.id.slice('minecraft:'.length)

      expect(definition.items.value).toBe(`#minecraft:sulfur_cube_archetype/${name}`)
      expect(
        definition.attributeModifiers.map((modifier) => [
          modifier.attribute.value,
          modifier.id.value,
          modifier.operation.value,
        ]),
      ).toEqual(
        expectedAttributes.map(([attribute, idSuffix, operation]) => [
          attribute,
          `minecraft:${name}_${idSuffix}`,
          operation,
        ]),
      )
      expect(definition.soundSettings.hitSound.value).toBe(
        `minecraft:entity.sulfur_cube.${name}.hit`,
      )
      expect(definition.soundSettings.pushSound.value).toBe(
        `minecraft:entity.sulfur_cube.${name}.push`,
      )
    }
  })

  it('keeps source decimals and Java codec values at an explicit numerical seam', () => {
    for (const definition of je26_3Archetypes) {
      for (const modifier of definition.attributeModifiers) {
        expect(modifier.amount.numericSourceType).toBe('double')
        expect(modifier.amount.decodedValue).toBe(modifier.amount.sourceDecimal)
      }

      const floats = [
        definition.knockbackModifiers.horizontalPower,
        definition.knockbackModifiers.verticalPower,
        definition.soundSettings.pushSoundImpulseThreshold,
        definition.soundSettings.pushSoundCooldown,
        ...(definition.contactDamage === null ? [] : [definition.contactDamage.amount]),
      ]
      for (const value of floats) {
        expect(value.numericSourceType).toBe('float')
        expect(value.decodedValue).toBe(Math.fround(value.sourceDecimal))
      }

      if (definition.explosion !== null) {
        expect(definition.explosion.power.numericSourceType).toBe('integer')
        expect(definition.explosion.fuse.numericSourceType).toBe('integer')
      }
    }
  })

  it('carries repository-relative source paths and exact field locators', () => {
    for (const definition of je26_3Archetypes) {
      const extractedPath = definition.source.sourcePath
      expect(extractedPath).toMatch(
        /^versions\/26\.3\/extracted\/data\/minecraft\/sulfur_cube_archetype\/.+\.json$/,
      )
      expect(definition.source.locator).toMatch(/^complete extracted definition/)

      const extractedFields = [
        definition.items,
        ...definition.attributeModifiers.flatMap((modifier) => [
          modifier.id,
          modifier.attribute,
          modifier.amount,
          modifier.operation,
        ]),
        ...(definition.buoyant.value ? [definition.buoyant] : []),
        ...(definition.explosion === null
          ? []
          : [
              definition.explosion.power,
              definition.explosion.causesFire,
              definition.explosion.fuse,
            ]),
        ...(definition.contactDamage === null
          ? []
          : [
              definition.contactDamage.damageType,
              definition.contactDamage.amount,
              definition.contactDamage.attributeToSource,
            ]),
        definition.knockbackModifiers.horizontalPower,
        definition.knockbackModifiers.verticalPower,
        definition.soundSettings.hitSound,
        definition.soundSettings.pushSound,
        definition.soundSettings.pushSoundImpulseThreshold,
        definition.soundSettings.pushSoundCooldown,
      ]

      for (const sourcedField of extractedFields) {
        expect(sourcedField.source.sourcePath).toBe(extractedPath)
        expect(sourcedField.source.locator).toMatch(/^\//)
      }

      if (!definition.buoyant.value) {
        expect(definition.buoyant.source.sourcePath).toContain('SulfurCubeArchetype.java')
        expect(definition.buoyant.source.locator).toContain('buoyant=false default')
      }
    }
  })

  it('exposes a Bouncy projection matching the source definition', () => {
    expect(bouncyArchetypeDefinition.knockbackModifiers.horizontalPower).toMatchObject({
      sourceDecimal: 0.4125,
      decodedValue: 0.4124999940395355,
      numericSourceType: 'float',
    })
    expect(bouncyArchetypeDefinition.knockbackModifiers.verticalPower).toMatchObject({
      sourceDecimal: 0.105,
      decodedValue: 0.10499999672174454,
      numericSourceType: 'float',
    })
    expect(bouncyArchetype.knockbackModifiers.horizontalPower.value).toBe(0.4125)
    expect(bouncyArchetype.knockbackModifiers.verticalPower.value).toBe(0.105)
    expect(bouncyArchetype.effectiveProperties.knockbackResistance.value).toBe(-2)
    expect(bouncyArchetype.effectiveProperties.airDragModifier.value).toBe(0.009999999776482582)
  })
})
