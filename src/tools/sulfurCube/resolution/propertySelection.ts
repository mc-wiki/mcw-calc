import type { Je26_3ArchetypeId } from '../data/je26_3'
import type { CubeLaunchProperties } from '../model/types'
import type { BlockResolutionDiagnostic } from './blockResolution'
import type { AttributeFoldDiagnostic, ResolvedCubeProfile } from './types'
import { je26_3ArchetypesById, je26_3BlockMembershipIndex } from '../data/je26_3'
import { parseNumericInput } from '../input/numericInput'
import { resolveJe26_3Block } from './blockResolution'
import { resolveArchetype, toCubeMechanicsProperties } from './cubeProperties'

export type CubePropertyMode = 'block' | 'archetype' | 'custom'
export type LockedCubePropertyMode = Exclude<CubePropertyMode, 'custom'>
export type CustomPropertyField = keyof CubeLaunchProperties
export type CustomPropertyInput = string | number

export interface CustomCubePropertyFormState {
  readonly horizontalPower: CustomPropertyInput
  readonly verticalPower: CustomPropertyInput
  readonly knockbackResistance: CustomPropertyInput
  readonly bounciness: CustomPropertyInput
  readonly airDragModifier: CustomPropertyInput
  readonly frictionModifier: CustomPropertyInput
}

export type CubePropertySelectionSource =
  | {
      readonly kind: 'block'
      readonly itemId: string
      readonly candidateIds: readonly string[]
    }
  | {
      readonly kind: 'archetype'
      readonly archetypeId: Je26_3ArchetypeId
      readonly candidateIds: readonly string[]
    }

export interface CustomCubePropertyWorkingCopy {
  readonly formState: CustomCubePropertyFormState
  readonly baseProfile: ResolvedCubeProfile
  readonly copiedFrom: CubePropertySelectionSource
}

export interface CubePropertySelectionState {
  readonly mode: CubePropertyMode
  readonly lastLockedMode: LockedCubePropertyMode
  readonly selectedBlockId: string
  readonly selectedArchetypeId: Je26_3ArchetypeId
  readonly customWorkingCopy: CustomCubePropertyWorkingCopy | null
}

export type CustomPropertyDiagnostic =
  | {
      readonly kind: 'invalid_custom_number'
      readonly field: CustomPropertyField
      readonly input: CustomPropertyInput
    }
  | {
      readonly kind: 'custom_value_out_of_range'
      readonly field: 'knockbackResistance' | 'bounciness' | 'airDragModifier' | 'frictionModifier'
      readonly value: number
      readonly minimum: number
      readonly maximum: number
    }

export type CubePropertySelectionDiagnostic =
  | AttributeFoldDiagnostic
  | BlockResolutionDiagnostic
  | CustomPropertyDiagnostic

export interface CubePropertySelectionResolution {
  readonly mode: CubePropertyMode
  readonly editable: boolean
  readonly profile: ResolvedCubeProfile
  readonly values: CubeLaunchProperties | null
  readonly source: CubePropertySelectionSource
  readonly candidateIds: readonly string[]
  readonly diagnostics: readonly CubePropertySelectionDiagnostic[]
  readonly supported: boolean
}

const defaultBlockId = 'minecraft:oak_planks'
const defaultArchetypeId = 'minecraft:bouncy'

export const je26_3ArchetypeRepresentativeBlocks = {
  'minecraft:bouncy': 'minecraft:oak_planks',
  'minecraft:explosive': 'minecraft:tnt',
  'minecraft:fast_flat': 'minecraft:carved_pumpkin',
  'minecraft:fast_sliding': 'minecraft:blue_ice',
  'minecraft:high_resistance': 'minecraft:soul_sand',
  'minecraft:hot': 'minecraft:magma_block',
  'minecraft:light': 'minecraft:light_blue_wool',
  'minecraft:regular': 'minecraft:grass_block',
  'minecraft:slow_bouncy': 'minecraft:amethyst_block',
  'minecraft:slow_flat': 'minecraft:cut_copper',
  'minecraft:slow_sliding': 'minecraft:red_mushroom_block',
  'minecraft:sticky': 'minecraft:honeycomb_block',
} as const satisfies Record<Je26_3ArchetypeId, string>

function toFormState(values: CubeLaunchProperties): CustomCubePropertyFormState {
  return {
    horizontalPower: String(values.horizontalPower),
    verticalPower: String(values.verticalPower),
    knockbackResistance: String(values.knockbackResistance),
    bounciness: String(values.bounciness),
    airDragModifier: String(values.airDragModifier),
    frictionModifier: String(values.frictionModifier),
  }
}

function valuesFromProfile(profile: ResolvedCubeProfile): CubeLaunchProperties {
  return {
    ...toCubeMechanicsProperties(profile),
    bounciness: profile.attributes['minecraft:bounciness'].effectiveValue,
    airDragModifier: profile.attributes['minecraft:air_drag_modifier'].effectiveValue,
    frictionModifier: profile.attributes['minecraft:friction_modifier'].effectiveValue,
  }
}

function resolveLockedSelection(
  state: CubePropertySelectionState,
): CubePropertySelectionResolution {
  if (state.lastLockedMode === 'block') {
    const result = resolveJe26_3Block(state.selectedBlockId, 'known_block_item')

    return {
      mode: 'block',
      editable: false,
      profile: result.profile,
      values: valuesFromProfile(result.profile),
      source: {
        kind: 'block',
        itemId: state.selectedBlockId,
        candidateIds: [...result.orderedCandidateIds],
      },
      candidateIds: [...result.orderedCandidateIds],
      diagnostics: [...result.diagnostics, ...result.profile.diagnostics],
      supported: result.supported,
    }
  }

  const profile = resolveArchetype(je26_3ArchetypesById[state.selectedArchetypeId])

  return {
    mode: 'archetype',
    editable: false,
    profile,
    values: valuesFromProfile(profile),
    source: {
      kind: 'archetype',
      archetypeId: state.selectedArchetypeId,
      candidateIds: [...profile.orderedCandidateIds],
    },
    candidateIds: [...profile.orderedCandidateIds],
    diagnostics: [...profile.diagnostics],
    supported: profile.supported,
  }
}

function copyLockedSelection(state: CubePropertySelectionState): CustomCubePropertyWorkingCopy {
  const locked = resolveLockedSelection(state)

  if (locked.values === null) {
    throw new RangeError('locked cube property selection must be valid')
  }

  return {
    formState: toFormState(locked.values),
    baseProfile: locked.profile,
    copiedFrom: locked.source,
  }
}

function parseCustomValues(formState: CustomCubePropertyFormState): {
  readonly values: CubeLaunchProperties | null
  readonly diagnostics: readonly CustomPropertyDiagnostic[]
} {
  const parsed = {} as Record<CustomPropertyField, number>
  const diagnostics: CustomPropertyDiagnostic[] = []

  for (const field of Object.keys(formState) as CustomPropertyField[]) {
    const input = formState[field]
    const value = parseNumericInput(input)

    if (value === null) {
      diagnostics.push({ kind: 'invalid_custom_number', field, input })
    } else {
      parsed[field] = value
    }
  }

  const knockbackResistance = parsed.knockbackResistance
  if (knockbackResistance !== undefined && (knockbackResistance < -2 || knockbackResistance > 1)) {
    diagnostics.push({
      kind: 'custom_value_out_of_range',
      field: 'knockbackResistance',
      value: knockbackResistance,
      minimum: -2,
      maximum: 1,
    })
  }

  const airDragModifier = parsed.airDragModifier
  if (airDragModifier !== undefined && (airDragModifier < 0 || airDragModifier > 2048)) {
    diagnostics.push({
      kind: 'custom_value_out_of_range',
      field: 'airDragModifier',
      value: airDragModifier,
      minimum: 0,
      maximum: 2048,
    })
  }

  const bounciness = parsed.bounciness
  if (bounciness !== undefined && (bounciness < 0 || bounciness > 1)) {
    diagnostics.push({
      kind: 'custom_value_out_of_range',
      field: 'bounciness',
      value: bounciness,
      minimum: 0,
      maximum: 1,
    })
  }

  const frictionModifier = parsed.frictionModifier
  if (frictionModifier !== undefined && (frictionModifier < 0 || frictionModifier > 2048)) {
    diagnostics.push({
      kind: 'custom_value_out_of_range',
      field: 'frictionModifier',
      value: frictionModifier,
      minimum: 0,
      maximum: 2048,
    })
  }

  return {
    values:
      diagnostics.length === 0
        ? {
            horizontalPower: parsed.horizontalPower,
            verticalPower: parsed.verticalPower,
            knockbackResistance: parsed.knockbackResistance,
            bounciness: parsed.bounciness,
            airDragModifier: parsed.airDragModifier,
            frictionModifier: parsed.frictionModifier,
          }
        : null,
    diagnostics,
  }
}

export function createDefaultCubePropertySelectionState(): CubePropertySelectionState {
  return {
    mode: 'block',
    lastLockedMode: 'block',
    selectedBlockId: defaultBlockId,
    selectedArchetypeId: defaultArchetypeId,
    customWorkingCopy: null,
  }
}

export function selectCubePropertyMode(
  state: CubePropertySelectionState,
  mode: CubePropertyMode,
): CubePropertySelectionState {
  if (mode === 'custom') {
    return {
      ...state,
      mode,
      customWorkingCopy: state.customWorkingCopy ?? copyLockedSelection(state),
    }
  }

  return {
    ...state,
    mode,
    lastLockedMode: mode,
  }
}

export function selectCubePropertyBlock(
  state: CubePropertySelectionState,
  itemId: string,
): CubePropertySelectionState {
  if (je26_3BlockMembershipIndex[itemId] === undefined) {
    throw new RangeError(`unknown JE 26.3 swallowable block item: ${itemId}`)
  }

  return {
    ...state,
    selectedBlockId: itemId,
    ...(state.mode === 'block' ? { lastLockedMode: 'block' as const } : {}),
  }
}

export function selectCubePropertyArchetype(
  state: CubePropertySelectionState,
  archetypeId: Je26_3ArchetypeId,
): CubePropertySelectionState {
  if (je26_3ArchetypesById[archetypeId] === undefined) {
    throw new RangeError(`unknown JE 26.3 sulfur cube archetype: ${archetypeId}`)
  }

  return {
    ...state,
    selectedArchetypeId: archetypeId,
    selectedBlockId: je26_3ArchetypeRepresentativeBlocks[archetypeId],
    ...(state.mode === 'archetype' ? { lastLockedMode: 'archetype' as const } : {}),
  }
}

export function updateCustomCubeProperty(
  state: CubePropertySelectionState,
  field: CustomPropertyField,
  input: CustomPropertyInput,
): CubePropertySelectionState {
  const customWorkingCopy = state.customWorkingCopy ?? copyLockedSelection(state)

  return {
    ...state,
    customWorkingCopy: {
      ...customWorkingCopy,
      formState: {
        ...customWorkingCopy.formState,
        [field]: input,
      },
    },
  }
}

export function copyCurrentResolvedCubeProperties(
  state: CubePropertySelectionState,
): CubePropertySelectionState {
  return {
    ...state,
    customWorkingCopy: copyLockedSelection(state),
  }
}

export function resolveCubePropertySelection(
  state: CubePropertySelectionState,
): CubePropertySelectionResolution {
  if (state.mode !== 'custom') {
    return resolveLockedSelection({
      ...state,
      lastLockedMode: state.mode,
    })
  }

  const customWorkingCopy = state.customWorkingCopy ?? copyLockedSelection(state)
  const parsed = parseCustomValues(customWorkingCopy.formState)

  return {
    mode: 'custom',
    editable: true,
    profile: customWorkingCopy.baseProfile,
    values: parsed.values,
    source: customWorkingCopy.copiedFrom,
    candidateIds: [...customWorkingCopy.copiedFrom.candidateIds],
    diagnostics: [...customWorkingCopy.baseProfile.diagnostics, ...parsed.diagnostics],
    supported: customWorkingCopy.baseProfile.supported && parsed.diagnostics.length === 0,
  }
}
