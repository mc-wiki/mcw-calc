import { describe, expect, it } from 'vitest'
import {
  blockGridNavigationTargetIndex,
  blockSelectorSearchText,
  blockSpriteFileName,
  humanizeIdentifier,
} from '../presentation/blockSelector'

describe('block selector presentation', () => {
  it('humanizes visible labels without exposing the identifier namespace', () => {
    expect(humanizeIdentifier('minecraft:oak_planks')).toBe('Oak Planks')
    expect(humanizeIdentifier('minecraft:tnt')).toBe('TNT')
  })

  it('keeps both reader labels and technical identifiers searchable', () => {
    const searchText = blockSelectorSearchText('minecraft:oak_planks')

    expect(searchText).toContain('oak planks')
    expect(searchText).toContain('oak_planks')
    expect(searchText).toContain('minecraft:oak_planks')
  })

  it('maps game identifiers onto established Minecraft Wiki sprite aliases', () => {
    expect(blockSpriteFileName('minecraft:oak_planks')).toBe('BlockSprite_oak-planks.png')
    expect(blockSpriteFileName('minecraft:iron_block')).toBe('BlockSprite_block-of-iron.png')
    expect(blockSpriteFileName('minecraft:waxed_exposed_copper')).toBe(
      'BlockSprite_exposed-copper.png',
    )
    expect(blockSpriteFileName('minecraft:stripped_acacia_wood')).toBe(
      'BlockSprite_stripped-acacia-log.png',
    )
    expect(blockSpriteFileName('minecraft:poplar_planks')).toBe('BlockSprite_poplar-planks.png')
    expect(blockSpriteFileName('minecraft:poplar_log')).toBe('BlockSprite_poplar-log.png')
    expect(blockSpriteFileName('minecraft:poplar_wood')).toBe('BlockSprite_poplar-log.png')
    expect(blockSpriteFileName('minecraft:stripped_poplar_log')).toBe(
      'BlockSprite_stripped-poplar-log.png',
    )
    expect(blockSpriteFileName('minecraft:stripped_poplar_wood')).toBe(
      'BlockSprite_stripped-poplar-log.png',
    )
    expect(blockSpriteFileName('minecraft:stripped_warped_stem')).toBe(
      'BlockSprite_stripped-warped-stem-top.png',
    )
    expect(blockSpriteFileName('minecraft:jack_o_lantern')).toBe("BlockSprite_jack-o'lantern.png")
  })

  it('maps grid navigation keys without leaving the filtered result bounds', () => {
    expect(blockGridNavigationTargetIndex(5, 14, 4, 'ArrowLeft')).toBe(4)
    expect(blockGridNavigationTargetIndex(5, 14, 4, 'ArrowRight')).toBe(6)
    expect(blockGridNavigationTargetIndex(5, 14, 4, 'ArrowUp')).toBe(1)
    expect(blockGridNavigationTargetIndex(5, 14, 4, 'ArrowDown')).toBe(9)
    expect(blockGridNavigationTargetIndex(13, 14, 4, 'ArrowDown')).toBe(13)
    expect(blockGridNavigationTargetIndex(5, 14, 4, 'Home')).toBe(0)
    expect(blockGridNavigationTargetIndex(5, 14, 4, 'End')).toBe(13)
    expect(blockGridNavigationTargetIndex(5, 14, 4, 'Enter')).toBeNull()
    expect(blockGridNavigationTargetIndex(-1, 14, 4, 'ArrowRight')).toBeNull()
  })
})
