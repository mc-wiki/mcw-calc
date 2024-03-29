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

    if (this.blockName === 'water' || this.blockName === 'lava') {
      const level = parseInt(this.blockProperties.level)
      if (level == 0) this.fluidState = new FluidState(this.blockName, 0, false)
      else if (level >= 8) this.fluidState = new FluidState(this.blockName, 8, true)
      else this.fluidState = new FluidState(this.blockName, 8 - level, false)
    } else if (this.blockName === 'seagrass' || this.blockName === 'kelp') {
      this.fluidState = new FluidState('water', 0, false)
    } else if (this.blockProperties['waterlogged'] === 'true') {
      this.fluidState = new FluidState('water', 0, false)
    } else {
      this.fluidState = new FluidState('air', 0, false)
    }
  }
}

const AIR_STATE = new BlockState('air')

export class BlockStructure {
  readonly structures: string[][][] // yzx
  readonly bakedModelReference: [number, boolean?, number?, number?][][][][]

  readonly x: number
  readonly y: number
  readonly z: number

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
    for (let y = 0; y < this.y; y++) {
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
    renderFluid(scene, materialPicker, modelManager, x, y, z, (x, y, z) =>
      nameMapping.toBlockState(blockStructure.getBlock(x, y, z)),
    )
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
      if (!matchHardcodedRenderer[0].needRenderModel) return
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

      renderModelNoCullFaces(baked, thisBlock, materialPicker, scene, translate)

      Object.entries(baked.cullfaces).forEach(([direction, value]) => {
        const directionFace = rotation.transformDirection(getDirectionFromName(direction))
        const oppositeFace = oppositeDirection(directionFace)
        const otherBlock = blockStructure.getBlock(...moveTowardsDirection(x, y, z, directionFace))
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
    })
  })
}
