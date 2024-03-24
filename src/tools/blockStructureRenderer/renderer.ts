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

// Block Structure ---------------------------------------------------------------------------------

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
  readonly nameStateMapping: Record<string, string> = {}
  readonly nameBlockMapping: Record<string, string> = {}
  readonly stateKeyMapping: Record<string, string> = {}

  constructor(blocks: string[]) {
    blocks.forEach((blockPair) => {
      const splitPoint = blockPair.indexOf('=')
      const blockName = blockPair.substring(0, splitPoint)
      const blockStateKey = blockPair.substring(splitPoint + 1)
      this.nameStateMapping[blockName] = blockStateKey
      this.nameBlockMapping[blockName] = blockStateKey.includes('[')
        ? blockStateKey.substring(0, blockStateKey.indexOf('['))
        : blockStateKey
      this.stateKeyMapping[blockStateKey] = blockName
    })
  }

  toState(blockKey: string): string {
    return this.nameStateMapping[blockKey]
  }

  toBlock(blockKey: string): string {
    return this.nameBlockMapping[blockKey]
  }
}

export function bakeBlockModelRenderLayer(
  scene: THREE.Scene,
  materialPicker: MaterialPicker,
  blockStructure: BlockStructure,
  nameStateMapping: NameMapping,
  modelManager: BlockStateModelManager,
) {
  blockStructure.forEach((x, y, z, blockKey) => {
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
        scene.add(
          new THREE.Mesh(
            face.planeGeometry.clone().translate(x, y, z),
            materialPicker.pickMaterial(face.animated, nameStateMapping.toBlock(blockKey)),
          ),
        )
      })

      Object.entries(baked.cullfaces).forEach(([direction, value]) => {
        const directionFace = rotation.transformDirection(getDirectionFromName(direction))
        const oppositeFace = oppositeDirection(directionFace)
        const occlusionThis =
          (modelManager.occlusionShapesMapping[blockKey] ?? {})[directionFace] ?? []
        const otherBlock = blockStructure.getBlock(...moveTowardsDirection(x, y, z, directionFace))
        const occlusionOther =
          (modelManager.occlusionShapesMapping[otherBlock] ?? {})[oppositeFace] ?? []
        if (isOcclusion(occlusionThis, occlusionOther)) return

        value.forEach((face) => {
          scene.add(
            new THREE.Mesh(
              face.planeGeometry.clone().translate(x, y, z),
              materialPicker.pickMaterial(face.animated, nameStateMapping.toBlock(blockKey)),
            ),
          )
        })
      })
    })
  })
}
