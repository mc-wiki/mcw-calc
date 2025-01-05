import type { ModelFace } from '@/tools/blockStructureRenderer/definitions.ts'
import type {
  BlockState,
  BlockStructure,
  NameMapping,
} from '@/tools/blockStructureRenderer/renderer.ts'
import type { MaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'
import {
  Direction,
  getDirectionFromName,
  getStepX,
  getStepZ,
  IDENTITY_ROTATION,
  isHorizontalDirection,
  isVerticalDirection,
  oppositeDirection,
  Rotation,
} from '@/tools/blockStructureRenderer/math.ts'
import {
  bakeModel,
  type BlockStateModelManager,
  renderModelNoCullsWithMS,
} from '@/tools/blockStructureRenderer/model.ts'
import {
  ANIMATED_TEXTURE_ATLAS_SIZE,
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
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

export const invisibleBlockColor = {
  air: new THREE.Color(0.5, 0.5, 1),
  structure_void: new THREE.Color(1, 0.75, 0.75),
  barrier: new THREE.Color(1, 0, 0),
  light: new THREE.Color(1, 1, 0),
} as Record<string, THREE.Color>

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
    thisBlock.getBlockProperty(direction) === 'true' &&
    otherBlock.getBlockProperty(oppositeDirection(direction)) === 'true'
  ) {
    return true
  }
  if (
    thisBlock.blockName === 'mangrove_roots' &&
    otherBlock.blockName === 'mangrove_roots' &&
    isVerticalDirection(direction)
  ) {
    return true
  }
  return (
    checkNameInSet(thisBlock.blockName, halfTransparentBlocks) &&
    thisBlock.blockName === otherBlock.blockName
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const GRASS_LIKE_BLOCK = [
  'large_fern',
  'tall_grass',
  'grass_block',
  'fern',
  'short_grass',
  'potted_fern',
  'pink_petals',
  'sugar_cane',
]

const FOLIAGE_BLOCK = [
  'oak_leaves',
  'jungle_leaves',
  'acacia_leaves',
  'dark_oak_leaves',
  'vine',
  'mangrove_leaves',
]

export function hardcodedBlockTint(blockState: BlockState) {
  if (blockState.blockName === 'redstone_wire') {
    const power = blockState.getBlockProperty('power')
    const percent = Number.parseInt(power) / 15
    const red = Math.floor((percent * 0.6 + (percent > 0 ? 0.4 : 0.3)) * 255)
    const green = Math.floor(clamp(percent * percent * 0.7 - 0.5, 0, 1) * 255)
    const blue = Math.floor(clamp(percent * percent * 0.6 - 0.7, 0, 1) * 255)
    const color = (red << 16) | (green << 8) | blue
    blockState.tintData[0] = color.toString(16)
  } else if (GRASS_LIKE_BLOCK.includes(blockState.blockName)) {
    if (blockState.tintData.length > 0) return
    blockState.tintData[0] = '7cbd6b'
  } else if (blockState.blockName === 'spruce_leaves') {
    blockState.tintData[0] = '619961'
  } else if (blockState.blockName === 'birch_leaves') {
    blockState.tintData[0] = '80a755'
  } else if (FOLIAGE_BLOCK.includes(blockState.blockName)) {
    if (blockState.tintData.length > 0) return
    blockState.tintData[0] = '48b518'
  } else if (blockState.blockName === 'water_cauldron') {
    if (blockState.tintData.length > 0) return
    blockState.tintData[0] = '3f76e4'
  } else if (
    blockState.blockName === 'lava_cauldron' ||
    blockState.blockName === 'powder_snow_cauldron'
  ) {
    blockState.tintData[0] = 'ffffff'
  } else if (
    blockState.blockName === 'attached_melon_stem' ||
    blockState.blockName === 'attached_pumpkin_stem'
  ) {
    blockState.tintData[0] = 'e0c71c'
  } else if (blockState.blockName === 'melon_stem' || blockState.blockName === 'pumpkin_stem') {
    const age = Number.parseInt(blockState.getBlockProperty('age'))
    const red = age * 32
    const green = 255 - age * 8
    const blue = age * 4
    const color = (red << 16) | (green << 8) | blue
    blockState.tintData[0] = color.toString(16)
  } else if (blockState.blockName === 'lily_pad') {
    blockState.tintData[0] = '208030'
  }
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

export async function resolveSpecialTextures(
  blockName: string,
  materialPicker: MaterialPicker,
  modelManager: BlockStateModelManager,
  renderType: string,
): Promise<[THREE.MeshBasicMaterial[], number[][]]> {
  const specialTextureIDs = await modelManager.getSpecialBlocksData(blockName)
  const resolvedMaterial = []
  const resolvedSprites = []
  for (const textureRef of specialTextureIDs) {
    const sprite = await materialPicker.getTextureByReference(textureRef)
    resolvedMaterial.push(
      Array.isArray(sprite)
        ? materialPicker.staticTexture[renderType]
        : materialPicker.animatedTexture[renderType],
    )
    if (Array.isArray(sprite)) {
      resolvedSprites.push([sprite[0], sprite[1], sprite[2], sprite[3], ATLAS_WIDTH, ATLAS_HEIGHT])
    } else {
      const firstFrame = (await materialPicker.getTextureByReference(sprite.frames[0])) as number[]
      const [x, y, width, height] = materialPicker.animatedTextureManager.putNewTexture(
        textureRef,
        sprite,
        [firstFrame[2], firstFrame[3]],
      )
      resolvedSprites.push([
        x,
        y,
        width,
        height,
        ANIMATED_TEXTURE_ATLAS_SIZE,
        ANIMATED_TEXTURE_ATLAS_SIZE,
      ])
    }
  }
  return [resolvedMaterial, resolvedSprites]
}

async function NOP() {}

export const hardCodedRenderers = [
  {
    block: 'air',
    renderFunc: NOP,
  },
  {
    block: /.*_air$/,
    renderFunc: NOP,
  },
  {
    block: 'structure_void',
    renderFunc: NOP,
  },
  {
    block: 'barrier',
    renderFunc: NOP,
  },
  {
    block: 'light',
    renderFunc: NOP,
  },
  {
    block: 'water',
    renderFunc: NOP,
  },
  {
    block: 'lava',
    renderFunc: NOP,
  },
  {
    block: 'bubble_column',
    renderFunc: NOP,
  },
  {
    block: 'chest',
    renderFunc: renderChest,
  },
  {
    block: 'ender_chest',
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
  {
    block: 'bell',
    renderFunc: renderBell,
    needRenderModel: true,
  },
  {
    block: 'decorated_pot',
    renderFunc: renderDecoratedPot,
  },
  {
    block: /.*_bed$/,
    renderFunc: renderBed,
  },
  {
    block: /.*_banner$/,
    renderFunc: renderBanner,
  },
  {
    block: 'piston_head', // Avoid wrongly matching
    renderFunc: NOP,
    needRenderModel: true,
  },
  {
    block: /.*_skull$/,
    renderFunc: renderSkull,
  },
  {
    block: /.*_head$/,
    renderFunc: renderSkull,
  },
  {
    block: /.*_hanging_sign$/,
    renderFunc: renderHangingSign,
  },
  {
    block: /.*_sign$/,
    renderFunc: renderSign,
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
  ) => Promise<void>
  needRenderModel?: boolean
}[]

// net.minecraft.client.model.geom.builders.CubeListBuilder
// prettier-ignore
function boxModel(
  texture: number,
  materialPicker: MaterialPicker,
  [fromX, fromY, fromZ]: number[],
  [width, height, depth]: number[],
  [texOffX, texOffY]: number[],
  [poseOffX, poseOffY, poseOffZ]: number[] = [0, 0, 0], // Use this if you confirm no manual rotation (using matrix) is needed
  rotation: Rotation = IDENTITY_ROTATION, // Use this if you confirm no manual rotation (using matrix) is needed
  visibleFaces: Direction[] = [
    Direction.DOWN,
    Direction.UP,
    Direction.WEST,
    Direction.NORTH,
    Direction.EAST,
    Direction.SOUTH,
  ],
  mirror: boolean = false,
  shade: boolean = true,
) {
  const directionFaces = {} as Record<Direction, ModelFace>
  if (mirror) {
    if (visibleFaces.includes(Direction.DOWN)) {
      directionFaces[Direction.DOWN] = {
        texture,
        uv: [texOffX + depth + width, texOffY, texOffX + depth, texOffY + depth],
      }
    }
    if (visibleFaces.includes(Direction.UP)) {
      directionFaces[Direction.UP] = {
        texture,
        uv: [texOffX + depth + width, texOffY, texOffX + depth + width + width, texOffY + depth],
        rotation: 180,
      }
    }
    if (visibleFaces.includes(Direction.WEST)) {
      directionFaces[Direction.WEST] = {
        texture,
        uv: [texOffX + depth, texOffY + depth + height, texOffX, texOffY + depth],
      }
    }
    if (visibleFaces.includes(Direction.NORTH)) {
      directionFaces[Direction.NORTH] = {
        texture,
        uv: [texOffX + depth, texOffY + depth + height, texOffX + depth + width, texOffY + depth],
      }
    }
    if (visibleFaces.includes(Direction.EAST)) {
      directionFaces[Direction.EAST] = {
        texture,
        uv: [
          texOffX + depth + width + depth,
          texOffY + depth + height,
          texOffX + depth + width,
          texOffY + depth,
        ],
      }
    }
    if (visibleFaces.includes(Direction.SOUTH)) {
      directionFaces[Direction.SOUTH] = {
        texture,
        uv: [
          texOffX + depth + width + depth,
          texOffY + depth + height,
          texOffX + depth + width + depth + width,
          texOffY + depth,
        ],
      }
    }
  }
  else {
    if (visibleFaces.includes(Direction.DOWN)) {
      directionFaces[Direction.DOWN] = {
        texture,
        uv: [texOffX + depth, texOffY, texOffX + depth + width, texOffY + depth],
      }
    }
    if (visibleFaces.includes(Direction.UP)) {
      directionFaces[Direction.UP] = {
        texture,
        uv: [texOffX + depth + width + width, texOffY, texOffX + depth + width, texOffY + depth],
        rotation: 180,
      }
    }
    if (visibleFaces.includes(Direction.WEST)) {
      directionFaces[Direction.WEST] = {
        texture,
        uv: [texOffX + depth, texOffY + depth + height, texOffX, texOffY + depth],
      }
    }
    if (visibleFaces.includes(Direction.NORTH)) {
      directionFaces[Direction.NORTH] = {
        texture,
        uv: [texOffX + depth + width, texOffY + depth + height, texOffX + depth, texOffY + depth],
      }
    }
    if (visibleFaces.includes(Direction.EAST)) {
      directionFaces[Direction.EAST] = {
        texture,
        uv: [
          texOffX + depth + width + depth,
          texOffY + depth + height,
          texOffX + depth + width,
          texOffY + depth,
        ],
      }
    }
    if (visibleFaces.includes(Direction.SOUTH)) {
      directionFaces[Direction.SOUTH] = {
        texture,
        uv: [
          texOffX + depth + width + depth + width,
          texOffY + depth + height,
          texOffX + depth + width + depth,
          texOffY + depth,
        ],
      }
    }
  }

  return bakeModel(
    materialPicker,
    {
      elements: [
        {
          from: [fromX + poseOffX, fromY + poseOffY, fromZ + poseOffZ],
          to: [fromX + width + poseOffX, fromY + height + poseOffY, fromZ + depth + poseOffZ],
          shade,
          faces: directionFaces,
        },
      ],
    },
    rotation,
    false,
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
  throw new Error(`Unknown facing: ${facing}`)
}

// net.minecraft.client.renderer.blockentity.ChestRenderer
async function renderChest(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const specials = await modelManager.getSpecialBlocksData(blockState.blockName)
  const normalTexture = specials[0]
  const leftTexture = specials[1]
  const rightTexture = specials[2]
  const facing = blockState.getBlockProperty('facing')
  const rotation = fromFacingToRotation(facing)
  const type =
    blockState.blockName === 'ender_chest' ? 'single' : blockState.getBlockProperty('type')

  let modelBottom
  let modelLid
  let modelLock
  if (type === 'single') {
    modelBottom = boxModel(
      normalTexture,
      materialPicker,
      [1, 0, 1],
      [14, 10, 14],
      [0, 19],
      [0, 0, 0],
      rotation!,
    )
    modelLid = boxModel(
      normalTexture,
      materialPicker,
      [1, 0, 0],
      [14, 5, 14],
      [0, 0],
      [0, 9, 1],
      rotation!,
    )
    modelLock = boxModel(
      normalTexture,
      materialPicker,
      [7, -2, 14],
      [2, 4, 1],
      [0, 0],
      [0, 9, 1],
      rotation!,
    )
  } else if (type === 'left') {
    modelBottom = boxModel(
      leftTexture,
      materialPicker,
      [0, 0, 1],
      [15, 10, 14],
      [0, 19],
      [0, 0, 0],
      rotation!,
    )
    modelLid = boxModel(
      leftTexture,
      materialPicker,
      [0, 0, 0],
      [15, 5, 14],
      [0, 0],
      [0, 9, 1],
      rotation!,
    )
    modelLock = boxModel(
      leftTexture,
      materialPicker,
      [0, -2, 14],
      [1, 4, 1],
      [0, 0],
      [0, 9, 1],
      rotation!,
    )
  } else if (type === 'right') {
    modelBottom = boxModel(
      rightTexture,
      materialPicker,
      [1, 0, 1],
      [15, 10, 14],
      [0, 19],
      [0, 0, 0],
      rotation!,
    )
    modelLid = boxModel(
      rightTexture,
      materialPicker,
      [1, 0, 0],
      [15, 5, 14],
      [0, 0],
      [0, 9, 1],
      rotation!,
    )
    modelLock = boxModel(
      rightTexture,
      materialPicker,
      [15, -2, 14],
      [1, 4, 1],
      [0, 0],
      [0, 9, 1],
      rotation!,
    )
  } else {
    throw new Error(`Unknown chest type for ${blockState}`)
  }

  const transform = new THREE.Matrix4().makeTranslation(x, y, z)
  const material = materialPicker.pickMaterialWithRenderType('cutout')
  await renderModelNoCullsWithMS(await modelBottom, blockState, material, scene, transform)
  await renderModelNoCullsWithMS(await modelLid, blockState, material, scene, transform)
  await renderModelNoCullsWithMS(await modelLock, blockState, material, scene, transform)
}

// net.minecraft.client.renderer.blockentity.ShulkerBoxRenderer
async function renderShulkerBox(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]
  const facing = blockState.getBlockProperty('facing')
  let rotation = IDENTITY_ROTATION
  let move = [0.5, -0.5, 0.5]
  switch (facing) {
    case 'down':
      break
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
    default:
      throw new Error(`Unknown facing for shulker box: ${facing}`)
  }

  const modelLid = boxModel(
    texture,
    materialPicker,
    [-8, -16, -8],
    [16, 12, 16],
    [0, 0],
    [0, 24, 0],
    rotation,
  )
  const modelBase = boxModel(
    texture,
    materialPicker,
    [-8, -8, -8],
    [16, 8, 16],
    [0, 28],
    [0, 24, 0],
    rotation,
  )

  const transform = new THREE.Matrix4().makeTranslation(x + move[0], y + move[1], z + move[2])
  const material = materialPicker.pickMaterialWithRenderType('cutout')
  await renderModelNoCullsWithMS(await modelLid, blockState, material, scene, transform)
  await renderModelNoCullsWithMS(await modelBase, blockState, material, scene, transform)
}

// net.minecraft.client.model.BookModel
// prettier-ignore
async function renderBook(
  scene: THREE.Scene,
  transform: THREE.Matrix4,
  block: BlockState,
  texture: number,
  materialPicker: MaterialPicker,
  [rotAngle, openScale, flipPage1Percent, flipPage2Percent]: number[],
) {
  const modelLeftLid = boxModel(texture, materialPicker, [-6, -5, -0.005], [6, 10, 0.005], [0, 0])
  const modelRightLid = boxModel(texture, materialPicker, [0, -5, -0.005], [6, 10, 0.005], [16, 0])
  const modelSeam = boxModel(texture, materialPicker, [-1, -5, 0], [2, 10, 0.005], [12, 0])
  const modelLeftPages = boxModel(texture, materialPicker, [0, -4, -0.99], [5, 8, 1], [0, 10])
  const modelRightPages = boxModel(texture, materialPicker, [0, -4, -0.01], [5, 8, 1], [12, 10])
  const modelFlipPage = boxModel(texture, materialPicker, [0, -4, 0], [5, 8, 0.005], [24, 10])

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

  const material = materialPicker.pickMaterialWithRenderType('solid')
  await renderModelNoCullsWithMS(await modelLeftLid, block, material, scene, transform.clone().multiply(leftLidMatrix), true)
  await renderModelNoCullsWithMS(await modelRightLid, block, material, scene, transform.clone().multiply(rightLidMatrix), true)
  await renderModelNoCullsWithMS(await modelSeam, block, material, scene, transform.clone().multiply(seamMatrix), true)
  await renderModelNoCullsWithMS(await modelLeftPages, block, material, scene, transform.clone().multiply(leftPagesMatrix), true)
  await renderModelNoCullsWithMS(await modelRightPages, block, material, scene, transform.clone().multiply(rightPagesMatrix), true)
  await renderModelNoCullsWithMS(await modelFlipPage, block, material, scene, transform.clone().multiply(flipPage1Matrix), true)
  await renderModelNoCullsWithMS(await modelFlipPage, block, material, scene, transform.clone().multiply(flipPage2Matrix), true)
}

// net.minecraft.client.renderer.blockentity.LecternRenderer
async function renderLecternBlock(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  if (blockState.getBlockProperty('has_book') === 'false') return
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]
  const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))
  const transform = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
    .multiply(new THREE.Matrix4().makeTranslation(0.5, 1.0625, 0.5))
    .multiply(new THREE.Matrix4().makeRotationY((-(rotation.y + 90) / 180) * Math.PI))
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI * 0.375))
    .multiply(new THREE.Matrix4().makeTranslation(0, -0.125, 0))
  await renderBook(scene, transform, blockState, texture, materialPicker, [0, 1.2, 0.1, 0.9])
}

// net.minecraft.client.renderer.blockentity.EnchantTableRenderer
async function renderEnchantTable(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]
  const time = 0
  const rotation = 0
  const transform = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
    .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.75, 0.5))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0.1 + Math.sin(time * 0.1) * 0.01, 0))
    .multiply(new THREE.Matrix4().makeRotationY(-rotation))
    .multiply(new THREE.Matrix4().makeRotationZ((4 * Math.PI) / 9))
  await renderBook(scene, transform, blockState, texture, materialPicker, [0, 0, 0, 0])
}

// net.minecraft.client.renderer.blockentity.BellRenderer
async function renderBell(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]
  const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))

  const modelBellBody = boxModel(
    texture,
    materialPicker,
    [-3, -6, -3],
    [6, 7, 6],
    [0, 0],
    [8, 12, 8],
    rotation,
  )
  const modelBellBase = boxModel(
    texture,
    materialPicker,
    [4, 4, 4],
    [8, 2, 8],
    [0, 13],
    [0, 0, 0],
    rotation,
  )

  const transform = new THREE.Matrix4().makeTranslation(x, y, z)
  const material = materialPicker.pickMaterialWithRenderType('solid')
  await renderModelNoCullsWithMS(await modelBellBody, blockState, material, scene, transform)
  await renderModelNoCullsWithMS(await modelBellBase, blockState, material, scene, transform)
}

// net.minecraft.client.renderer.blockentity.DecoratedPotRenderer
// prettier-ignore
async function renderDecoratedPot(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const [base, side] = await modelManager.getSpecialBlocksData(blockState.blockName)
  const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))

  const modelNeck1 = boxModel(base, materialPicker, [4, 17, 4], [8, 3, 8], [0, 0])
  const modelNeck2 = boxModel(base, materialPicker, [5, 20, 5], [6, 1, 6], [0, 5])
  const modelTopBottom = boxModel(base, materialPicker, [0, 0, 0], [14, 0, 14], [-14, 13])
  const modelSide = boxModel(
    side,
    materialPicker,
    [0, 0, 0],
    [14, 16, 0],
    [1, 0],
    [0, 0, 0],
    IDENTITY_ROTATION,
    [Direction.NORTH],
  )

  const matrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
    .multiply(new THREE.Matrix4().makeTranslation(0.5, 0, 0.5))
    .multiply(new THREE.Matrix4().makeRotationY((1 - rotation.y / 180) * Math.PI))
    .multiply(new THREE.Matrix4().makeTranslation(-0.5, 0, -0.5))
  const neckMatrix = new THREE.Matrix4()
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(0, 37 / 16, 16 / 16))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI))
  const neck1Matrix = new THREE.Matrix4()
    .multiply(neckMatrix)
    .multiply(new THREE.Matrix4().makeTranslation(8 / 16, 18.5 / 16, 8 / 16))
    .multiply(new THREE.Matrix4().scale(new THREE.Vector3(78 / 80, 28 / 30, 78 / 80)))
    .multiply(new THREE.Matrix4().makeTranslation(-8 / 16, -18.5 / 16, -8 / 16))
  const neck2Matrix = new THREE.Matrix4()
    .multiply(neckMatrix)
    .multiply(new THREE.Matrix4().makeTranslation(8 / 16, 20.5 / 16, 8 / 16))
    .multiply(new THREE.Matrix4().scale(new THREE.Vector3(64 / 60, 14 / 10, 64 / 60)))
    .multiply(new THREE.Matrix4().makeTranslation(-8 / 16, -20.5 / 16, -8 / 16))
  const topMatrix = new THREE.Matrix4()
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(1 / 16, 1, 1 / 16))
  const botMatrix = new THREE.Matrix4()
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(1 / 16, 0, 1 / 16))
  const backMatrix = new THREE.Matrix4()
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(15 / 16, 16 / 16, 1 / 16))
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))
  const leftMatrix = new THREE.Matrix4()
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(1 / 16, 16 / 16, 1 / 16))
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))
    .multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2))
  const rightMatrix = new THREE.Matrix4()
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(15 / 16, 16 / 16, 15 / 16))
    .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))
  const frontMatrix = new THREE.Matrix4()
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(1 / 16, 16 / 16, 15 / 16))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI))

  const material = materialPicker.pickMaterialWithRenderType('solid')
  await renderModelNoCullsWithMS(await modelNeck1, blockState, material, scene, neck1Matrix, true)
  await renderModelNoCullsWithMS(await modelNeck2, blockState, material, scene, neck2Matrix, true)
  await renderModelNoCullsWithMS(await modelTopBottom, blockState, material, scene, topMatrix, true)
  await renderModelNoCullsWithMS(await modelTopBottom, blockState, material, scene, botMatrix, true)
  await renderModelNoCullsWithMS(await modelSide, blockState, material, scene, backMatrix, true)
  await renderModelNoCullsWithMS(await modelSide, blockState, material, scene, leftMatrix, true)
  await renderModelNoCullsWithMS(await modelSide, blockState, material, scene, rightMatrix, true)
  await renderModelNoCullsWithMS(await modelSide, blockState, material, scene, frontMatrix, true)
}

async function renderBed(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]
  const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))

  let main
  let left
  let right
  let leftMatrixRaw
  let rightMatrixRaw
  if (blockState.getBlockProperty('part') === 'head') {
    main = boxModel(texture, materialPicker, [0, 0, 0], [16, 16, 6], [0, 0])
    left = boxModel(texture, materialPicker, [0, 6, 0], [3, 3, 3], [50, 6])
    right = boxModel(texture, materialPicker, [-16, 6, 0], [3, 3, 3], [50, 6])
    leftMatrixRaw = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    rightMatrixRaw = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeRotationZ(Math.PI))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
  } else if (blockState.getBlockProperty('part') === 'foot') {
    main = boxModel(texture, materialPicker, [0, 0, 0], [16, 16, 6], [0, 22])
    left = boxModel(texture, materialPicker, [0, 6, -16], [3, 3, 3], [50, 0])
    right = boxModel(texture, materialPicker, [-16, 6, -16], [3, 3, 3], [50, 12])
    leftMatrixRaw = new THREE.Matrix4().multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    rightMatrixRaw = new THREE.Matrix4()
      .multiply(new THREE.Matrix4().makeRotationZ((Math.PI * 3) / 2))
      .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
  } else {
    throw new Error(`Unknown bed part for ${blockState}`)
  }

  const matrix = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(x, y, z))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0.5625, 0))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5))
    .multiply(new THREE.Matrix4().makeRotationZ((rotation.y / 180 + 1) * Math.PI))
    .multiply(new THREE.Matrix4().makeTranslation(-0.5, -0.5, -0.5))
  const leftMatrix = new THREE.Matrix4().multiply(matrix).multiply(leftMatrixRaw)
  const rightMatrix = new THREE.Matrix4().multiply(matrix).multiply(rightMatrixRaw)
  const material = materialPicker.pickMaterialWithRenderType('solid')
  await renderModelNoCullsWithMS(await main, blockState, material, scene, matrix, true)
  await renderModelNoCullsWithMS(await left, blockState, material, scene, leftMatrix, true)
  await renderModelNoCullsWithMS(await right, blockState, material, scene, rightMatrix, true)
}

const dyeColorMapping = {
  white: 0xf9fffe,
  orange: 0xf9801d,
  magenta: 0xc74ebd,
  light_blue: 0x3ab3da,
  yellow: 0xfed83d,
  lime: 0x80c71f,
  pink: 0xf38baa,
  gray: 0x474f52,
  light_gray: 0x9d9d97,
  cyan: 0x169c9c,
  purple: 0x8932b8,
  blue: 0x3c44aa,
  brown: 0x835432,
  green: 0x5e7c16,
  red: 0xb02e26,
  black: 0x1d1d21,
} as Record<string, number>

async function renderBanner(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]

  const modelFlag = boxModel(texture, materialPicker, [-10, 0, -2], [20, 40, 1], [0, 0])
  const modelPole = boxModel(texture, materialPicker, [-1, -30, -1], [2, 42, 2], [44, 0])
  const modelBar = boxModel(texture, materialPicker, [-10, -32, -1], [20, 2, 2], [0, 42])

  const time = 0
  const blockName = blockState.blockName
  const matrixBase = new THREE.Matrix4().makeTranslation(x, y, z)
  let poleVisible
  if (blockName.endsWith('_wall_banner')) {
    poleVisible = false
    const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))
    matrixBase
      .multiply(new THREE.Matrix4().makeTranslation(0.5, -1 / 6, 0.5))
      .multiply(new THREE.Matrix4().makeRotationY((-rotation.y / 180) * Math.PI))
      .multiply(new THREE.Matrix4().makeTranslation(0, -0.3125, -0.4375))
  } else {
    poleVisible = true
    const rotation = Number.parseInt(blockState.getBlockProperty('rotation'))
    matrixBase
      .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5))
      .multiply(new THREE.Matrix4().makeRotationY((-rotation / 8) * Math.PI))
  }
  matrixBase.multiply(new THREE.Matrix4().makeScale(2 / 3, -2 / 3, -2 / 3))

  const material = materialPicker.pickMaterialWithRenderType('solid')
  if (poleVisible)
    await renderModelNoCullsWithMS(await modelPole, blockState, material, scene, matrixBase, true)
  await renderModelNoCullsWithMS(await modelBar, blockState, material, scene, matrixBase, true)

  const wind = ((x * 7 + y * 9 + z * 13 + time) % 100) / 100
  const angle = Math.PI * (-0.0125 + 0.01 * Math.cos(Math.PI * 2 * wind))
  const flagMatrix = new THREE.Matrix4()
    .multiply(matrixBase)
    .multiply(new THREE.Matrix4().makeTranslation(0, -32 / 16, 0))
    .multiply(new THREE.Matrix4().makeRotationX(angle))
  const dyeColor = dyeColorMapping[blockName.substring(0, blockName.indexOf('_'))]
  const flagMaterial = async (animated: boolean) => {
    const material = await materialPicker.pickMaterialWithRenderType('solid')(animated)
    const materialClone = material.clone()
    materialClone.color.set(dyeColor)
    materialClone.side = THREE.DoubleSide
    return materialClone
  }
  await renderModelNoCullsWithMS(await modelFlag, blockState, flagMaterial, scene, flagMatrix, true)
}

async function renderPlainSkull(
  scene: THREE.Scene,
  blockState: BlockState,
  texture: number,
  materialPicker: MaterialPicker,
  material: (animated: boolean) => Promise<THREE.MeshBasicMaterial>,
  transform: THREE.Matrix4,
  rotation: number,
) {
  const modelHead = boxModel(texture, materialPicker, [-4, -8, -4], [8, 8, 8], [0, 0])
  const matrix = new THREE.Matrix4()
    .multiply(transform)
    .multiply(new THREE.Matrix4().makeRotationY(rotation))
  await renderModelNoCullsWithMS(await modelHead, blockState, material, scene, matrix, true)
}

async function renderDragonHead(
  scene: THREE.Scene,
  blockState: BlockState,
  texture: number,
  materialPicker: MaterialPicker,
  material: (animated: boolean) => Promise<THREE.MeshBasicMaterial>,
  transform: THREE.Matrix4,
  rotation: number,
) {
  const modelUpperLip = boxModel(texture, materialPicker, [-6, -1, -24], [12, 5, 16], [176, 44])
  const modelUpperHead = boxModel(texture, materialPicker, [-8, -8, -10], [16, 16, 16], [112, 30])
  const modelScale = boxModel(
    texture,
    materialPicker,
    [-5, -12, -4],
    [2, 4, 6],
    [0, 0],
    [0, 0, 0],
    IDENTITY_ROTATION,
    [
      Direction.NORTH,
      Direction.SOUTH,
      Direction.WEST,
      Direction.EAST,
      Direction.UP,
      Direction.DOWN,
    ],
    true,
  )
  const modelNoStril = boxModel(
    texture,
    materialPicker,
    [-5, -3, -22],
    [2, 2, 4],
    [112, 0],
    [0, 0, 0],
    IDENTITY_ROTATION,
    [
      Direction.NORTH,
      Direction.SOUTH,
      Direction.WEST,
      Direction.EAST,
      Direction.UP,
      Direction.DOWN,
    ],
    true,
  )
  const modelScale2 = boxModel(texture, materialPicker, [3, -12, -4], [2, 4, 6], [0, 0])
  const modelNoStril2 = boxModel(texture, materialPicker, [3, -3, -22], [2, 2, 4], [112, 0])
  const modelJaw = boxModel(texture, materialPicker, [-6, 0, -16], [12, 4, 16], [176, 65])

  const headMatrix = new THREE.Matrix4()
    .multiply(transform)
    .multiply(new THREE.Matrix4().makeTranslation(0, -0.374375, 0))
    .multiply(new THREE.Matrix4().makeScale(0.75, 0.75, 0.75))
    .multiply(new THREE.Matrix4().makeRotationY(rotation))
  const jawMatrix = new THREE.Matrix4()
    .multiply(headMatrix)
    .multiply(new THREE.Matrix4().makeTranslation(0, 4 / 16, -8 / 16))
    .multiply(new THREE.Matrix4().makeRotationX(0.2))

  await renderModelNoCullsWithMS(await modelUpperLip, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(
    await modelUpperHead,
    blockState,
    material,
    scene,
    headMatrix,
    true,
  )
  await renderModelNoCullsWithMS(await modelScale, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(await modelNoStril, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(await modelScale2, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(await modelNoStril2, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(await modelJaw, blockState, material, scene, jawMatrix, true)
}

async function renderPiglinHead(
  scene: THREE.Scene,
  blockState: BlockState,
  texture: number,
  materialPicker: MaterialPicker,
  material: (animated: boolean) => Promise<THREE.MeshBasicMaterial>,
  transform: THREE.Matrix4,
  rotation: number,
) {
  const modelHead1 = boxModel(texture, materialPicker, [-5, -8, -4], [10, 8, 8], [0, 0])
  const modelHead2 = boxModel(texture, materialPicker, [-2, -4, -5], [4, 4, 1], [31, 1])
  const modelHead3 = boxModel(texture, materialPicker, [2, -2, -5], [1, 2, 1], [2, 4])
  const modelHead4 = boxModel(texture, materialPicker, [-3, -2, -5], [1, 2, 1], [2, 0])
  const modelLeftEar = boxModel(texture, materialPicker, [0, 0, -2], [1, 5, 4], [51, 6])
  const modelRightEar = boxModel(texture, materialPicker, [-1, 0, -2], [1, 5, 4], [39, 6])

  const headMatrix = new THREE.Matrix4()
    .multiply(transform)
    .multiply(new THREE.Matrix4().makeRotationY(rotation))
  const leftEarMatrix = new THREE.Matrix4()
    .multiply(headMatrix)
    .multiply(new THREE.Matrix4().makeTranslation(4.5 / 16, -6 / 16, 0))
    .multiply(new THREE.Matrix4().makeRotationZ(-0.5))
  const rightEarMatrix = new THREE.Matrix4()
    .multiply(headMatrix)
    .multiply(new THREE.Matrix4().makeTranslation(-4.5 / 16, -6 / 16, 0))
    .multiply(new THREE.Matrix4().makeRotationZ(0.5))

  await renderModelNoCullsWithMS(await modelHead1, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(await modelHead2, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(await modelHead3, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(await modelHead4, blockState, material, scene, headMatrix, true)
  await renderModelNoCullsWithMS(
    await modelLeftEar,
    blockState,
    material,
    scene,
    leftEarMatrix,
    true,
  )
  await renderModelNoCullsWithMS(
    await modelRightEar,
    blockState,
    material,
    scene,
    rightEarMatrix,
    true,
  )
}

async function renderSkull(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]

  const matrix = new THREE.Matrix4().makeTranslation(x, y, z)
  let rot
  if (blockState.blockName.includes('wall')) {
    const direction = getDirectionFromName(blockState.getBlockProperty('facing'))
    const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))
    matrix
      .multiply(
        new THREE.Matrix4().makeTranslation(
          0.5 - getStepX(direction) * 0.25,
          0.25,
          0.5 - getStepZ(direction) * 0.25,
        ),
      )
      .multiply(new THREE.Matrix4().makeScale(-1, -1, 1))
    rot = (1 - rotation.y / 180) * Math.PI
  } else {
    const rotation = Number.parseInt(blockState.getBlockProperty('rotation'))
    matrix
      .multiply(new THREE.Matrix4().makeTranslation(0.5, 0, 0.5))
      .multiply(new THREE.Matrix4().makeScale(-1, -1, 1))
    rot = (rotation / 8) * Math.PI
  }

  const material = blockState.blockName.includes('player')
    ? async (animated: boolean) =>
        animated
          ? materialPicker.animatedTexture.translucent
          : materialPicker.staticTexture.translucent
    : async (animated: boolean) => {
        const material = animated
          ? materialPicker.animatedTexture.cutout
          : materialPicker.staticTexture.cutout
        const materialClone = material.clone()
        materialClone.side = THREE.DoubleSide
        return materialClone
      }

  if (blockState.blockName.includes('dragon')) {
    await renderDragonHead(scene, blockState, texture, materialPicker, material, matrix, rot)
  } else if (blockState.blockName.includes('piglin')) {
    await renderPiglinHead(scene, blockState, texture, materialPicker, material, matrix, rot)
  } else {
    await renderPlainSkull(scene, blockState, texture, materialPicker, material, matrix, rot)
  }
}

async function renderSign(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]

  const modelSign = boxModel(texture, materialPicker, [-12, -14, -1], [24, 12, 2], [0, 0])
  const modelStick = boxModel(texture, materialPicker, [-1, -2, -1], [2, 14, 2], [0, 14])

  const transform = new THREE.Matrix4().makeTranslation(x, y, z)
  if (blockState.blockName.includes('wall')) {
    const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))
    transform
      .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5))
      .multiply(new THREE.Matrix4().makeRotationY((-rotation.y / 180) * Math.PI))
      .multiply(new THREE.Matrix4().makeTranslation(0, -0.3125, -0.4375))
  } else {
    const rotation = Number.parseInt(blockState.getBlockProperty('rotation'))
    transform
      .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5))
      .multiply(new THREE.Matrix4().makeRotationY((-rotation / 8) * Math.PI))
  }
  transform.multiply(new THREE.Matrix4().makeScale(2 / 3, -2 / 3, -2 / 3))

  const material = async (animated: boolean) => {
    const material = animated
      ? materialPicker.animatedTexture.cutout
      : materialPicker.staticTexture.cutout
    const materialClone = material.clone()
    materialClone.side = THREE.DoubleSide
    return materialClone
  }
  await renderModelNoCullsWithMS(await modelSign, blockState, material, scene, transform, true)
  if (!blockState.blockName.includes('wall'))
    await renderModelNoCullsWithMS(await modelStick, blockState, material, scene, transform, true)
}

async function renderHangingSign(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  blockState: BlockState,
  modelManager: BlockStateModelManager,
  materialPicker: MaterialPicker,
) {
  const texture = (await modelManager.getSpecialBlocksData(blockState.blockName))[0]

  const modelBoard = boxModel(texture, materialPicker, [-7, 0, -1], [14, 10, 2], [0, 12])
  const modelPlank = boxModel(texture, materialPicker, [-8, -6, -2], [16, 2, 4], [0, 0])
  const modelChain1 = boxModel(texture, materialPicker, [-1.5, 0, 0], [3, 6, 0], [0, 6])
  const modelChain2 = boxModel(texture, materialPicker, [-1.5, 0, 0], [3, 6, 0], [6, 6])
  const modelVChains = boxModel(texture, materialPicker, [-6, -6, 0], [12, 6, 0], [14, 6])

  const transform = new THREE.Matrix4().makeTranslation(x, y, z)
  if (blockState.blockName.includes('wall')) {
    const rotation = fromFacingToRotation(blockState.getBlockProperty('facing'))
    transform
      .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.9375, 0.5))
      .multiply(new THREE.Matrix4().makeRotationY((rotation.y / 180) * Math.PI))
      .multiply(new THREE.Matrix4().makeTranslation(0, -0.3125, 0))
  } else {
    const rotation = Number.parseInt(blockState.getBlockProperty('rotation'))
    transform
      .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.9375, 0.5))
      .multiply(new THREE.Matrix4().makeRotationY((-rotation / 8) * Math.PI))
      .multiply(new THREE.Matrix4().makeTranslation(0, -0.3125, 0))
  }
  transform.multiply(new THREE.Matrix4().makeScale(1, -1, -1))
  const chainL1Matrix = new THREE.Matrix4()
    .multiply(transform)
    .multiply(new THREE.Matrix4().makeTranslation(-5 / 16, -6 / 16, 0))
    .multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 4))
  const chainL2Matrix = new THREE.Matrix4()
    .multiply(transform)
    .multiply(new THREE.Matrix4().makeTranslation(-5 / 16, -6 / 16, 0))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4))
  const chainR1Matrix = new THREE.Matrix4()
    .multiply(transform)
    .multiply(new THREE.Matrix4().makeTranslation(5 / 16, -6 / 16, 0))
    .multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 4))
  const chainR2Matrix = new THREE.Matrix4()
    .multiply(transform)
    .multiply(new THREE.Matrix4().makeTranslation(5 / 16, -6 / 16, 0))
    .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 4))

  const material = async (animated: boolean) => {
    const material = animated
      ? materialPicker.animatedTexture.cutout
      : materialPicker.staticTexture.cutout
    const materialClone = material.clone()
    materialClone.side = THREE.DoubleSide
    return materialClone
  }

  await renderModelNoCullsWithMS(await modelBoard, blockState, material, scene, transform, true)
  if (blockState.blockName.includes('wall')) {
    await renderModelNoCullsWithMS(await modelPlank, blockState, material, scene, transform, true)
    await renderModelNoCullsWithMS(
      await modelChain1,
      blockState,
      material,
      scene,
      chainL1Matrix,
      true,
    )
    await renderModelNoCullsWithMS(
      await modelChain2,
      blockState,
      material,
      scene,
      chainL2Matrix,
      true,
    )
    await renderModelNoCullsWithMS(
      await modelChain1,
      blockState,
      material,
      scene,
      chainR1Matrix,
      true,
    )
    await renderModelNoCullsWithMS(
      await modelChain2,
      blockState,
      material,
      scene,
      chainR2Matrix,
      true,
    )
  } else {
    if (blockState.getBlockProperty('attached') === 'false') {
      await renderModelNoCullsWithMS(
        await modelChain1,
        blockState,
        material,
        scene,
        chainL1Matrix,
        true,
      )
      await renderModelNoCullsWithMS(
        await modelChain2,
        blockState,
        material,
        scene,
        chainL2Matrix,
        true,
      )
      await renderModelNoCullsWithMS(
        await modelChain1,
        blockState,
        material,
        scene,
        chainR1Matrix,
        true,
      )
      await renderModelNoCullsWithMS(
        await modelChain2,
        blockState,
        material,
        scene,
        chainR2Matrix,
        true,
      )
    } else {
      await renderModelNoCullsWithMS(
        await modelVChains,
        blockState,
        material,
        scene,
        transform,
        true,
      )
    }
  }
}
