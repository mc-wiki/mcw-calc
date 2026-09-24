import { describe, expect, it } from 'vitest'
import {
  defaultSulfurCubeSectionLayouts,
  findSulfurCubeSectionColumn,
  moveSulfurCubeSection,
  normalizeSulfurCubeSectionLayouts,
  sulfurCubeSectionIds,
} from '../presentation/sectionLayout'

describe('sulfur cube section layout', () => {
  it('stacks the default sections independently in two columns', () => {
    expect(defaultSulfurCubeSectionLayouts.regular).toEqual({
      left: ['scene', 'readout'],
      right: ['topDown', 'controls', 'power', 'trace', 'details'],
    })
    expect(defaultSulfurCubeSectionLayouts.compact).toEqual(defaultSulfurCubeSectionLayouts.regular)
  })

  it('moves a section within or across columns without changing membership', () => {
    const layout = defaultSulfurCubeSectionLayouts.regular
    const acrossColumns = moveSulfurCubeSection(layout, 'power', 'right', 'readout', 'before')

    expect(acrossColumns).toEqual({
      left: ['scene', 'readout'],
      right: ['topDown', 'controls', 'trace', 'details', 'power'],
    })
    expect(moveSulfurCubeSection(layout, 'scene', 'left', 'details', 'after')).toEqual({
      left: ['readout', 'scene'],
      right: ['topDown', 'controls', 'power', 'trace', 'details'],
    })
    expect(new Set([...acrossColumns.left, ...acrossColumns.right])).toEqual(
      new Set(sulfurCubeSectionIds),
    )
    expect(findSulfurCubeSectionColumn(acrossColumns, 'power')).toBe('right')
  })

  it('appends a section when a column itself is the drop target', () => {
    expect(
      moveSulfurCubeSection(defaultSulfurCubeSectionLayouts.regular, 'scene', 'right', null),
    ).toEqual({
      left: ['readout'],
      right: ['topDown', 'controls', 'power', 'trace', 'details', 'scene'],
    })
  })

  it('migrates the prior linear saved order into alternating columns', () => {
    expect(
      normalizeSulfurCubeSectionLayouts({
        regular: ['power', 'power', 'removed', 'scene'],
        compact: 'invalid',
      }),
    ).toEqual({
      regular: {
        left: ['power', 'topDown', 'readout', 'details'],
        right: ['scene', 'controls', 'trace'],
      },
      compact: defaultSulfurCubeSectionLayouts.compact,
    })
  })

  it('repairs duplicate and missing IDs in a saved two-column layout', () => {
    expect(
      normalizeSulfurCubeSectionLayouts({
        regular: {
          left: ['trace', 'scene', 'trace'],
          right: ['topDown', 'removed', 'scene'],
        },
      }).regular,
    ).toEqual({
      left: ['trace', 'scene', 'readout'],
      right: ['topDown', 'controls', 'power', 'details'],
    })
  })
})
