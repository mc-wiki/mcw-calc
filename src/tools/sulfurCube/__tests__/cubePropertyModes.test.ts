import { describe, expect, it } from 'vitest'
import {
  je26_3ArchetypeRegistryOrder,
  je26_3ArchetypesById,
  je26_3BlockMembershipIndex,
} from '../data/je26_3'
import { standardNumerics } from '../numerics/standard'
import { createDefaultDiagnosticInputs, evaluateDiagnosticInputs } from '../presets/diagnostic'
import {
  copyCurrentResolvedCubeProperties,
  createDefaultCubePropertySelectionState,
  je26_3ArchetypeRepresentativeBlocks,
  resolveArchetype,
  resolveCubePropertySelection,
  selectCubePropertyArchetype,
  selectCubePropertyBlock,
  selectCubePropertyMode,
  updateCustomCubeProperty,
} from '../resolution'

describe('cube property selection modes', () => {
  it('starts in Block mode with Oak Planks and preserves the Bouncy result', () => {
    const state = createDefaultCubePropertySelectionState()
    const resolved = resolveCubePropertySelection(state)
    const bouncy = resolveArchetype(je26_3ArchetypesById['minecraft:bouncy'])

    expect(state).toMatchObject({
      mode: 'block',
      lastLockedMode: 'block',
      selectedBlockId: 'minecraft:oak_planks',
      selectedArchetypeId: 'minecraft:bouncy',
      customWorkingCopy: null,
    })
    expect(resolved).toMatchObject({
      mode: 'block',
      editable: false,
      candidateIds: ['minecraft:bouncy'],
      values: {
        horizontalPower: 0.4125,
        verticalPower: 0.105,
        knockbackResistance: -2,
        bounciness: 0.8999999761581421,
        airDragModifier: 0.009999999776482582,
      },
      supported: true,
    })
    expect(resolved.profile).toEqual(bouncy)
  })

  it('resolves an Archetype selection alone and keeps its fields locked', () => {
    const state = selectCubePropertyArchetype(
      selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'archetype'),
      'minecraft:fast_flat',
    )
    const resolved = resolveCubePropertySelection(state)

    expect(resolved).toMatchObject({
      mode: 'archetype',
      editable: false,
      candidateIds: ['minecraft:fast_flat'],
      source: {
        kind: 'archetype',
        archetypeId: 'minecraft:fast_flat',
      },
      values: {
        horizontalPower: 0.9125,
        verticalPower: 0.09,
        knockbackResistance: -1,
        bounciness: 0.5,
        airDragModifier: 0.009999999776482582,
      },
      supported: true,
    })
    expect(state.selectedBlockId).toBe('minecraft:carved_pumpkin')
  })

  it('assigns every archetype its stable representative block without selecting one in Custom mode', () => {
    for (const archetypeId of je26_3ArchetypeRegistryOrder) {
      const state = selectCubePropertyArchetype(
        selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'archetype'),
        archetypeId,
      )

      expect(state.selectedBlockId).toBe(je26_3ArchetypeRepresentativeBlocks[archetypeId])
      expect(je26_3BlockMembershipIndex[state.selectedBlockId]).toBeDefined()
    }

    expect(selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'custom').mode).toBe(
      'custom',
    )
  })

  it('creates a detached Custom copy without mutating the source profile', () => {
    const initial = selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'custom')
    const sourceProfile = initial.customWorkingCopy?.baseProfile
    const edited = updateCustomCubeProperty(initial, 'horizontalPower', '0.75')
    const resolved = resolveCubePropertySelection(edited)

    expect(resolved).toMatchObject({
      mode: 'custom',
      editable: true,
      values: {
        horizontalPower: 0.75,
        verticalPower: 0.105,
        knockbackResistance: -2,
        bounciness: 0.8999999761581421,
        airDragModifier: 0.009999999776482582,
      },
      supported: true,
    })
    expect(sourceProfile?.knockbackModifiers.horizontalPower.value.sourceDecimal).toBe(0.4125)
    expect(initial.customWorkingCopy?.formState.horizontalPower).toBe('0.4125')
  })

  it('preserves Custom edits across mode and locked-source changes', () => {
    let state = selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'custom')
    state = updateCustomCubeProperty(state, 'verticalPower', '0.333')
    state = selectCubePropertyMode(state, 'block')
    state = selectCubePropertyBlock(state, 'minecraft:iron_block')
    state = selectCubePropertyMode(state, 'archetype')
    state = selectCubePropertyArchetype(state, 'minecraft:sticky')
    state = selectCubePropertyMode(state, 'custom')

    expect(resolveCubePropertySelection(state).values?.verticalPower).toBe(0.333)
    expect(state.customWorkingCopy?.copiedFrom).toMatchObject({
      kind: 'block',
      itemId: 'minecraft:oak_planks',
    })
  })

  it('replaces Custom edits only through the explicit copy action', () => {
    let state = selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'custom')
    state = updateCustomCubeProperty(state, 'horizontalPower', '4')
    state = selectCubePropertyMode(state, 'block')
    state = selectCubePropertyBlock(state, 'minecraft:iron_block')
    state = selectCubePropertyMode(state, 'custom')

    expect(resolveCubePropertySelection(state).values?.horizontalPower).toBe(4)

    state = copyCurrentResolvedCubeProperties(state)

    expect(resolveCubePropertySelection(state)).toMatchObject({
      values: {
        horizontalPower: 0.4125,
        verticalPower: 0.105,
        knockbackResistance: 0.5,
        bounciness: 0.4000000059604645,
        airDragModifier: 0.10000000149011612,
      },
      source: {
        kind: 'block',
        itemId: 'minecraft:iron_block',
        candidateIds: ['minecraft:slow_flat'],
      },
    })
  })

  it('returns explicit diagnostics for invalid and ranged Custom input', () => {
    let state = selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'custom')
    state = updateCustomCubeProperty(state, 'horizontalPower', '')
    state = updateCustomCubeProperty(state, 'knockbackResistance', 2)
    state = updateCustomCubeProperty(state, 'airDragModifier', -1)
    state = updateCustomCubeProperty(state, 'bounciness', 2)
    const resolved = resolveCubePropertySelection(state)

    expect(resolved.values).toBeNull()
    expect(resolved.supported).toBe(false)
    expect(resolved.diagnostics).toEqual(
      expect.arrayContaining([
        {
          kind: 'custom_value_out_of_range',
          field: 'knockbackResistance',
          value: 2,
          minimum: -2,
          maximum: 1,
        },
        {
          kind: 'custom_value_out_of_range',
          field: 'airDragModifier',
          value: -1,
          minimum: 0,
          maximum: 2048,
        },
        {
          kind: 'custom_value_out_of_range',
          field: 'bounciness',
          value: 2,
          minimum: 0,
          maximum: 1,
        },
      ]),
    )
    expect(resolved.diagnostics).not.toContainEqual(
      expect.objectContaining({ kind: 'invalid_custom_number', field: 'horizontalPower' }),
    )
  })

  it('treats an empty Custom property field as zero during editing', () => {
    let state = selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'custom')
    state = updateCustomCubeProperty(state, 'horizontalPower', '')

    expect(resolveCubePropertySelection(state).values?.horizontalPower).toBe(0)
  })

  it('rejects identifiers outside each fixed JE 26.3 selector universe', () => {
    expect(() =>
      selectCubePropertyBlock(createDefaultCubePropertySelectionState(), 'minecraft:stone_stairs'),
    ).toThrow(/unknown JE 26\.3 swallowable block item/)
    expect(() =>
      selectCubePropertyArchetype(
        createDefaultCubePropertySelectionState(),
        'minecraft:not_real' as 'minecraft:bouncy',
      ),
    ).toThrow(/unknown JE 26\.3 sulfur cube archetype/)
  })

  it('feeds selected launch and air-drag values into evaluation', () => {
    const state = selectCubePropertyArchetype(
      selectCubePropertyMode(createDefaultCubePropertySelectionState(), 'archetype'),
      'minecraft:fast_flat',
    )
    const properties = resolveCubePropertySelection(state).values

    expect(properties).not.toBeNull()
    const evaluation = evaluateDiagnosticInputs(
      createDefaultDiagnosticInputs(),
      standardNumerics,
      properties!,
    )

    expect(evaluation.properties).toEqual(properties)
    expect(evaluation.callResult.diagnostics.h0).toBe(0.9125)
    expect(evaluation.callResult.diagnostics.v0).toBe(0.09)
    expect(evaluation.trajectory.ticks[0]?.airDrag).toBeCloseTo(0.9991, 7)
  })
})
