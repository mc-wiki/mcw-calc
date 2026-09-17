import type {
  DefinitionField,
  DefinitionFieldSource,
  Je26_3ArchetypeDefinition,
  VersionedNumericField,
} from '../data/je26_3'
import type { CubeMechanicsProperties, TrajectoryAssumptions } from '../model/types'
import type { NumericBackend } from '../numerics/types'
import type {
  CubePropertyFoldStep,
  NumericRepresentation,
  ResolvableCubeDefinition,
  ResolvedCubeProfile,
  ResolvedKnockbackModifiers,
  ResolvedSoundSettings,
} from './types'
import { je26_3Constants, provenance } from '../data/je26_3'
import { computeModifiedFriction } from '../model/trajectory'
import { foldAttributeModifiers } from './attributes'

function defaultSource(locator: string): DefinitionFieldSource {
  return {
    sourcePath: provenance.sulfurCubeArchetypeApplication.sourcePath,
    locator: `${provenance.sulfurCubeArchetypeApplication.locator}; ${locator}`,
  }
}

function defaultField<T>(value: T, locator: string): DefinitionField<T> {
  return { value, source: defaultSource(locator) }
}

function defaultFloat(
  sourceDecimal: number,
  decodedValue: number,
  locator: string,
): VersionedNumericField {
  return {
    sourceDecimal,
    decodedValue,
    numericSourceType: 'float',
    source: defaultSource(locator),
  }
}

const defaultKnockbackModifiers: ResolvedKnockbackModifiers = {
  horizontalPower: {
    value: defaultFloat(0.33, 0.33000001311302185, 'default horizontal power 0.33F'),
    sourceCandidateId: null,
  },
  verticalPower: {
    value: defaultFloat(0.06, 0.05999999865889549, 'default vertical power 0.06F'),
    sourceCandidateId: null,
  },
}

const defaultSoundSettings: ResolvedSoundSettings = {
  hitSound: defaultField('minecraft:entity.sulfur_cube.regular.hit', 'default regular hit sound'),
  pushSound: defaultField(
    'minecraft:entity.sulfur_cube.regular.push',
    'default regular push sound',
  ),
  pushSoundImpulseThreshold: {
    value: defaultFloat(0.2, 0.20000000298023224, 'default impulse threshold 0.2F'),
    sourceCandidateId: null,
  },
  pushSoundCooldown: {
    value: defaultFloat(0.5, 0.5, 'default push sound cooldown 0.5F'),
    sourceCandidateId: null,
  },
  sourceCandidateId: null,
}

function isVersionedDefinition(
  definition: ResolvableCubeDefinition | Je26_3ArchetypeDefinition,
): definition is Je26_3ArchetypeDefinition {
  return 'registryIndex' in definition
}

export function toResolvableCubeDefinition(
  definition: Je26_3ArchetypeDefinition,
): ResolvableCubeDefinition {
  return {
    id: definition.id,
    attributeModifiers: definition.attributeModifiers.map((modifier) => ({
      id: modifier.id.value,
      attributeId: modifier.attribute.value,
      amount: modifier.amount.decodedValue,
      operation: modifier.operation.value,
      source: modifier.amount.source,
    })),
    buoyant: definition.buoyant.value,
    explosion: definition.explosion,
    contactDamage: definition.contactDamage,
    knockbackModifiers: definition.knockbackModifiers,
    soundSettings: definition.soundSettings,
  }
}

function valueForRepresentation(
  value: VersionedNumericField,
  representation: NumericRepresentation,
): number {
  return representation === 'source_decimal' ? value.sourceDecimal : value.decodedValue
}

export function foldMatchingDefinitions(
  matches: readonly (ResolvableCubeDefinition | Je26_3ArchetypeDefinition)[],
): ResolvedCubeProfile {
  const definitions = matches.map((definition) =>
    isVersionedDefinition(definition) ? toResolvableCubeDefinition(definition) : definition,
  )
  const attributeFold = foldAttributeModifiers(
    definitions.map((definition) => ({
      candidateId: definition.id,
      modifiers: definition.attributeModifiers,
    })),
  )

  let buoyant = false
  let explosion: ResolvedCubeProfile['explosion'] = null
  const contactDamages: ResolvedCubeProfile['contactDamages'][number][] = []
  let knockbackModifiers = defaultKnockbackModifiers
  let soundSettings = defaultSoundSettings
  const foldTrace: CubePropertyFoldStep[] = []

  definitions.forEach((definition, index) => {
    const buoyantBefore = buoyant
    buoyant ||= definition.buoyant
    const explosionAction =
      definition.explosion === null ? 'retain_previous' : 'overwrite_with_present_value'
    if (definition.explosion !== null) {
      explosion = { value: definition.explosion, sourceCandidateId: definition.id }
    }
    const contactDamageAction = definition.contactDamage === null ? 'none' : 'append'
    if (definition.contactDamage !== null) {
      contactDamages.push({ value: definition.contactDamage, sourceCandidateId: definition.id })
    }
    knockbackModifiers = {
      horizontalPower: {
        value: definition.knockbackModifiers.horizontalPower,
        sourceCandidateId: definition.id,
      },
      verticalPower: {
        value: definition.knockbackModifiers.verticalPower,
        sourceCandidateId: definition.id,
      },
    }
    soundSettings = {
      hitSound: definition.soundSettings.hitSound,
      pushSound: definition.soundSettings.pushSound,
      pushSoundImpulseThreshold: {
        value: definition.soundSettings.pushSoundImpulseThreshold,
        sourceCandidateId: definition.id,
      },
      pushSoundCooldown: {
        value: definition.soundSettings.pushSoundCooldown,
        sourceCandidateId: definition.id,
      },
      sourceCandidateId: definition.id,
    }
    foldTrace.push({
      candidateId: definition.id,
      buoyantBefore,
      buoyantAfter: buoyant,
      explosionAction,
      contactDamageAction,
      knockbackAction: 'overwrite',
      soundAction: 'overwrite',
      attributeActions: attributeFold.actionGroups[index].actions,
    })
  })

  return {
    orderedCandidateIds: definitions.map(({ id }) => id),
    candidateDefinitions: definitions,
    attributes: attributeFold.attributes,
    buoyant,
    explosion,
    contactDamages,
    knockbackModifiers,
    soundSettings,
    foldTrace,
    diagnostics: attributeFold.diagnostics,
    supported: attributeFold.supported,
  }
}

export function resolveArchetype(definition: Je26_3ArchetypeDefinition): ResolvedCubeProfile {
  return foldMatchingDefinitions([definition])
}

export function toCubeMechanicsProperties(
  profile: ResolvedCubeProfile,
  representation: NumericRepresentation = 'source_decimal',
): CubeMechanicsProperties {
  return {
    horizontalPower: valueForRepresentation(
      profile.knockbackModifiers.horizontalPower.value,
      representation,
    ),
    verticalPower: valueForRepresentation(
      profile.knockbackModifiers.verticalPower.value,
      representation,
    ),
    knockbackResistance: profile.attributes['minecraft:knockback_resistance'].effectiveValue,
  }
}

export function toTrajectoryAssumptions(
  profile: ResolvedCubeProfile,
  numerics: NumericBackend,
): TrajectoryAssumptions {
  return {
    gravity: je26_3Constants.defaultGravity.value,
    drag: computeModifiedFriction(
      je26_3Constants.baseAirDrag.value,
      profile.attributes['minecraft:air_drag_modifier'].effectiveValue,
      numerics,
    ),
    movementCutoff: je26_3Constants.movementCutoff.value,
  }
}
