import * as THREE from 'three'
import { MaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'
import {
  getDirectionFromName,
  isOcclusion,
  moveTowardsDirection,
  oppositeDirection,
  Rotation,
} from '@/tools/blockStructureRenderer/math.ts'
import {
  BlockStateModelManager,
  renderBakedFaces,
  renderModelNoCullFaces,
} from '@/tools/blockStructureRenderer/model.ts'
import {
  hardcodedBlockTint,
  hardCodedRenderers,
  hardCodedSkipRendering,
} from '@/tools/blockStructureRenderer/hardcodes.ts'
import { renderFluid } from '@/tools/blockStructureRenderer/fluid.ts'

// Block Structure ---------------------------------------------------------------------------------

export class FluidState {
  readonly fluid: 'water' | 'lava' | 'air'
  readonly level: number
  readonly falling: boolean

  constructor(fluid: 'water' | 'lava' | 'air', level: number, flowing: boolean) {
    this.fluid = fluid
    this.level = level
    this.falling = flowing
  }

  getHeight() {
    if (this.fluid === 'air') return 0
    if (this.level === 0) return 8 / 9
    return this.level / 9
  }
}

export class BlockState {
  readonly blockName: string
  readonly blockProperties: Record<string, string>
  readonly tintData: string[]
  readonly sourceDefinition: string
  readonly fluidState: FluidState

  constructor(state: string) {
    if (state.includes('!')) {
      const tintSplitPoint = state.indexOf('!')
      this.tintData = state.substring(tintSplitPoint + 1).split(',')
      state = state.substring(0, tintSplitPoint)
    } else {
      this.tintData = []
    }

    this.sourceDefinition = state
    const splitPoint = state.indexOf('[')
    if (splitPoint === -1) {
      this.blockName = state
      this.blockProperties = {}
    } else {
      this.blockName = state.substring(0, splitPoint)
      const properties = state.substring(splitPoint + 1, state.length - 1).split(',')
      this.blockProperties = {}
      properties.forEach((property) => {
        const [key, value] = property.split('=')
        this.blockProperties[key] = value
      })
    }

    try {
      hardcodedBlockTint(this)
    } catch (e) {
      console.error(
        `Error in tinting block ${this.blockName} with properties ${this.blockProperties}`,
      )
      console.error(e)
    }

    if (this.blockName === 'water' || this.blockName === 'lava') {
      if (this.blockProperties.level === undefined) {
        console.error(
          `Block ${this.blockName} does not have level property, fluid state will be ignored.`,
        )
        this.fluidState = new FluidState('air', 0, false)
      } else {
        const level = parseInt(this.blockProperties.level)
        if (level == 0) this.fluidState = new FluidState(this.blockName, 0, false)
        else if (level >= 8) this.fluidState = new FluidState(this.blockName, 8, true)
        else this.fluidState = new FluidState(this.blockName, 8 - level, false)
      }
    } else if (
      this.blockName === 'seagrass' ||
      this.blockName === 'kelp' ||
      this.blockName === 'bubble_column'
    ) {
      this.fluidState = new FluidState('water', 0, false)
    } else if (this.blockProperties['waterlogged'] === 'true') {
      this.fluidState = new FluidState('water', 0, false)
    } else {
      this.fluidState = new FluidState('air', 0, false)
    }
  }

  getBlockProperty(property: string) {
    if (this.blockProperties[property]) return this.blockProperties[property]
    throw new Error(
      `Block ${this.blockName} with properties map ${this.blockProperties} does not have property ${property},
       maybe it is not defined in the block state? Please check the block state definition.`,
    )
  }
}

const AIR_STATE = new BlockState('air')

export class BlockStructure {
  readonly structures: string[][][] // yzx
  readonly bakedModelReference: [number, boolean?, number?, number?][][][][]

  readonly x: number
  readonly y: number
  readonly z: number

  yRange?: number[]

  constructor(structureStr: string) {
    const splitHeightLines = structureStr.split(';')
    let maxX = 0,
      maxZ = 0
    const maxY = splitHeightLines.length
    for (let y = 0; y < splitHeightLines.length; y++) {
      const splitLines = splitHeightLines[y].split(',')
      if (splitLines.length > maxZ) maxZ = splitLines.length
      for (let z = 0; z < splitLines.length; z++) {
        const line = splitLines[z]
        if (line.length > maxX) maxX = line.length
      }
    }

    this.x = maxX
    this.y = maxY
    this.z = maxZ
    this.structures = new Array(maxY)
      .fill(0)
      .map(() => new Array(maxZ).fill(0).map(() => new Array(maxX).fill('-')))
    this.bakedModelReference = new Array(maxY)
      .fill(0)
      .map(() =>
        new Array(maxZ).fill(0).map(() => new Array(maxX).fill([-1, false, undefined, undefined])),
      )

    for (let y = 0; y < splitHeightLines.length; y++) {
      const splitLines = splitHeightLines[y].split(',')
      for (let z = 0; z < splitLines.length; z++) {
        const line = splitLines[z]
        for (let x = 0; x < line.length; x++) {
          this.structures[y][z][x] = line[x]
        }
      }
    }
  }

  forEach(callback: (x: number, y: number, z: number, blockKey: string) => void) {
    let minY = 0
    let maxY = this.y
    if (this.yRange) {
      minY = this.yRange[0]
      maxY = this.yRange[1]
    }
    for (let y = minY; y < maxY; y++) {
      for (let z = 0; z < this.z; z++) {
        for (let x = 0; x < this.x; x++) {
          if (this.structures[y][z][x] === '-') continue
          callback(x, y, z, this.structures[y][z][x])
        }
      }
    }
  }

  getBlock(x: number, y: number, z: number): string {
    if (x < 0 || y < 0 || z < 0 || x >= this.x || y >= this.y || z >= this.z) return '-'
    if (this.yRange && (y < this.yRange[0] || y > this.yRange[1] - 1)) return '-'
    return this.structures[y][z][x]
  }
}

// Name - Block - Block State Mapping --------------------------------------------------------------
export class NameMapping {
  readonly nameStateMapping: Record<string, BlockState> = {}

  constructor(blocks: string[]) {
    blocks.forEach((blockPair) => {
      const splitPoint = blockPair.indexOf('=')
      const blockName = blockPair.substring(0, splitPoint)
      const blockData = blockPair.substring(splitPoint + 1)
      this.nameStateMapping[blockName] = new BlockState(blockData)
    })
  }

  toBlockState(blockKey: string): BlockState {
    return this.nameStateMapping[blockKey] ?? AIR_STATE
  }
}

export function bakeFluidRenderLayer(
  scene: THREE.Scene,
  materialPicker: MaterialPicker,
  blockStructure: BlockStructure,
  nameMapping: NameMapping,
  modelManager: BlockStateModelManager,
) {
  blockStructure.forEach((x, y, z, blockKey) => {
    const thisFluid = nameMapping.toBlockState(blockKey).fluidState
    if (thisFluid.fluid === 'air') return
    try {
      renderFluid(scene, materialPicker, modelManager, x, y, z, (x, y, z) =>
        nameMapping.toBlockState(blockStructure.getBlock(x, y, z)),
      )
    } catch (e) {
      console.error(`Error in rendering fluid ${thisFluid} at [${x},${y},${z}]`)
      console.error(e)
    }
  })
}

export function bakeBlockModelRenderLayer(
  scene: THREE.Scene,
  materialPicker: MaterialPicker,
  blockStructure: BlockStructure,
  nameMapping: NameMapping,
  modelManager: BlockStateModelManager,
) {
  blockStructure.forEach((x, y, z, blockKey) => {
    const thisBlock = nameMapping.toBlockState(blockKey)
    const blockName = thisBlock.blockName

    const matchHardcodedRenderer = hardCodedRenderers.filter((value) =>
      value.block instanceof RegExp ? value.block.test(blockName) : value.block === blockName,
    )
    if (matchHardcodedRenderer.length > 0) {
      try {
        matchHardcodedRenderer[0].renderFunc(
          scene,
          x,
          y,
          z,
          thisBlock,
          modelManager,
          materialPicker,
          nameMapping,
          blockStructure,
        )
      } catch (e) {
        console.error(
          `Error in hard-coded renderer for block ${thisBlock}(${blockKey}) at [${x},${y},${z}]`,
        )
        console.error(e)
      }
      if (!matchHardcodedRenderer[0].needRenderModel) return
    }

    if (!modelManager.modelsMapping[blockKey]) {
      console.warn(`No model mapping for block ${thisBlock}(${blockKey}) at [${x},${y},${z}]`)
      return
    }

    modelManager.modelsMapping[blockKey].forEach((provider) => {
      const [modelReference, uvlock, rotX, rotY] = provider.getModel(x, y, z)
      const rotation = new Rotation(rotX ?? 0, rotY ?? 0)
      const translate = new THREE.Matrix4().makeTranslation(x, y, z)
      const baked = modelManager.getOrBakeModel(
        materialPicker,
        modelReference,
        rotation,
        uvlock ?? false,
      )

      try {
        renderModelNoCullFaces(baked, thisBlock, materialPicker, scene, translate)
      } catch (e) {
        console.error(
          `Error in rendering noncull faces for block ${thisBlock}(${blockKey}) at [${x},${y},${z}]`,
        )
        console.error(e)
      }

      try {
        Object.entries(baked.cullfaces).forEach(([direction, value]) => {
          const directionFace = rotation.transformDirection(getDirectionFromName(direction))
          const oppositeFace = oppositeDirection(directionFace)
          const otherBlock = blockStructure.getBlock(
            ...moveTowardsDirection(x, y, z, directionFace),
          )
          const otherBlockState = nameMapping.toBlockState(otherBlock)

          if (hardCodedSkipRendering(thisBlock, otherBlockState, directionFace)) return
          const otherOcclusion = modelManager.getOcclusionFaceData(otherBlockState)
          if (otherOcclusion.can_occlude) {
            const occlusionThis = modelManager.getOcclusionFaceData(thisBlock)[directionFace] ?? []
            const occlusionOther = otherOcclusion[oppositeFace] ?? []
            if (isOcclusion(occlusionThis, occlusionOther)) return
          }

          renderBakedFaces(value, thisBlock, materialPicker, scene, translate)
        })
      } catch (e) {
        console.error(
          `Error in rendering cull faces for block ${thisBlock}(${blockKey}) at [${x},${y},${z}]`,
        )
        console.error(e)
      }
    })
  })
}
