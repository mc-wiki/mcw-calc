import type { BlockState } from '@/tools/blockStructureRenderer/renderer.ts'
import { BlockStructure, NameMapping } from '@/tools/blockStructureRenderer/renderer.ts'
import {
  Direction,
  isHorizontalDirection,
  isVerticalDirection,
  oppositeDirection,
  Rotation,
} from '@/tools/blockStructureRenderer/math.ts'
import {
  bakeModel,
  type BlockStateModelManager,
  renderModelNoCullFaces,
} from '@/tools/blockStructureRenderer/model.ts'
import {
  ANIMATED_TEXTURE_ATLAS_SIZE,
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  MaterialPicker,
} from '@/tools/blockStructureRenderer/texture.ts'
import * as THREE from 'three'

export function checkNameInSet(name: string, nameSet: (string | RegExp)[]) {
  return nameSet.some((nameTest) =>
    nameTest instanceof RegExp ? nameTest.test(name) : nameTest === name,
  )
}

// Subclasses of net.minecraft.world.level.block.HalfTransparentBlock
export const halfTransparentBlocks = [
  'frosted_ice',
  'ice',
  'honey_block',
  'slime_block',
  /.*copper_grate$/,
  'glass',
  /.*stained_glass$/,
  'tinted_glass',
]

// Subclasses of net.minecraft.world.level.block.LeavesBlock
export const leavesBlocks = /.*_leaves$/

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
    checkNameInSet(thisBlock.blockName, halfTransparentBlocks) &&
    thisBlock.blockName === otherBlock.blockName
  )
}

export function getShade(direction: Direction, shade: boolean) {
  const constantAmbientLight = false // Overworld/The End constant ambient light
  if (!shade) {
    return constantAmbientLight ? 0.9 : 1
  }
  switch (direction) {
    case Direction.DOWN:
      return constantAmbientLight ? 0.9 : 0.5
    case Direction.UP:
      return constantAmbientLight ? 0.9 : 1
    case Direction.NORTH:
    case Direction.SOUTH:
      return 0.8
    case Direction.WEST:
    case Direction.EAST:
      return 0.6
  }
}

export function resolveSpecialTextures(
  blockName: string,
  materialPicker: MaterialPicker,
  modelManager: BlockStateModelManager,
  renderType: string,
): [THREE.MeshBasicMaterial[], number[][]] {
  const specialTextureIDs = modelManager.getSpecialBlocksData(blockName)
  const resolvedMaterial = specialTextureIDs
    .map((texture) => materialPicker.atlasMapping[texture])
    .map(
      (sprite) =>
        (Array.isArray(sprite) ? materialPicker.staticTexture : materialPicker.animatedTexture)[
          renderType
        ],
    )
  const resolvedSprites = specialTextureIDs.map((texture) => {
    const sprite = materialPicker.atlasMapping[texture]
    if (Array.isArray(sprite)) {
      return [sprite[0], sprite[1], sprite[2], sprite[3], ATLAS_WIDTH, ATLAS_HEIGHT]
    } else {
      const firstFrame = materialPicker.atlasMapping[sprite.frames[0]] as number[]
      const [x, y, width, height] = materialPicker.animatedTextureManager.putNewTexture(
        texture,
        sprite,
        [firstFrame[2], firstFrame[3]],
      )
      return [x, y, width, height, ANIMATED_TEXTURE_ATLAS_SIZE, ANIMATED_TEXTURE_ATLAS_SIZE]
    }
  })
  return [resolvedMaterial, resolvedSprites]
}

export const hardCodedRenderers = {
  water: [false, () => {}],
  lava: [false, () => {}],
  chest: [false, renderChest],
  trapped_chest: [false, renderChest],
} as Record<
  string,
  [
    isRegExp: boolean,
    (
      scene: THREE.Scene,
      x: number,
      y: number,
      z: number,
      blockState: BlockState,
      modelManager: BlockStateModelManager,
      materialPicker: MaterialPicker,
      nameMapping: NameMapping,
      blockStructure: BlockStructure,
    ) => void,
  ]
>

// net.minecraft.client.model.geom.builders.CubeListBuilder
// prettier-ignore
function boxModel(
  [fromX, fromY, fromZ]: number[],
  [width, height, depth]: number[],
  [texOffX, texOffY]: number[],
  [poseOffX, poseOffY, poseOffZ]: number[],
  shade: boolean,
  texture: number,
  materialPicker: MaterialPicker,
  rotation: Rotation,
  uvlock: boolean,
) {
  return bakeModel(
    materialPicker,
    {
      elements: [
        {
          from: [fromX + poseOffX, fromY + poseOffY, fromZ + poseOffZ],
          to: [fromX + width + poseOffX, fromY + height + poseOffY, fromZ + depth + poseOffZ],
          shade,
          faces: {
            down: {
              texture,
              uv: [texOffX + depth, texOffY, texOffX + depth + width, texOffY + depth],
            },
            up: {
              texture,
              uv: [texOffX + depth + width + width, texOffY, texOffX + depth + width, texOffY + depth],
              rotation: 180,
            },
            west: {
              texture,
              uv: [texOffX + depth, texOffY + depth + height, texOffX, texOffY + depth],
            },
            north: {
              texture,
              uv: [texOffX + depth + width, texOffY + depth + height, texOffX + depth, texOffY + depth],
            },
            east: {
              texture,
              uv: [texOffX + depth + width + depth, texOffY + depth + height, texOffX + depth + width, texOffY + depth],
            },
            south: {
              texture,
              uv: [texOffX + depth + width + depth + width, texOffY + depth + height, texOffX + depth + width + depth, texOffY + depth],
            },
          },
        },
      ],
    },
    rotation,
    uvlock,
  )
}

// net.minecraft.client.renderer.blockentity.ChestRenderer
function renderChest(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const specials = modelManager.getSpecialBlocksData(blockState.blockName)
  const normalTexture = specials[0]
  const leftTexture = specials[1]
  const rightTexture = specials[2]
  const facing = blockState.blockProperties['facing']
  let rotation
  switch (facing) {
    case 'north':
      rotation = new Rotation(0, 0)
      break
    case 'east':
      rotation = new Rotation(0, 90)
      break
    case 'south':
      rotation = new Rotation(0, 180)
      break
    case 'west':
      rotation = new Rotation(0, 270)
      break
  }

  let modelBottom
  let modelLid
  let modelLock
  if (blockState.blockProperties['type'] == 'single') {
    modelBottom = boxModel(
      [1, 0, 1],
      [14, 10, 14],
      [0, 19],
      [0, 0, 0],
      true,
      normalTexture,
      materialPicker,
      rotation!,
      false,
    )
    modelLid = boxModel(
      [1, 0, 0],
      [14, 5, 14],
      [0, 0],
      [0, 9, 1],
      true,
      normalTexture,
      materialPicker,
      rotation!,
      false,
    )
    modelLock = boxModel(
      [7, -2, 14],
      [2, 4, 1],
      [0, 0],
      [0, 9, 1],
      true,
      normalTexture,
      materialPicker,
      rotation!,
      false,
    )
  } else if (blockState.blockProperties['type'] == 'left') {
    modelBottom = boxModel(
      [0, 0, 1],
      [15, 10, 14],
      [0, 19],
      [0, 0, 0],
      true,
      leftTexture,
      materialPicker,
      rotation!,
      false,
    )
    modelLid = boxModel(
      [0, 0, 0],
      [15, 5, 14],
      [0, 0],
      [0, 9, 1],
      true,
      leftTexture,
      materialPicker,
      rotation!,
      false,
    )
    modelLock = boxModel(
      [0, -2, 14],
      [1, 4, 1],
      [0, 0],
      [0, 9, 1],
      true,
      leftTexture,
      materialPicker,
      rotation!,
      false,
    )
  } else {
    modelBottom = boxModel(
      [1, 0, 1],
      [15, 10, 14],
      [0, 19],
      [0, 0, 0],
      true,
      rightTexture,
      materialPicker,
      rotation!,
      false,
    )
    modelLid = boxModel(
      [1, 0, 0],
      [15, 5, 14],
      [0, 0],
      [0, 9, 1],
      true,
      rightTexture,
      materialPicker,
      rotation!,
      false,
    )
    modelLock = boxModel(
      [15, -2, 14],
      [1, 4, 1],
      [0, 0],
      [0, 9, 1],
      true,
      rightTexture,
      materialPicker,
      rotation!,
      false,
    )
  }

  const transform = new THREE.Matrix4().makeTranslation(x, y, z)
  renderModelNoCullFaces(modelBottom!, blockState, materialPicker, scene, transform)
  renderModelNoCullFaces(modelLid!, blockState, materialPicker, scene, transform)
  renderModelNoCullFaces(modelLock!, blockState, materialPicker, scene, transform)
}
