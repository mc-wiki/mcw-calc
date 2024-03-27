import type { BlockState } from '@/tools/blockStructureRenderer/renderer.ts'
import {
  isHorizontalDirection,
  isVerticalDirection,
  oppositeDirection,
  Direction,
} from '@/tools/blockStructureRenderer/math.ts'

// Subclasses of net.minecraft.world.level.block.HalfTransparentBlock
export const halfTransparentBlocks = [
  'frosted_ice',
  'ice',
  'honey_block',
  'slime_block',
  '.*copper_grate',
  'glass',
  '.*stained_glass',
  'tinted_glass',
]

// Subclasses of net.minecraft.world.level.block.LeavesBlock
export const leavesBlocks = /.*_leaves/

// net.minecraft.world.level.block.state.BlockBehaviour
// protected boolean skipRendering(BlockState blockState, BlockState blockState2, Direction direction)
//  default: return false
//  overrides: HalfTransparentBlock, IronBarsBlock, (LiquidBlock), MangroveRootsBlock, PowderSnowBlock
export function hardCodedSkipRendering(
  thisBlock: BlockState,
  otherBlock: BlockState,
  direction: Direction,
) {
  if (thisBlock.blockName === 'powder_snow' && otherBlock.blockName === 'powder_snow') return true
  if (
    thisBlock.blockName === 'iron_bars' &&
    otherBlock.blockName === 'iron_bars' &&
    isHorizontalDirection(direction) &&
    thisBlock.blockProperties[direction] === 'true' &&
    otherBlock.blockProperties[oppositeDirection(direction)] === 'true'
  )
    return true
  if (
    thisBlock.blockName === 'mangrove_roots' &&
    otherBlock.blockName === 'mangrove_roots' &&
    isVerticalDirection(direction)
  )
    return true
  return (
    halfTransparentBlocks.some((blockTest) => RegExp(blockTest).test(thisBlock.blockName)) &&
    thisBlock.blockName === otherBlock.blockName
  )
}
