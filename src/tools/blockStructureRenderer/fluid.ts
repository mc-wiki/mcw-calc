import type { BlockState } from '@/tools/blockStructureRenderer/renderer.ts'
import { FluidState } from '@/tools/blockStructureRenderer/renderer.ts'
import * as THREE from 'three'
import { MaterialPicker, SpriteData } from '@/tools/blockStructureRenderer/texture.ts'
import { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import {
  Direction,
  getDirectionFromName,
  getStepX,
  getStepZ,
  isOcclusion,
  isVerticalDirection,
  moveTowardsDirection,
  oppositeDirection,
} from '@/tools/blockStructureRenderer/math.ts'
import {
  checkNameInSet,
  getShade,
  halfTransparentBlocks,
  leavesBlocks,
  resolveSpecialTextures,
} from '@/tools/blockStructureRenderer/hardcodes.ts'

function isSameFluid(thisFluidState: FluidState, neighborFluidState: FluidState): boolean {
  return thisFluidState.fluid === neighborFluidState.fluid
}

async function isFaceOccludedByNeighbor(
  modelManager: BlockStateModelManager,
  height: number,
  otherBlockState: BlockState,
  direction: Direction,
) {
  if (await modelManager.isBlockOcclude(otherBlockState)) {
    return isOcclusion(
      [[0, 0, 1, height]],
      await modelManager.getBlockOcclusionFace(otherBlockState, oppositeDirection(direction)),
    )
  }
  return false
}

async function isFaceOccludedBySelf(
  modelManager: BlockStateModelManager,
  thisBlockState: BlockState,
  direction: Direction,
) {
  return isOcclusion(await modelManager.getBlockOcclusionFace(thisBlockState, direction), [
    [0, 0, 1, 1],
  ])
}

async function shouldRenderFace(
  modelManager: BlockStateModelManager,
  thisBlockState: BlockState,
  thisFluidState: FluidState,
  direction: Direction,
  otherFluidState: FluidState,
) {
  return (
    (await isFaceOccludedBySelf(modelManager, thisBlockState, direction)) &&
    !isSameFluid(thisFluidState, otherFluidState)
  )
}

async function isSolidBlock(modelManager: BlockStateModelManager, blockState: BlockState) {
  return (
    (await modelManager.isBlockBlocksMotion(blockState)) ||
    blockState.blockName === 'bamboo_sapling' ||
    blockState.blockName === 'cobweb'
  )
}

async function getHeight(
  modelManager: BlockStateModelManager,
  thisFluidState: FluidState,
  otherBlockState: BlockState,
  otherUpBlockState: BlockState,
) {
  if (isSameFluid(thisFluidState, otherBlockState.fluidState)) {
    if (isSameFluid(thisFluidState, otherUpBlockState.fluidState)) return 1
    return otherBlockState.fluidState.getHeight()
  }
  return (await isSolidBlock(modelManager, otherBlockState)) ? -1 : 0
}

async function getAverageHeight(
  modelManager: BlockStateModelManager,
  thisFluidState: FluidState,
  levelHeight: number,
  zAxisHeight: number,
  xAxisHeight: number,
  xzBlockState: BlockState,
  xzUpBlockState: BlockState,
) {
  if (xAxisHeight >= 1 || zAxisHeight >= 1) return 1
  const weightedArray = [0, 0]
  if (xAxisHeight > 0 || zAxisHeight > 0) {
    const cornerHeight = await getHeight(modelManager, thisFluidState, xzBlockState, xzUpBlockState)
    if (cornerHeight >= 1) return 1
    addWeightedHeight(weightedArray, cornerHeight)
  }
  addWeightedHeight(weightedArray, levelHeight)
  addWeightedHeight(weightedArray, xAxisHeight)
  addWeightedHeight(weightedArray, zAxisHeight)
  return weightedArray[0] / weightedArray[1]
}

function addWeightedHeight(weightedArray: number[], weight: number) {
  if (weight >= 0.8) {
    weightedArray[0] = weightedArray[0] + weight * 10
    weightedArray[1] = weightedArray[1] + 10
  } else if (weight >= 0) {
    weightedArray[0] = weightedArray[0] + weight
    weightedArray[1] = weightedArray[1] + 1
  }
}

function affectsFlow(thisFluidState: FluidState, fluidState: FluidState) {
  return fluidState.fluid === 'air' || thisFluidState.fluid === fluidState.fluid
}

async function isSolidFace(
  modelManager: BlockStateModelManager,
  thisFluidState: FluidState,
  blockState: BlockState,
  direction: Direction,
) {
  if (thisFluidState.fluid === blockState.fluidState.fluid) return false
  if (direction === Direction.UP) return true
  if (blockState.blockName === 'ice' || blockState.blockName === 'frosted_ice') return false
  return (await modelManager.getBlockSturdyFaces(blockState)).includes(direction)
}

async function getFlow(
  modelManager: BlockStateModelManager,
  thisFluidState: FluidState,
  neighbors: Record<Direction, BlockState | undefined>,
  neighborsAbove: Record<Direction, BlockState | undefined>,
  neighborsBelow: Record<Direction, BlockState | undefined>,
) {
  let xFlow = 0
  let zFlow = 0
  for (const directionStr in neighbors) {
    const direction = getDirectionFromName(directionStr)
    if (isVerticalDirection(direction)) continue
    const neighbor = neighbors[direction]!
    const neighborFluidState = neighbor.fluidState
    if (!affectsFlow(thisFluidState, neighborFluidState)) continue
    const neighborHeight = neighborFluidState.getHeight()
    let calculatedHeight = 0
    if (neighborHeight == 0) {
      const fluidStateBelow = neighborsBelow[direction]!.fluidState
      if (
        !(await modelManager.isBlockBlocksMotion(neighbor)) &&
        affectsFlow(thisFluidState, fluidStateBelow) &&
        fluidStateBelow.getHeight() > 0
      ) {
        calculatedHeight = fluidStateBelow.getHeight() - (fluidStateBelow.getHeight() - 8 / 9)
      }
    } else if (neighborHeight > 0) {
      calculatedHeight = thisFluidState.getHeight() - neighborHeight
    }
    if (calculatedHeight == 0) continue
    xFlow += calculatedHeight * getStepX(direction)
    zFlow += calculatedHeight * getStepZ(direction)
  }
  const vector = new THREE.Vector3(xFlow, 0, zFlow)
  if (thisFluidState.falling) {
    for (const directionStr in neighbors) {
      const direction = getDirectionFromName(directionStr)
      if (isVerticalDirection(direction)) continue
      const neighbor = neighbors[direction]
      const neighborAbove = neighborsAbove[direction]
      if (
        (await isSolidFace(modelManager, thisFluidState, neighbor!, direction)) ||
        (await isSolidFace(modelManager, thisFluidState, neighborAbove!, direction))
      ) {
        vector.normalize().add(new THREE.Vector3(0, -6, 0))
        break
      }
    }
  }
  return vector.normalize()
}

async function isSolidRender(modelManager: BlockStateModelManager, blockState: BlockState) {
  for (const directionStr in Direction) {
    const direction = getDirectionFromName(directionStr)
    const occlusionFace = await modelManager.getBlockOcclusionFace(blockState, direction)
    if (occlusionFace.length === 0) return false
    if (!isOcclusion(occlusionFace, [[0, 0, 1, 1]])) return false
  }
  return true
}

async function shouldRenderBackwardUpFace(
  modelManager: BlockStateModelManager,
  thisFluidState: FluidState,
  up9Blocks: BlockState[],
) {
  for (const blockState of up9Blocks) {
    if (
      !(await isSolidRender(modelManager, blockState)) &&
      !isSameFluid(thisFluidState, blockState.fluidState)
    )
      return true
  }
  return false
}

// prettier-ignore
export async function renderFluid(
  scene: THREE.Scene,
  materialPicker: MaterialPicker,
  modelManager: BlockStateModelManager,
  x: number,
  y: number,
  z: number,
  blockStateGetter: (x: number, y: number, z: number) => BlockState,
) {
  const thisBlockState = blockStateGetter(x, y, z)
  const thisFluidState = thisBlockState.fluidState
  const fluidColor = thisFluidState.fluid === 'water' ?
    parseInt(thisBlockState.tintData[thisBlockState.tintData.length - 1] ?? '3f76e4', 16) :
    0xffffff
  const [resolvedMaterial, resolvedSprites] = await resolveSpecialTextures(
    thisFluidState.fluid,
    materialPicker,
    modelManager,
    'translucent',
  )

  const upBlockState = blockStateGetter(x, y + 1, z)
  const upFluidState = upBlockState.fluidState
  const downBlockState = blockStateGetter(x, y - 1, z)
  const downFluidState = downBlockState.fluidState
  const northBlockState = blockStateGetter(x, y, z - 1)
  const northFluidState = northBlockState.fluidState
  const southBlockState = blockStateGetter(x, y, z + 1)
  const southFluidState = southBlockState.fluidState
  const westBlockState = blockStateGetter(x - 1, y, z)
  const westFluidState = westBlockState.fluidState
  const eastBlockState = blockStateGetter(x + 1, y, z)
  const eastFluidState = eastBlockState.fluidState
  const northUpBlockState = blockStateGetter(x, y + 1, z - 1)
  const southUpBlockState = blockStateGetter(x, y + 1, z + 1)
  const westUpBlockState = blockStateGetter(x - 1, y + 1, z)
  const eastUpBlockState = blockStateGetter(x + 1, y + 1, z)
  const northWestBlockState = blockStateGetter(x - 1, y, z - 1)
  const northWestUpBlockState = blockStateGetter(x - 1, y + 1, z - 1)
  const northEastBlockState = blockStateGetter(x + 1, y, z - 1)
  const northEastUpBlockState = blockStateGetter(x + 1, y + 1, z - 1)
  const southWestBlockState = blockStateGetter(x - 1, y, z + 1)
  const southWestUpBlockState = blockStateGetter(x - 1, y + 1, z + 1)
  const southEastBlockState = blockStateGetter(x + 1, y, z + 1)
  const southEastUpBlockState = blockStateGetter(x + 1, y + 1, z + 1)

  const upCanRender = !isSameFluid(thisFluidState, upFluidState)
  const downCanRender = await shouldRenderFace(modelManager, thisBlockState, thisFluidState, Direction.DOWN, downFluidState) &&
    !await isFaceOccludedByNeighbor(modelManager, 1, downBlockState, Direction.DOWN)
  const northCanRender = await shouldRenderFace(modelManager, thisBlockState, thisFluidState, Direction.NORTH, northFluidState)
  const southCanRender = await shouldRenderFace(modelManager, thisBlockState, thisFluidState, Direction.SOUTH, southFluidState)
  const westCanRender = await shouldRenderFace(modelManager, thisBlockState, thisFluidState, Direction.WEST, westFluidState)
  const eastCanRender = await shouldRenderFace(modelManager, thisBlockState, thisFluidState, Direction.EAST, eastFluidState)
  if (!upCanRender && !downCanRender && !northCanRender && !southCanRender && !westCanRender && !eastCanRender) {
    return
  }

  const levelHeight = await getHeight(modelManager, thisFluidState, thisBlockState, upBlockState)
  let southWestHeight, southEastHeight, northWestHeight, northEastHeight
  if (levelHeight >= 1) {
    southWestHeight = 1
    southEastHeight = 1
    northWestHeight = 1
    northEastHeight = 1
  } else {
    const northHeight = await getHeight(modelManager, thisFluidState, northBlockState, northUpBlockState)
    const southHeight = await getHeight(modelManager, thisFluidState, southBlockState, southUpBlockState)
    const westHeight = await getHeight(modelManager, thisFluidState, westBlockState, westUpBlockState)
    const eastHeight = await getHeight(modelManager, thisFluidState, eastBlockState, eastUpBlockState)
    northWestHeight = await getAverageHeight(modelManager, thisFluidState, levelHeight, northHeight, westHeight, northWestBlockState, northWestUpBlockState)
    northEastHeight = await getAverageHeight(modelManager, thisFluidState, levelHeight, northHeight, eastHeight, northEastBlockState, northEastUpBlockState)
    southWestHeight = await getAverageHeight(modelManager, thisFluidState, levelHeight, southHeight, westHeight, southWestBlockState, southWestUpBlockState)
    southEastHeight = await getAverageHeight(modelManager, thisFluidState, levelHeight, southHeight, eastHeight, southEastBlockState, southEastUpBlockState)
  }

  const renderMinY = downCanRender ? 0.001 : 0

  if (upCanRender &&
    (Math.min(southWestHeight, southEastHeight, northWestHeight, northEastHeight) < 1 ||
      !await isFaceOccludedByNeighbor(modelManager, 1, upBlockState, Direction.UP))
  ) {
    southEastHeight -= 0.001
    southWestHeight -= 0.001
    northEastHeight -= 0.001
    northWestHeight -= 0.001
    const flow = await getFlow(
      modelManager,
      thisFluidState,
      {
        down: undefined, up: undefined,
        north: northBlockState, south: southBlockState,
        west: westBlockState, east: eastBlockState,
      },
      {
        down: undefined, up: undefined,
        north: northUpBlockState, south: southUpBlockState,
        west: westUpBlockState, east: eastUpBlockState,
      },
      {
        down: undefined, up: undefined,
        north: blockStateGetter(x, y - 1, z - 1),
        south: blockStateGetter(x, y - 1, z + 1),
        west: blockStateGetter(x - 1, y - 1, z),
        east: blockStateGetter(x + 1, y - 1, z),
      },
    )

    let northWestU, northEastU, southWestU, southEastU
    let northWestV, northEastV, southWestV, southEastV
    let material
    if (flow.x == 0 && flow.z == 0) {
      const spriteData = new SpriteData(
        resolvedSprites[0][0], resolvedSprites[0][1],
        resolvedSprites[0][2], resolvedSprites[0][3],
        resolvedSprites[0][4], resolvedSprites[0][5],
      )
      material = resolvedMaterial[0].clone()

      northWestU = spriteData.getU(0)
      northWestV = spriteData.getV(0)
      southWestU = northWestU
      southWestV = spriteData.getV(1)
      southEastU = spriteData.getU(1)
      southEastV = southWestV
      northEastU = southEastU
      northEastV = northWestV
    } else {
      const spriteData = new SpriteData(
        resolvedSprites[1][0], resolvedSprites[1][1],
        resolvedSprites[1][2], resolvedSprites[1][3],
        resolvedSprites[1][4], resolvedSprites[1][5],
      )
      material = resolvedMaterial[1].clone()

      const angle = Math.atan2(flow.z, flow.x) - Math.PI / 2
      const sinAngle = Math.sin(angle) * 0.25
      const cosAngle = Math.cos(angle) * 0.25

      northWestU = spriteData.getU(0.5 - cosAngle - sinAngle)
      northWestV = spriteData.getV(0.5 - cosAngle + sinAngle)
      southWestU = spriteData.getU(0.5 - cosAngle + sinAngle)
      southWestV = spriteData.getV(0.5 + cosAngle + sinAngle)
      southEastU = spriteData.getU(0.5 + cosAngle + sinAngle)
      southEastV = spriteData.getV(0.5 + cosAngle - sinAngle)
      northEastU = spriteData.getU(0.5 + cosAngle - sinAngle)
      northEastV = spriteData.getV(0.5 - cosAngle - sinAngle)
    }
    material.color.set(new THREE.Color(fluidColor).multiplyScalar(getShade(Direction.UP, true)))

    const geometry = new THREE.PlaneGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      1, northEastHeight, 0,
      1, southEastHeight, 1,
      0, northWestHeight, 0,
      0, southWestHeight, 1,
    ], 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      northEastU, northEastV,
      southEastU, southEastV,
      northWestU, northWestV,
      southWestU, southWestV,
    ], 2))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ], 3))
    geometry.translate(x, y, z)

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    if (await shouldRenderBackwardUpFace(
      modelManager, thisFluidState,
      [upBlockState, northWestUpBlockState, southWestUpBlockState,
        northEastUpBlockState, southEastUpBlockState, northUpBlockState,
        southBlockState, westUpBlockState, eastUpBlockState],
    )) {
      const geometryBackward = new THREE.PlaneGeometry()
      geometryBackward.setAttribute('position', new THREE.Float32BufferAttribute([
        0, southWestHeight, 1,
        1, southEastHeight, 1,
        0, northWestHeight, 0,
        1, northEastHeight, 0,
      ], 3))
      geometryBackward.setAttribute('uv', new THREE.Float32BufferAttribute([
        southWestU, southWestV,
        southEastU, southEastV,
        northWestU, northWestV,
        northEastU, northEastV,
      ], 2))
      geometryBackward.setAttribute('normal', new THREE.Float32BufferAttribute([
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
      ], 3))
      geometryBackward.translate(x, y, z)

      const meshBackward = new THREE.Mesh(geometryBackward, material)
      scene.add(meshBackward)
    }
  }

  if (downCanRender) {
    const spriteData = new SpriteData(
      resolvedSprites[0][0], resolvedSprites[0][1],
      resolvedSprites[0][2], resolvedSprites[0][3],
      resolvedSprites[0][4], resolvedSprites[0][5],
    )

    const geometry = new THREE.PlaneGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, renderMinY, 0,
      0, renderMinY, 1,
      1, renderMinY, 0,
      1, renderMinY, 1,
    ], 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      spriteData.getU(0), spriteData.getV(0),
      spriteData.getU(0), spriteData.getV(1),
      spriteData.getU(1), spriteData.getV(0),
      spriteData.getU(1), spriteData.getV(1),
    ], 2))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ], 3))
    geometry.translate(x, y, z)

    const material = resolvedMaterial[0].clone()
    material.color.set(new THREE.Color(fluidColor).multiplyScalar(getShade(Direction.DOWN, true)))
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
  }

  for (const [directionStr, renderData] of Object.entries({
    'north': [northCanRender, [northWestHeight, northEastHeight, 0, 1, 0.001, 0.001]],
    'south': [southCanRender, [southEastHeight, southWestHeight, 1, 0, 0.999, 0.999]],
    'west': [westCanRender, [southWestHeight, northWestHeight, 0.001, 0.001, 1, 0]],
    'east': [eastCanRender, [northEastHeight, southEastHeight, 0.999, 0.999, 0, 1]],
  } as Record<Direction, [boolean, number[]]>)) {
    if (!renderData[0]) continue
    const direction = getDirectionFromName(directionStr)
    const blockStateOnDirection = blockStateGetter(...moveTowardsDirection(x, y, z, direction))
    if (await isFaceOccludedByNeighbor(
      modelManager,
      Math.max(renderData[1][0], renderData[1][1]),
      blockStateOnDirection,
      direction)
    ) continue

    let spriteData = new SpriteData(
      resolvedSprites[1][0], resolvedSprites[1][1],
      resolvedSprites[1][2], resolvedSprites[1][3],
      resolvedSprites[1][4], resolvedSprites[1][5],
    )
    let material = resolvedMaterial[1].clone()
    let isWaterOverlay = false
    if (thisFluidState.fluid === 'water' &&
      (leavesBlocks.test(blockStateOnDirection.blockName) || checkNameInSet(blockStateOnDirection.blockName, halfTransparentBlocks))
    ) {
      spriteData = new SpriteData(
        resolvedSprites[2][0], resolvedSprites[2][1],
        resolvedSprites[2][2], resolvedSprites[2][3],
        resolvedSprites[2][4], resolvedSprites[2][5],
      )
      material = resolvedMaterial[2].clone()
      isWaterOverlay = true
    }
    material.color.set(new THREE.Color(fluidColor).multiplyScalar(getShade(direction, true)))

    const geometry = new THREE.PlaneGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      renderData[1][2], renderData[1][0], renderData[1][4],
      renderData[1][2], renderMinY, renderData[1][4],
      renderData[1][3], renderData[1][1], renderData[1][5],
      renderData[1][3], renderMinY, renderData[1][5],
    ], 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      spriteData.getU(0), spriteData.getV((1 - renderData[1][0]) * 0.5),
      spriteData.getU(0), spriteData.getV(0.5),
      spriteData.getU(0.5), spriteData.getV((1 - renderData[1][1]) * 0.5),
      spriteData.getU(0.5), spriteData.getV(0.5),
    ], 2))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ], 3))
    geometry.translate(x, y, z)

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    if (!isWaterOverlay) {
      const geometryBackward = new THREE.PlaneGeometry()
      geometryBackward.setAttribute('position', new THREE.Float32BufferAttribute([
        renderData[1][2], renderData[1][0], renderData[1][4],
        renderData[1][3], renderData[1][1], renderData[1][5],
        renderData[1][2], renderMinY, renderData[1][4],
        renderData[1][3], renderMinY, renderData[1][5],
      ], 3))
      geometryBackward.setAttribute('uv', new THREE.Float32BufferAttribute([
        spriteData.getU(0), spriteData.getV((1 - renderData[1][0]) * 0.5),
        spriteData.getU(0.5), spriteData.getV((1 - renderData[1][1]) * 0.5),
        spriteData.getU(0), spriteData.getV(0.5),
        spriteData.getU(0.5), spriteData.getV(0.5),
      ], 2))
      geometryBackward.setAttribute('normal', new THREE.Float32BufferAttribute([
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
      ], 3))
      geometryBackward.translate(x, y, z)

      const meshBackward = new THREE.Mesh(geometryBackward, material)
      scene.add(meshBackward)
    }
  }
}
