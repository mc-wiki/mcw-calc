import * as THREE from 'three'
import { MaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'
import {
  getDirectionFromName,
  isOcclusion,
  moveTowardsDirection,
  oppositeDirection,
  Rotation,
} from '@/tools/blockStructureRenderer/math.ts'
import { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import { hardCodedSkipRendering } from '@/tools/blockStructureRenderer/hardcodes.ts'

// Block Structure ---------------------------------------------------------------------------------

interface LiquidState {
  liquid: 'water' | 'lava' | 'air'
  level: number
  flowing: boolean
}

export class BlockState {
  readonly blockName: string
  readonly blockProperties: Record<string, string>
  readonly tintData: string[]
  readonly sourceDefinition: string

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

  toBlock(blockKey: string): string {
    return this.nameStateMapping[blockKey].blockName
  }

  getTint(blockKey: string): string[] {
    return this.nameStateMapping[blockKey].tintData
  }
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

    modelManager.modelsMapping[blockKey].forEach((provider) => {
      const [modelReference, uvlock, rotX, rotY] = provider.getModel(x, y, z)
      const rotation = new Rotation(rotX ?? 0, rotY ?? 0)
      const baked = modelManager.getOrBakeModel(
        materialPicker,
        modelReference,
        rotation,
        uvlock ?? false,
      )

      baked.unculledFaces.forEach((face) => {
        let material = materialPicker.pickMaterial(face.animated, thisBlock.blockName)
        if (face.tintindex !== undefined) {
          material = material.clone()
          material.color.set(new THREE.Color(parseInt(thisBlock.tintData[face.tintindex], 16)))
        }
        scene.add(new THREE.Mesh(face.planeGeometry.clone().translate(x, y, z), material))
      })

      Object.entries(baked.cullfaces).forEach(([direction, value]) => {
        const directionFace = rotation.transformDirection(getDirectionFromName(direction))
        const oppositeFace = oppositeDirection(directionFace)
        const otherBlock = blockStructure.getBlock(...moveTowardsDirection(x, y, z, directionFace))
        const otherBlockState = nameMapping.toBlockState(otherBlock)

        if (hardCodedSkipRendering(thisBlock, otherBlockState, directionFace)) return
        const otherOcclusion = modelManager.occlusionShapesMapping[otherBlock] ?? {
          can_occlude: false,
        }
        if (otherOcclusion.can_occlude) {
          const occlusionThis =
            (modelManager.occlusionShapesMapping[blockKey] ?? {})[directionFace] ?? []
          const occlusionOther = otherOcclusion[oppositeFace] ?? []
          if (isOcclusion(occlusionThis, occlusionOther)) return
        }

        value.forEach((face) => {
          let material = materialPicker.pickMaterial(face.animated, thisBlock.blockName)
          if (face.tintindex !== undefined) {
            material = material.clone()
            material.color.set(new THREE.Color(parseInt(thisBlock.tintData[face.tintindex], 16)))
          }
          scene.add(new THREE.Mesh(face.planeGeometry.clone().translate(x, y, z), material))
        })
      })
    })
  })
}
