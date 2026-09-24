import type { ProvenanceRecord, SourcedValue } from './provenance'
import { je26_3Constants } from './constants'
import { provenance, sourcedValue } from './provenance'

export type AttributeModifierOperation =
  | 'add_value'
  | 'add_multiplied_base'
  | 'add_multiplied_total'

export type SulfurCubeAttributeId =
  | 'minecraft:knockback_resistance'
  | 'minecraft:explosion_knockback_resistance'
  | 'minecraft:bounciness'
  | 'minecraft:friction_modifier'
  | 'minecraft:air_drag_modifier'

export type NumericSourceType = 'double' | 'float' | 'integer'

export interface DefinitionFieldSource {
  readonly sourcePath: string
  readonly locator: string
}

export interface DefinitionField<T> {
  readonly value: T
  readonly source: DefinitionFieldSource
}

export interface VersionedNumericField {
  /** Decimal value preserved from the extracted JSON or Java source literal. */
  readonly sourceDecimal: number
  /** Value after the field's JE codec boundary. */
  readonly decodedValue: number
  readonly numericSourceType: NumericSourceType
  readonly source: DefinitionFieldSource
}

export interface VersionedAttributeModifier {
  readonly id: DefinitionField<string>
  readonly attribute: DefinitionField<SulfurCubeAttributeId>
  readonly amount: VersionedNumericField
  readonly operation: DefinitionField<AttributeModifierOperation>
}

export interface VersionedExplosionData {
  readonly power: VersionedNumericField
  readonly causesFire: DefinitionField<boolean>
  readonly fuse: VersionedNumericField
}

export interface VersionedContactDamage {
  readonly damageType: DefinitionField<string>
  readonly amount: VersionedNumericField
  readonly attributeToSource: DefinitionField<boolean>
}

export interface VersionedKnockbackModifiers {
  readonly horizontalPower: VersionedNumericField
  readonly verticalPower: VersionedNumericField
}

export interface VersionedSoundSettings {
  readonly hitSound: DefinitionField<string>
  readonly pushSound: DefinitionField<string>
  readonly pushSoundImpulseThreshold: VersionedNumericField
  readonly pushSoundCooldown: VersionedNumericField
}

export interface Je26_3ArchetypeDefinition {
  readonly id: Je26_3ArchetypeId
  readonly registryIndex: number
  readonly source: DefinitionFieldSource
  readonly items: DefinitionField<string>
  readonly attributeModifiers: readonly VersionedAttributeModifier[]
  readonly buoyant: DefinitionField<boolean>
  readonly explosion: VersionedExplosionData | null
  readonly contactDamage: VersionedContactDamage | null
  readonly knockbackModifiers: VersionedKnockbackModifiers
  readonly soundSettings: VersionedSoundSettings
}

export const je26_3ArchetypeRegistryOrder = [
  'minecraft:bouncy',
  'minecraft:explosive',
  'minecraft:fast_flat',
  'minecraft:fast_sliding',
  'minecraft:high_resistance',
  'minecraft:hot',
  'minecraft:light',
  'minecraft:regular',
  'minecraft:slow_bouncy',
  'minecraft:slow_flat',
  'minecraft:slow_sliding',
  'minecraft:sticky',
] as const

export type Je26_3ArchetypeId = (typeof je26_3ArchetypeRegistryOrder)[number]

type AttributeAmounts = readonly [number, number, number, number, number]
type FloatValueSpec = readonly [sourceDecimal: number, decodedFloat32: number]

interface ArchetypeSpec {
  readonly lineEnd: number
  readonly attributeAmounts: AttributeAmounts
  readonly buoyant?: true
  readonly explosion?: {
    readonly power: number
    readonly causesFire: boolean
    readonly fuse: number
  }
  readonly contactDamage?: {
    readonly damageType: string
    readonly amount: FloatValueSpec
    readonly attributeToSource: boolean
  }
  readonly horizontalPower: FloatValueSpec
  readonly verticalPower: FloatValueSpec
  readonly pushSoundImpulseThreshold: FloatValueSpec
  readonly pushSoundCooldown: FloatValueSpec
}

const archetypeSpecs = {
  'minecraft:bouncy': {
    lineEnd: 45,
    attributeAmounts: [-2, -2, 0.8999999761581421, -0.699999988079071, -0.9900000002235174],
    buoyant: true,
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.105, 0.10499999672174454],
    pushSoundImpulseThreshold: [0.3, 0.30000001192092896],
    pushSoundCooldown: [0.7, 0.699999988079071],
  },
  'minecraft:explosive': {
    lineEnd: 50,
    attributeAmounts: [-1, -1, 0.5, -0.699999988079071, -0.699999988079071],
    buoyant: true,
    explosion: { power: 3, causesFire: false, fuse: 120 },
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.1, 0.10000000149011612],
    pushSoundCooldown: [0.7, 0.699999988079071],
  },
  'minecraft:fast_flat': {
    lineEnd: 44,
    attributeAmounts: [-1, -1, 0.5, -0.7999999970197678, -0.9900000002235174],
    horizontalPower: [0.9125, 0.9125000238418579],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.03, 0.029999999329447746],
    pushSoundCooldown: [0.9, 0.8999999761581421],
  },
  'minecraft:fast_sliding': {
    lineEnd: 44,
    attributeAmounts: [0.5, 0.5, 0.10000000149011612, -0.9499999992549419, -0.9900000002235174],
    horizontalPower: [0.6625, 0.6625000238418579],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.05, 0.05000000074505806],
    pushSoundCooldown: [1, 1],
  },
  'minecraft:high_resistance': {
    lineEnd: 44,
    attributeAmounts: [
      0.699999988079071, 0.699999988079071, 0.20000000298023224, 0, -0.9900000002235174,
    ],
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.03, 0.029999999329447746],
    pushSoundCooldown: [0.7, 0.699999988079071],
  },
  'minecraft:hot': {
    lineEnd: 50,
    attributeAmounts: [-1, -1, 0.5, -0.699999988079071, -0.8999999985098839],
    buoyant: true,
    contactDamage: {
      damageType: 'minecraft:sulfur_cube_hot',
      amount: [1, 1],
      attributeToSource: false,
    },
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.2, 0.20000000298023224],
    pushSoundCooldown: [0.7, 0.699999988079071],
  },
  'minecraft:light': {
    lineEnd: 45,
    attributeAmounts: [-1, -1, 1, -0.699999988079071, 0.7999999523162842],
    buoyant: true,
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.18, 0.18000000715255737],
    pushSoundImpulseThreshold: [0.2, 0.20000000298023224],
    pushSoundCooldown: [0.7, 0.699999988079071],
  },
  'minecraft:regular': {
    lineEnd: 45,
    attributeAmounts: [-1, -1, 0.5, -0.699999988079071, -0.8999999985098839],
    buoyant: true,
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.2, 0.20000000298023224],
    pushSoundCooldown: [0.5, 0.5],
  },
  'minecraft:slow_bouncy': {
    lineEnd: 44,
    attributeAmounts: [
      0.4000000059604645, 0.4000000059604645, 0.6000000238418579, -0.699999988079071,
      -0.9499999992549419,
    ],
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.24, 0.23999999463558197],
    pushSoundImpulseThreshold: [0.05, 0.05000000074505806],
    pushSoundCooldown: [0.5, 0.5],
  },
  'minecraft:slow_flat': {
    lineEnd: 44,
    attributeAmounts: [0.5, 0.5, 0.4000000059604645, -0.5999999940395355, -0.8999999985098839],
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.105, 0.10499999672174454],
    pushSoundImpulseThreshold: [0.03, 0.029999999329447746],
    pushSoundCooldown: [0.9, 0.8999999761581421],
  },
  'minecraft:slow_sliding': {
    lineEnd: 44,
    attributeAmounts: [
      0.800000011920929, 0.800000011920929, 0.10000000149011612, -0.9499999992549419,
      -0.9900000002235174,
    ],
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.02, 0.019999999552965164],
    pushSoundCooldown: [1, 1],
  },
  'minecraft:sticky': {
    lineEnd: 44,
    attributeAmounts: [-2, -2, 0, 1, -0.9900000002235174],
    horizontalPower: [0.4125, 0.4124999940395355],
    verticalPower: [0.09, 0.09000000357627869],
    pushSoundImpulseThreshold: [0.05, 0.05000000074505806],
    pushSoundCooldown: [0.5, 0.5],
  },
} as const satisfies Record<Je26_3ArchetypeId, ArchetypeSpec>

const attributeFields = [
  {
    attribute: 'minecraft:knockback_resistance',
    idSuffix: 'add_knockback_resistance',
    operation: 'add_value',
  },
  {
    attribute: 'minecraft:explosion_knockback_resistance',
    idSuffix: 'add_explosion_knockback_resistance',
    operation: 'add_value',
  },
  {
    attribute: 'minecraft:bounciness',
    idSuffix: 'add_bounciness',
    operation: 'add_value',
  },
  {
    attribute: 'minecraft:friction_modifier',
    idSuffix: 'mul_friction_modifier',
    operation: 'add_multiplied_total',
  },
  {
    attribute: 'minecraft:air_drag_modifier',
    idSuffix: 'mul_air_drag_modifier',
    operation: 'add_multiplied_total',
  },
] as const satisfies readonly {
  readonly attribute: SulfurCubeAttributeId
  readonly idSuffix: string
  readonly operation: AttributeModifierOperation
}[]

function extractedSource(sourcePath: string, jsonPointer: string): DefinitionFieldSource {
  return { sourcePath, locator: jsonPointer }
}

function codecDefaultSource(field: string): DefinitionFieldSource {
  const record: ProvenanceRecord = provenance.sulfurCubeArchetypeCodec
  return {
    sourcePath: record.sourcePath,
    locator: `${record.locator}; ${field} default`,
  }
}

function field<T>(value: T, sourcePath: string, jsonPointer: string): DefinitionField<T> {
  return { value, source: extractedSource(sourcePath, jsonPointer) }
}

function floatField(
  values: FloatValueSpec,
  sourcePath: string,
  jsonPointer: string,
): VersionedNumericField {
  return {
    sourceDecimal: values[0],
    decodedValue: values[1],
    numericSourceType: 'float',
    source: extractedSource(sourcePath, jsonPointer),
  }
}

function doubleField(
  value: number,
  sourcePath: string,
  jsonPointer: string,
): VersionedNumericField {
  return {
    sourceDecimal: value,
    decodedValue: value,
    numericSourceType: 'double',
    source: extractedSource(sourcePath, jsonPointer),
  }
}

function integerField(
  value: number,
  sourcePath: string,
  jsonPointer: string,
): VersionedNumericField {
  return {
    sourceDecimal: value,
    decodedValue: value,
    numericSourceType: 'integer',
    source: extractedSource(sourcePath, jsonPointer),
  }
}

function createArchetypeDefinition(
  id: Je26_3ArchetypeId,
  registryIndex: number,
): Je26_3ArchetypeDefinition {
  const spec: ArchetypeSpec = archetypeSpecs[id]
  const name = id.slice('minecraft:'.length)
  const sourcePath = `versions/26.3/extracted/data/minecraft/sulfur_cube_archetype/${name}.json`
  const attributeModifiers = attributeFields.map((definition, index) => ({
    id: field(
      `minecraft:${name}_${definition.idSuffix}`,
      sourcePath,
      `/attribute_modifiers/${index}/id`,
    ),
    attribute: field(definition.attribute, sourcePath, `/attribute_modifiers/${index}/attribute`),
    amount: doubleField(
      spec.attributeAmounts[index],
      sourcePath,
      `/attribute_modifiers/${index}/amount`,
    ),
    operation: field(definition.operation, sourcePath, `/attribute_modifiers/${index}/operation`),
  }))

  return {
    id,
    registryIndex,
    source: {
      sourcePath,
      locator: `complete extracted definition (local lines 1-${spec.lineEnd})`,
    },
    items: field(`#minecraft:sulfur_cube_archetype/${name}`, sourcePath, '/items'),
    attributeModifiers,
    buoyant:
      spec.buoyant === true
        ? field(true, sourcePath, '/buoyant')
        : { value: false, source: codecDefaultSource('buoyant=false') },
    explosion:
      spec.explosion === undefined
        ? null
        : {
            power: integerField(spec.explosion.power, sourcePath, '/explosion/power'),
            causesFire: field(spec.explosion.causesFire, sourcePath, '/explosion/causes_fire'),
            fuse: integerField(spec.explosion.fuse, sourcePath, '/explosion/fuse'),
          },
    contactDamage:
      spec.contactDamage === undefined
        ? null
        : {
            damageType: field(
              spec.contactDamage.damageType,
              sourcePath,
              '/contact_damage/damage_type',
            ),
            amount: floatField(spec.contactDamage.amount, sourcePath, '/contact_damage/amount'),
            attributeToSource: field(
              spec.contactDamage.attributeToSource,
              sourcePath,
              '/contact_damage/attribute_to_source',
            ),
          },
    knockbackModifiers: {
      horizontalPower: floatField(
        spec.horizontalPower,
        sourcePath,
        '/knockback_modifiers/horizontal_power',
      ),
      verticalPower: floatField(
        spec.verticalPower,
        sourcePath,
        '/knockback_modifiers/vertical_power',
      ),
    },
    soundSettings: {
      hitSound: field(
        `minecraft:entity.sulfur_cube.${name}.hit`,
        sourcePath,
        '/sound_settings/hit_sound',
      ),
      pushSound: field(
        `minecraft:entity.sulfur_cube.${name}.push`,
        sourcePath,
        '/sound_settings/push_sound',
      ),
      pushSoundImpulseThreshold: floatField(
        spec.pushSoundImpulseThreshold,
        sourcePath,
        '/sound_settings/push_sound_impulse_threshold',
      ),
      pushSoundCooldown: floatField(
        spec.pushSoundCooldown,
        sourcePath,
        '/sound_settings/push_sound_cooldown',
      ),
    },
  }
}

export const je26_3Archetypes: readonly Je26_3ArchetypeDefinition[] = Object.freeze(
  je26_3ArchetypeRegistryOrder.map(createArchetypeDefinition),
)

export const je26_3ArchetypesById = Object.freeze(
  Object.fromEntries(je26_3Archetypes.map((definition) => [definition.id, definition])) as Record<
    Je26_3ArchetypeId,
    Je26_3ArchetypeDefinition
  >,
)

export const bouncyArchetypeDefinition = je26_3ArchetypesById['minecraft:bouncy']

const bouncyAttributeModifiers: readonly {
  readonly id: string
  readonly attribute: string
  readonly amount: SourcedValue<number>
  readonly operation: AttributeModifierOperation
}[] = bouncyArchetypeDefinition.attributeModifiers.map((modifier) => ({
  id: modifier.id.value,
  attribute: modifier.attribute.value,
  amount: sourcedValue(modifier.amount.decodedValue, ['bouncyArchetype']),
  operation: modifier.operation.value,
}))

/** Precomputed Bouncy profile used by fixed-scenario factories. */
export const bouncyArchetype = {
  id: bouncyArchetypeDefinition.id,
  items: sourcedValue(bouncyArchetypeDefinition.items.value, ['bouncyArchetype']),
  buoyant: sourcedValue(bouncyArchetypeDefinition.buoyant.value, ['bouncyArchetype']),
  knockbackModifiers: {
    horizontalPower: sourcedValue(
      bouncyArchetypeDefinition.knockbackModifiers.horizontalPower.sourceDecimal,
      ['bouncyArchetype'],
    ),
    verticalPower: sourcedValue(
      bouncyArchetypeDefinition.knockbackModifiers.verticalPower.sourceDecimal,
      ['bouncyArchetype'],
    ),
  },
  attributeModifiers: bouncyAttributeModifiers,
  effectiveProperties: {
    knockbackResistance: sourcedValue(
      -2,
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 0 plus the Bouncy -2 add_value modifier.',
    ),
    explosionKnockbackResistance: sourcedValue(
      0,
      ['attributeDefaults', 'attributeFolding', 'attributeSanitization', 'bouncyArchetype'],
      'Default 0 plus the Bouncy -2 add_value modifier, sanitized to the attribute range [0, 1].',
    ),
    bounciness: sourcedValue(
      0.8999999761581421,
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 0 plus the Bouncy add_value modifier.',
    ),
    frictionModifier: sourcedValue(
      je26_3Constants.defaultFrictionModifier.value * (1 - 0.699999988079071),
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 1 multiplied by (1 + the Bouncy add_multiplied_total amount).',
    ),
    airDragModifier: sourcedValue(
      je26_3Constants.defaultAirDragModifier.value * (1 - 0.9900000002235174),
      ['attributeDefaults', 'attributeFolding', 'bouncyArchetype'],
      'Default 1 multiplied by (1 + the Bouncy add_multiplied_total amount).',
    ),
  },
} as const
