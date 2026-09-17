import type { AttributeModifierOperation, SulfurCubeAttributeId } from '../data/je26_3'
import type {
  ActiveModifiersByOperation,
  AttributeCandidateInput,
  AttributeDefinition,
  AttributeFoldDiagnostic,
  AttributeFoldResult,
  AttributeModifierAction,
  AttributeResolution,
  SourcedAttributeModifier,
} from './types'
import { je26_3CubeAttributeDefinitions } from '../data/je26_3'

const operationOrder = [
  'add_value',
  'add_multiplied_base',
  'add_multiplied_total',
] as const satisfies readonly AttributeModifierOperation[]

export const je26_3AttributeDefinitions = Object.freeze(
  Object.fromEntries(
    Object.entries(je26_3CubeAttributeDefinitions).map(([id, definition]) => [
      id,
      {
        id,
        baseValue: definition.defaultValue.value,
        minimum: definition.minimum.value,
        maximum: definition.maximum.value,
      },
    ]),
  ) as Record<SulfurCubeAttributeId, AttributeDefinition>,
)

interface MutableAttributeState {
  readonly definition: AttributeDefinition
  readonly currentModifierById: Map<string, SourcedAttributeModifier>
  readonly modifiersByOperation: Record<
    AttributeModifierOperation,
    Map<string, SourcedAttributeModifier>
  >
}

function createMutableState(definition: AttributeDefinition): MutableAttributeState {
  return {
    definition,
    currentModifierById: new Map(),
    modifiersByOperation: {
      add_value: new Map(),
      add_multiplied_base: new Map(),
      add_multiplied_total: new Map(),
    },
  }
}

function sanitizeAttributeValue(
  definition: AttributeDefinition,
  value: number,
): {
  readonly effectiveValue: number
  readonly diagnostic: AttributeFoldDiagnostic | null
} {
  if (Number.isNaN(value)) {
    return {
      effectiveValue: definition.minimum,
      diagnostic: {
        kind: 'attribute_value_sanitized',
        attributeId: definition.id,
        preSanitization: value,
        effectiveValue: definition.minimum,
        reason: 'nan_to_minimum',
      },
    }
  }
  if (value < definition.minimum) {
    return {
      effectiveValue: definition.minimum,
      diagnostic: {
        kind: 'attribute_value_sanitized',
        attributeId: definition.id,
        preSanitization: value,
        effectiveValue: definition.minimum,
        reason: 'clamped_to_minimum',
      },
    }
  }
  if (value > definition.maximum) {
    return {
      effectiveValue: definition.maximum,
      diagnostic: {
        kind: 'attribute_value_sanitized',
        attributeId: definition.id,
        preSanitization: value,
        effectiveValue: definition.maximum,
        reason: 'clamped_to_maximum',
      },
    }
  }
  return { effectiveValue: value, diagnostic: null }
}

function resolveAttribute(state: MutableAttributeState): {
  readonly resolution: AttributeResolution
  readonly diagnostic: AttributeFoldDiagnostic | null
} {
  const activeModifiersByOperation = Object.fromEntries(
    operationOrder.map((operation) => [
      operation,
      [...state.modifiersByOperation[operation].values()],
    ]),
  ) as unknown as ActiveModifiersByOperation

  let baseAfterAddValue = state.definition.baseValue
  for (const modifier of activeModifiersByOperation.add_value) {
    baseAfterAddValue += modifier.amount
  }

  let afterMultipliedBase = baseAfterAddValue
  for (const modifier of activeModifiersByOperation.add_multiplied_base) {
    afterMultipliedBase += baseAfterAddValue * modifier.amount
  }

  let preSanitization = afterMultipliedBase
  for (const modifier of activeModifiersByOperation.add_multiplied_total) {
    preSanitization *= 1 + modifier.amount
  }

  const sanitized = sanitizeAttributeValue(state.definition, preSanitization)
  return {
    resolution: {
      definition: state.definition,
      baseAfterAddValue,
      afterMultipliedBase,
      preSanitization,
      effectiveValue: sanitized.effectiveValue,
      activeModifiersByOperation,
    },
    diagnostic: sanitized.diagnostic,
  }
}

export function foldAttributeModifiers(
  candidates: readonly AttributeCandidateInput[],
  definitions: Readonly<
    Record<SulfurCubeAttributeId, AttributeDefinition>
  > = je26_3AttributeDefinitions,
): AttributeFoldResult {
  const states = Object.fromEntries(
    Object.values(definitions).map((definition) => [definition.id, createMutableState(definition)]),
  ) as Record<SulfurCubeAttributeId, MutableAttributeState>
  const actions: AttributeModifierAction[] = []
  const actionGroups: { candidateId: string; actions: AttributeModifierAction[] }[] = []
  const diagnostics: AttributeFoldDiagnostic[] = []

  for (const candidate of candidates) {
    const candidateActions: AttributeModifierAction[] = []
    for (const modifier of candidate.modifiers) {
      const sourcedModifier: SourcedAttributeModifier = {
        ...modifier,
        sourceCandidateId: candidate.candidateId,
      }
      const state = states[modifier.attributeId as SulfurCubeAttributeId]

      if (state === undefined) {
        const action: AttributeModifierAction = {
          candidateId: candidate.candidateId,
          modifier: sourcedModifier,
          status: 'ignored',
          replacedModifier: null,
          leavesEarlierOperationEntry: false,
        }
        actions.push(action)
        candidateActions.push(action)
        diagnostics.push({
          kind: 'ignored_unavailable_attribute',
          candidateId: candidate.candidateId,
          modifier: sourcedModifier,
        })
        continue
      }

      const previous = state.currentModifierById.get(modifier.id) ?? null
      let status: AttributeModifierAction['status'] = 'added'
      let leavesEarlierOperationEntry = false

      if (previous !== null) {
        if (previous.operation === modifier.operation) {
          status = 'replaced_same_operation'
          state.modifiersByOperation[modifier.operation].set(modifier.id, sourcedModifier)
          diagnostics.push({
            kind: 'same_operation_modifier_replaced',
            candidateId: candidate.candidateId,
            previous,
            replacement: sourcedModifier,
          })
        } else {
          leavesEarlierOperationEntry = true
          state.modifiersByOperation[modifier.operation].set(modifier.id, sourcedModifier)
          diagnostics.push({
            kind: 'unsupported_cross_operation_modifier_id',
            candidateId: candidate.candidateId,
            previous,
            replacement: sourcedModifier,
          })
        }
      } else {
        state.modifiersByOperation[modifier.operation].set(modifier.id, sourcedModifier)
      }

      state.currentModifierById.set(modifier.id, sourcedModifier)
      const action: AttributeModifierAction = {
        candidateId: candidate.candidateId,
        modifier: sourcedModifier,
        status,
        replacedModifier: previous,
        leavesEarlierOperationEntry,
      }
      actions.push(action)
      candidateActions.push(action)
    }
    actionGroups.push({ candidateId: candidate.candidateId, actions: candidateActions })
  }

  const attributes = {} as Record<SulfurCubeAttributeId, AttributeResolution>
  for (const definition of Object.values(definitions)) {
    const resolved = resolveAttribute(states[definition.id])
    attributes[definition.id] = resolved.resolution
    if (resolved.diagnostic !== null) diagnostics.push(resolved.diagnostic)
  }

  return {
    attributes,
    actions,
    actionGroups,
    diagnostics,
    supported: !diagnostics.some(
      (diagnostic) => diagnostic.kind === 'unsupported_cross_operation_modifier_id',
    ),
  }
}
