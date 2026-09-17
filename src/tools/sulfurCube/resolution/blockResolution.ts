import type { Je26_3ArchetypeDefinition } from '../data/je26_3'
import type { ResolvableCubeDefinition, ResolvedCubeProfile } from './types'
import { je26_3Archetypes, je26_3BlockMembershipIndex } from '../data/je26_3'
import { foldMatchingDefinitions } from './cubeProperties'

export type BlockItemClassification =
  | 'known_block_item'
  | 'known_non_block_item'
  | 'block_without_usable_item_stack'
  | 'unknown'

export interface BlockMembershipEntry {
  readonly itemId: string
  readonly orderedCandidateIds: readonly string[]
  readonly rootTagIds: readonly string[]
}

export type BlockMembershipIndex = Readonly<Partial<Record<string, BlockMembershipEntry>>>

export type BlockResolutionDiagnostic =
  | {
      readonly kind: 'item_not_swallowable'
      readonly itemId: string
      readonly itemClassification: Exclude<BlockItemClassification, 'unknown'>
    }
  | {
      readonly kind: 'unknown_item_identity'
      readonly itemId: string
    }
  | {
      readonly kind: 'swallowable_item_without_candidate'
      readonly itemId: string
    }
  | {
      readonly kind: 'missing_candidate_definition'
      readonly itemId: string
      readonly candidateId: string
    }
  | {
      readonly kind: 'classification_conflicts_with_membership'
      readonly itemId: string
      readonly itemClassification: 'known_non_block_item' | 'block_without_usable_item_stack'
    }

type CandidateDefinition = ResolvableCubeDefinition | Je26_3ArchetypeDefinition

export interface BlockDefinitionMatchResult {
  readonly itemId: string
  readonly membershipEntry: BlockMembershipEntry | null
  /** Candidate ids in membership-data order, retained for diagnostics. */
  readonly referencedCandidateIds: readonly string[]
  /** Matching ids in registry/runtime definition order, used for folding. */
  readonly orderedCandidateIds: readonly string[]
  readonly candidateDefinitions: readonly CandidateDefinition[]
  readonly diagnostics: readonly BlockResolutionDiagnostic[]
}

export type BlockResolutionOutcome =
  | 'resolved'
  | 'forced_no_match'
  | 'unknown_item'
  | 'incomplete_membership'

export type BlockEligibility = 'swallowable' | 'not_swallowable' | 'unknown'

export interface BlockResolutionResult extends BlockDefinitionMatchResult {
  /** Effective identity knowledge after applying audited membership. */
  readonly itemClassification: BlockItemClassification
  /** Caller knowledge used for absent ids and contradiction diagnostics. */
  readonly suppliedItemClassification: BlockItemClassification
  readonly eligibility: BlockEligibility
  readonly outcome: BlockResolutionOutcome
  readonly profile: ResolvedCubeProfile
  readonly supported: boolean
}

/**
 * Match membership candidates against definitions in definition order. JE folds
 * matching holders in sulfur-cube archetype registry order, not item-tag order.
 */
export function matchBlockDefinitions(
  itemId: string,
  membershipIndex: BlockMembershipIndex,
  definitions: readonly CandidateDefinition[],
): BlockDefinitionMatchResult {
  const membershipEntry = membershipIndex[itemId] ?? null
  const referencedCandidateIds = membershipEntry?.orderedCandidateIds ?? []
  const referencedCandidateSet = new Set(referencedCandidateIds)
  const candidateDefinitions = definitions.filter(({ id }) => referencedCandidateSet.has(id))
  const availableCandidateIds = new Set(candidateDefinitions.map(({ id }) => id))
  const diagnostics: BlockResolutionDiagnostic[] = referencedCandidateIds
    .filter((candidateId) => !availableCandidateIds.has(candidateId))
    .map((candidateId) => ({
      kind: 'missing_candidate_definition',
      itemId,
      candidateId,
    }))

  if (membershipEntry !== null && referencedCandidateIds.length === 0) {
    diagnostics.push({ kind: 'swallowable_item_without_candidate', itemId })
  }

  return {
    itemId,
    membershipEntry,
    referencedCandidateIds,
    orderedCandidateIds: candidateDefinitions.map(({ id }) => id),
    candidateDefinitions,
    diagnostics,
  }
}

export function resolveBlock(
  itemId: string,
  membershipIndex: BlockMembershipIndex,
  definitions: readonly CandidateDefinition[],
  itemClassification: BlockItemClassification = 'unknown',
): BlockResolutionResult {
  const match = matchBlockDefinitions(itemId, membershipIndex, definitions)
  const diagnostics = [...match.diagnostics]
  const effectiveItemClassification =
    match.membershipEntry === null ? itemClassification : 'known_block_item'
  let eligibility: BlockEligibility
  let outcome: BlockResolutionOutcome

  if (match.membershipEntry !== null) {
    eligibility = 'swallowable'
    outcome = diagnostics.length === 0 ? 'resolved' : 'incomplete_membership'

    if (
      itemClassification === 'known_non_block_item' ||
      itemClassification === 'block_without_usable_item_stack'
    ) {
      diagnostics.push({
        kind: 'classification_conflicts_with_membership',
        itemId,
        itemClassification,
      })
      outcome = 'incomplete_membership'
    }
  } else if (itemClassification === 'unknown') {
    eligibility = 'unknown'
    outcome = 'unknown_item'
    diagnostics.push({ kind: 'unknown_item_identity', itemId })
  } else {
    eligibility = 'not_swallowable'
    outcome = 'forced_no_match'
    diagnostics.push({
      kind: 'item_not_swallowable',
      itemId,
      itemClassification,
    })
  }

  const profile = foldMatchingDefinitions(match.candidateDefinitions)

  return {
    ...match,
    diagnostics,
    itemClassification: effectiveItemClassification,
    suppliedItemClassification: itemClassification,
    eligibility,
    outcome,
    profile,
    supported:
      profile.supported && outcome !== 'unknown_item' && outcome !== 'incomplete_membership',
  }
}

export function resolveJe26_3Block(
  itemId: string,
  itemClassification: BlockItemClassification = 'unknown',
): BlockResolutionResult {
  return resolveBlock(itemId, je26_3BlockMembershipIndex, je26_3Archetypes, itemClassification)
}
