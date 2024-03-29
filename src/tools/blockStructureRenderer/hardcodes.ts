import type { BlockState } from '@/tools/blockStructureRenderer/renderer.ts'
import { BlockStructure, NameMapping } from '@/tools/blockStructureRenderer/renderer.ts'
import {
  Direction,
  IDENTITY_ROTATION,
  isHorizontalDirection,
  isVerticalDirection,
  oppositeDirection,
  Rotation,
} from '@/tools/blockStructureRenderer/math.ts'
import {
  bakeModel,
  type BlockStateModelManager,
  renderModelNoCullFacesWithMaterialSupplier,
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

export const hardCodedRenderers = [
  {
    block: 'water',
    renderFunc: () => {},
  },
  {
    block: 'lava',
    renderFunc: () => {},
  },
  {
    block: 'chest',
    renderFunc: renderChest,
  },
  {
    block: 'trapped_chest',
    renderFunc: renderChest,
  },
  {
    block: /.*shulker_box$/,
    renderFunc: renderShulkerBox,
  },
  {
    block: 'lectern',
    renderFunc: renderLecternBlock,
    needRenderModel: true,
  },
  {
    block: 'enchanting_table',
    renderFunc: renderEnchantTable,
    needRenderModel: true,
  },
] as {
  block: string | RegExp
  renderFunc: (
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    blockState: BlockState,
    modelManager: BlockStateModelManager,
    materialPicker: MaterialPicker,
    nameMapping: NameMapping,
    blockStructure: BlockStructure,
  ) => void
  needRenderModel?: boolean
}[]

// net.minecraft.client.model.geom.builders.CubeListBuilder
// prettier-ignore
function boxModel(
  [fromX, fromY, fromZ]: number[],
  [width, height, depth]: number[],
  [texOffX, texOffY]: number[],
  [poseOffX, poseOffY, poseOffZ]: number[], // Use this if you confirm no manual rotation (using matrix) is needed
  shade: boolean,
  texture: number,
  materialPicker: MaterialPicker,
  rotation: Rotation, // Use this if you confirm no manual rotation (using matrix) is needed
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

function fromFacingToRotation(facing: string) {
  switch (facing) {
    case 'south':
      return new Rotation(0, 0)
    case 'west':
      return new Rotation(0, 90)
    case 'north':
      return new Rotation(0, 180)
    case 'east':
      return new Rotation(0, 270)
  }
  return new Rotation(0, 0)
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
  const rotation = fromFacingToRotation(facing)

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
  } else if (blockState.blockProperties['type'] == 'right') {
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
  } else {
    console.warn('Unknown chest type', blockState.blockProperties['type'])
    return
  }

  const transform = new THREE.Matrix4().makeTranslation(x, y, z)
  const material = (animated: boolean) =>
    animated ? materialPicker.animatedTexture.cutout : materialPicker.staticTexture.cutout
  renderModelNoCullFacesWithMaterialSupplier(modelBottom!, blockState, material, scene, transform)
  renderModelNoCullFacesWithMaterialSupplier(modelLid!, blockState, material, scene, transform)
  renderModelNoCullFacesWithMaterialSupplier(modelLock!, blockState, material, scene, transform)
}

// net.minecraft.client.renderer.blockentity.ShulkerBoxRenderer
function renderShulkerBox(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = modelManager.getSpecialBlocksData(blockState.blockName)[0]
  const facing = blockState.blockProperties['facing']
  let rotation = IDENTITY_ROTATION
  let move = [0.5, -0.5, 0.5]
  switch (facing) {
    case 'up':
      rotation = new Rotation(180, 0)
      move = [0.5, 0.5, -0.5]
      break
    case 'north':
      rotation = new Rotation(-90, 0)
      move = [0.5, -0.5, -0.5]
      break
    case 'south':
      rotation = new Rotation(90, 0)
      move = [0.5, 0.5, 0.5]
      break
    case 'west':
      rotation = new Rotation(-90, -90)
      move = [-0.5, -0.5, -0.5]
      break
    case 'east':
      rotation = new Rotation(-90, 90)
      break
  }

  const modelLid = boxModel(
    [-8, -16, -8],
    [16, 12, 16],
    [0, 0],
    [0, 24, 0],
    true,
    texture,
    materialPicker,
    rotation,
    false,
  )
  const modelBase = boxModel(
    [-8, -8, -8],
    [16, 8, 16],
    [0, 28],
    [0, 24, 0],
    true,
    texture,
    materialPicker,
    rotation,
    false,
  )

  const transform = new THREE.Matrix4().makeTranslation(x + move[0], y + move[1], z + move[2])
  const material = (animated: boolean) =>
    animated ? materialPicker.animatedTexture.cutout : materialPicker.staticTexture.cutout
  renderModelNoCullFacesWithMaterialSupplier(modelLid!, blockState, material, scene, transform)
  renderModelNoCullFacesWithMaterialSupplier(modelBase!, blockState, material, scene, transform)
}

// net.minecraft.client.model.BookModel
// prettier-ignore
function renderBook(
  scene: THREE.Scene,
  transform: THREE.Matrix4,
  block: BlockState,
  texture: number,
  materialPicker: MaterialPicker,
  [rotAngle, openScale, flipPage1Percent, flipPage2Percent]: number[],
) {
  const modelLeftLid = boxModel(
    [-6, -5, -0.005],
    [6, 10, 0.005],
    [0, 0],
    [0, 0, 0],
    true,
    texture,
    materialPicker,
    IDENTITY_ROTATION,
    false,
  )
  const modelRightLid = boxModel(
    [0, -5, -0.005],
    [6, 10, 0.005],
    [16, 0],
    [0, 0, 0],
    true,
    texture,
    materialPicker,
    IDENTITY_ROTATION,
    false,
  )
  const modelSeam = boxModel(
    [-1, -5, 0],
    [2, 10, 0.005],
    [12, 0],
    [0, 0, 0],
    true,
    texture,
    materialPicker,
    IDENTITY_ROTATION,
    false,
  )
  const modelLeftPages = boxModel(
    [0, -4, -0.99],
    [5, 8, 1],
    [0, 10],
    [0, 0, 0],
    true,
    texture,
    materialPicker,
    IDENTITY_ROTATION,
    false,
  )
  const modelRightPages = boxModel(
    [0, -4, -0.01],
    [5, 8, 1],
    [12, 10],
    [0, 0, 0],
    true,
    texture,
    materialPicker,
    IDENTITY_ROTATION,
    false,
  )
  const modelFlipPage = boxModel(
    [0, -4, 0],
    [5, 8, 0.005],
    [24, 10],
    [0, 0, 0],
    true,
    texture,
    materialPicker,
    IDENTITY_ROTATION,
    false,
  )

  const rot = (Math.sin(rotAngle * 0.02) * 0.1 + 1.25) * openScale
  const leftLidMatrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, -1 / 16))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI + rot))
  const rightLidMatrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, 1 / 16))
    .multiply(new THREE.Matrix4().makeRotationY(-rot))
  const leftPagesMatrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(Math.sin(rot) / 16, 0, 0))
    .multiply(new THREE.Matrix4().makeRotationY(rot))
  const rightPagesMatrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(Math.sin(rot) / 16, 0, 0))
    .multiply(new THREE.Matrix4().makeRotationY(-rot))
  const flipPage1Matrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(Math.sin(rot) / 16, 0, 0))
    .multiply(new THREE.Matrix4().makeRotationY(rot - rot * 2 * flipPage1Percent))
  const flipPage2Matrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(Math.sin(rot) / 16, 0, 0))
    .multiply(new THREE.Matrix4().makeRotationY(rot - rot * 2 * flipPage2Percent))
  const seamMatrix = new THREE.Matrix4().makeRotationY(Math.PI / 2)

  const material = (animated: boolean) =>
    animated ? materialPicker.animatedTexture.solid : materialPicker.staticTexture.solid
  renderModelNoCullFacesWithMaterialSupplier(modelLeftLid, block, material, scene, transform.clone().multiply(leftLidMatrix), true)
  renderModelNoCullFacesWithMaterialSupplier(modelRightLid, block, material, scene, transform.clone().multiply(rightLidMatrix), true)
  renderModelNoCullFacesWithMaterialSupplier(modelSeam, block, material, scene, transform.clone().multiply(seamMatrix), true)
  renderModelNoCullFacesWithMaterialSupplier(modelLeftPages, block, material, scene, transform.clone().multiply(leftPagesMatrix), true)
  renderModelNoCullFacesWithMaterialSupplier(modelRightPages, block, material, scene, transform.clone().multiply(rightPagesMatrix), true)
  renderModelNoCullFacesWithMaterialSupplier(modelFlipPage, block, material, scene, transform.clone().multiply(flipPage1Matrix), true)
  renderModelNoCullFacesWithMaterialSupplier(modelFlipPage, block, material, scene, transform.clone().multiply(flipPage2Matrix), true)
}

// net.minecraft.client.renderer.blockentity.LecternRenderer
function renderLecternBlock(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  if (blockState.blockProperties['has_book'] === 'false') return
  const texture = modelManager.getSpecialBlocksData(blockState.blockName)[0]
  const rotation = fromFacingToRotation(blockState.blockProperties['facing'])
  const transform = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
    .multiply(new THREE.Matrix4().makeTranslation(0.5, 1.0625, 0.5))
    .multiply(new THREE.Matrix4().makeRotationY((-(rotation.y + 90) / 180) * Math.PI))
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI * 0.375))
    .multiply(new THREE.Matrix4().makeTranslation(0, -0.125, 0))
  renderBook(scene, transform, blockState, texture, materialPicker, [0, 1.2, 0.1, 0.9])
}

// net.minecraft.client.renderer.blockentity.EnchantTableRenderer
function renderEnchantTable(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = modelManager.getSpecialBlocksData(blockState.blockName)[0]
  const time = 0
  const rotation = 0
  const transform = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
    .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.75, 0.5))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0.1 + Math.sin(time * 0.1) * 0.01, 0))
    .multiply(new THREE.Matrix4().makeRotationY(-rotation))
    .multiply(new THREE.Matrix4().makeRotationZ((4 * Math.PI) / 9))
  renderBook(scene, transform, blockState, texture, materialPicker, [0, 0, 0, 0])
}
