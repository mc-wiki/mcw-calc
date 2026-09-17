import type {
  AttributeModifierOperation,
  DefinitionField,
  DefinitionFieldSource,
  SulfurCubeAttributeId,
  VersionedContactDamage,
  VersionedExplosionData,
  VersionedKnockbackModifiers,
  VersionedNumericField,
  VersionedSoundSettings,
} from '../data/je26_3'

export interface AttributeDefinition {
  readonly id: SulfurCubeAttributeId
  readonly baseValue: number
  readonly minimum: number
  readonly maximum: number
}

export interface ResolvableAttributeModifier {
  readonly id: string
  readonly attributeId: string
  readonly amount: number
  readonly operation: AttributeModifierOperation
  readonly source?: DefinitionFieldSource
}

export interface SourcedAttributeModifier extends ResolvableAttributeModifier {
  readonly sourceCandidateId: string
}

export type AttributeModifierActionStatus = 'added' | 'replaced_same_operation' | 'ignored'

export interface AttributeModifierAction {
  readonly candidateId: string
  readonly modifier: SourcedAttributeModifier
  readonly status: AttributeModifierActionStatus
  readonly replacedModifier: SourcedAttributeModifier | null
  readonly leavesEarlierOperationEntry: boolean
}

export type AttributeFoldDiagnostic =
  | {
      readonly kind: 'ignored_unavailable_attribute'
      readonly candidateId: string
      readonly modifier: SourcedAttributeModifier
    }
  | {
      readonly kind: 'same_operation_modifier_replaced'
      readonly candidateId: string
      readonly previous: SourcedAttributeModifier
      readonly replacement: SourcedAttributeModifier
    }
  | {
      readonly kind: 'unsupported_cross_operation_modifier_id'
      readonly candidateId: string
      readonly previous: SourcedAttributeModifier
      readonly replacement: SourcedAttributeModifier
    }
  | {
      readonly kind: 'attribute_value_sanitized'
      readonly attributeId: SulfurCubeAttributeId
      readonly preSanitization: number
      readonly effectiveValue: number
      readonly reason: 'nan_to_minimum' | 'clamped_to_minimum' | 'clamped_to_maximum'
    }

export interface ActiveModifiersByOperation {
  readonly add_value: readonly SourcedAttributeModifier[]
  readonly add_multiplied_base: readonly SourcedAttributeModifier[]
  readonly add_multiplied_total: readonly SourcedAttributeModifier[]
}

export interface AttributeResolution {
  readonly definition: AttributeDefinition
  readonly baseAfterAddValue: number
  readonly afterMultipliedBase: number
  readonly preSanitization: number
  readonly effectiveValue: number
  readonly activeModifiersByOperation: ActiveModifiersByOperation
}

export interface AttributeFoldResult {
  readonly attributes: Readonly<Record<SulfurCubeAttributeId, AttributeResolution>>
  readonly actions: readonly AttributeModifierAction[]
  readonly actionGroups: readonly AttributeActionGroup[]
  readonly diagnostics: readonly AttributeFoldDiagnostic[]
  readonly supported: boolean
}

export interface AttributeCandidateInput {
  readonly candidateId: string
  readonly modifiers: readonly ResolvableAttributeModifier[]
}

export interface AttributeActionGroup {
  readonly candidateId: string
  readonly actions: readonly AttributeModifierAction[]
}

export interface ResolvableCubeDefinition {
  readonly id: string
  readonly attributeModifiers: readonly ResolvableAttributeModifier[]
  readonly buoyant: boolean
  readonly explosion: VersionedExplosionData | null
  readonly contactDamage: VersionedContactDamage | null
  readonly knockbackModifiers: VersionedKnockbackModifiers
  readonly soundSettings: VersionedSoundSettings
}

export interface ResolvedExplosionData {
  readonly value: VersionedExplosionData
  readonly sourceCandidateId: string
}

export interface ResolvedContactDamage {
  readonly value: VersionedContactDamage
  readonly sourceCandidateId: string
}

export interface ResolvedNumericSelection {
  readonly value: VersionedNumericField
  readonly sourceCandidateId: string | null
}

export interface ResolvedKnockbackModifiers {
  readonly horizontalPower: ResolvedNumericSelection
  readonly verticalPower: ResolvedNumericSelection
}

export interface ResolvedSoundSettings {
  readonly hitSound: DefinitionField<string>
  readonly pushSound: DefinitionField<string>
  readonly pushSoundImpulseThreshold: ResolvedNumericSelection
  readonly pushSoundCooldown: ResolvedNumericSelection
  readonly sourceCandidateId: string | null
}

export interface CubePropertyFoldStep {
  readonly candidateId: string
  readonly buoyantBefore: boolean
  readonly buoyantAfter: boolean
  readonly explosionAction: 'retain_previous' | 'overwrite_with_present_value'
  readonly contactDamageAction: 'none' | 'append'
  readonly knockbackAction: 'overwrite'
  readonly soundAction: 'overwrite'
  readonly attributeActions: readonly AttributeModifierAction[]
}

export type NumericRepresentation = 'source_decimal' | 'decoded_float32'

export interface ResolvedCubeProfile {
  readonly orderedCandidateIds: readonly string[]
  readonly candidateDefinitions: readonly ResolvableCubeDefinition[]
  readonly attributes: Readonly<Record<SulfurCubeAttributeId, AttributeResolution>>
  readonly buoyant: boolean
  readonly explosion: ResolvedExplosionData | null
  readonly contactDamages: readonly ResolvedContactDamage[]
  readonly knockbackModifiers: ResolvedKnockbackModifiers
  readonly soundSettings: ResolvedSoundSettings
  readonly foldTrace: readonly CubePropertyFoldStep[]
  readonly diagnostics: readonly AttributeFoldDiagnostic[]
  readonly supported: boolean
}
