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
  invisibleBlockColor,
} from '@/tools/blockStructureRenderer/hardcodes.ts'
import { renderFluid } from '@/tools/blockStructureRenderer/fluid.ts'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import {
  type BSRApiResponse,
  type BlockStateDefinition,
  type StateData,
  EMPTY_STATE_DATA,
  type BlockModel,
  type AnimatedTexture,
  type ModelReference,
  type ModelReferenceWithWeight,
} from '@/tools/blockStructureRenderer/definitions.ts'
import { fetchJigsawAPI } from '@/utils/jigsaw.ts'

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

  toString() {
    return `${this.fluid}[level=${this.level},falling=${this.falling}]`
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

  toString() {
    if (Object.entries(this.blockProperties).length === 0) return this.blockName
    return `${this.blockName}[${Object.entries(this.blockProperties)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, value]) => `${key}=${value}`)
      .join(',')}]`
  }

  toBlockStateDefinition(): BlockStateDefinition {
    return {
      name: this.blockName,
      properties: this.blockProperties,
    }
  }
}

// Block Data Fetcher ------------------------------------------------------------------------------
function blockStateDefinitionToString(blockState: BlockStateDefinition) {
  if (blockState.properties && Object.entries(blockState.properties).length > 0) {
    return `${blockState.name}[${Object.entries(blockState.properties)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, value]) => `${key}=${value}`)
      .join(',')}]`
  } else {
    return blockState.name
  }
}

export class BlockDataStorage {
  private readonly jigsawApiResponse: Promise<BSRApiResponse>
  private readonly blockStateInfos: Promise<Record<string, StateData>>

  constructor(blockStates: BlockState[]) {
    const blockDefinitions = blockStates.map((blockState) => blockState.toString()).join('|')
    this.jigsawApiResponse = fetchJigsawAPI(
      `renderer?states=${encodeURIComponent(blockDefinitions)}`,
    ).then((res) => res.json())
    this.blockStateInfos = this.jigsawApiResponse.then((data) => {
      const blockStateInfos: Record<string, StateData> = {}
      data.states.forEach((stateData) => {
        blockStateInfos[blockStateDefinitionToString(stateData.state)] = stateData
      })
      return blockStateInfos
    })
  }

  async getBlockDataByName(blockName: string): Promise<StateData[]> {
    if (blockName === 'air' || blockName === 'structure_void') return [EMPTY_STATE_DATA]
    const blockStateInfos = await this.blockStateInfos
    return Object.values(blockStateInfos).filter((stateData) => stateData.state.name === blockName)
  }

  async getBlockData(blockState: BlockState): Promise<StateData> {
    const blockStateString = blockState.toString()
    if (blockStateString === 'air' || blockStateString === 'structure_void') return EMPTY_STATE_DATA
    const blockStateInfos = await this.blockStateInfos
    if (!blockStateInfos[blockStateString]) {
      console.warn(`No block data for block state ${blockStateString}`)
      return EMPTY_STATE_DATA
    }
    return blockStateInfos[blockStateString]
  }

  async getModelByReference(modelReference: number): Promise<BlockModel | null> {
    const jigsawApiResponse = await this.jigsawApiResponse
    const name = String(modelReference)
    if (!jigsawApiResponse.models[name]) {
      console.warn(`No model for model reference ${name}`)
      return null
    }
    return jigsawApiResponse.models[name]
  }

  async getTextureByReference(
    textureReference: number,
  ): Promise<AnimatedTexture | number[] | null> {
    const jigsawApiResponse = await this.jigsawApiResponse
    const name = String(textureReference)
    if (!jigsawApiResponse.textures[name]) {
      console.warn(`No texture for texture reference ${name}, using missing texture`)
      return null
    }
    return jigsawApiResponse.textures[name]
  }

  async getModelRefs(): Promise<Record<string, (ModelReference | ModelReferenceWithWeight[])[]>> {
    const response = await this.jigsawApiResponse
    const blockModelInfos: Record<string, (ModelReference | ModelReferenceWithWeight[])[]> = {}
    response.states.forEach((modelData) => {
      blockModelInfos[blockStateDefinitionToString(modelData.state)] = modelData.parts
    })
    return blockModelInfos
  }
}

const AIR_KEY = '+'
const STRUCTURE_VOID_KEY = '-'
const AIR_STATE = new BlockState('air')
const STRUCTURE_VOID = new BlockState('structure_void')

export class BlockStructure {
  readonly structures: string[][][] // yzx
  readonly marks: [number, number, number, THREE.Color][] = []

  readonly x: number
  readonly y: number
  readonly z: number

  yRange?: number[]

  constructor(structureStr: string, marks: string[]) {
    const splitHeightLines = structureStr.split(';')
    let maxX = 0,
      maxZ = 0
    const maxY = splitHeightLines.length
    for (let y = 0; y < splitHeightLines.length; y++) {
      const splitLines = splitHeightLines[y].replace(/\s/, '').split(',')
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
      .map(() => new Array(maxZ).fill(0).map(() => new Array(maxX).fill(AIR_KEY)))

    for (let y = 0; y < splitHeightLines.length; y++) {
      const splitLines = splitHeightLines[y].replace(/\s/, '').split(',')
      for (let z = 0; z < splitLines.length; z++) {
        const line = splitLines[z]
        for (let x = 0; x < line.length; x++) {
          this.structures[y][z][x] = line[x]
        }
      }
    }

    marks
      .map((mark) => mark.trim())
      .filter((s) => s !== '')
      .forEach((mark) => {
        mark = mark.trim()
        const splitPointMark = mark.indexOf('#')
        const markColor = mark.substring(splitPointMark + 1)
        const markData = mark.substring(0, splitPointMark).split(',')
        const x = parseInt(markData[0])
        const y = parseInt(markData[1])
        const z = parseInt(markData[2])
        const colorInt = parseInt(markColor, 16)
        if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(colorInt))
          console.warn(`Invalid mark data: ${markData}`)
        else this.marks.push([x, y, z, new THREE.Color(colorInt)])
      })
  }

  forEachBlock(
    callback: (x: number, y: number, z: number, blockKey: string) => void,
    ignoreInvisible: boolean,
    fullY: boolean = false,
  ) {
    let minY = 0
    let maxY = this.y
    if (this.yRange && !fullY) {
      minY = this.yRange[0]
      maxY = this.yRange[1]
    }
    for (let y = minY; y < maxY; y++) {
      for (let z = 0; z < this.z; z++) {
        for (let x = 0; x < this.x; x++) {
          const blockKeyHere = this.structures[y][z][x]
          if ((blockKeyHere === STRUCTURE_VOID_KEY || blockKeyHere === AIR_KEY) && ignoreInvisible)
            continue
          callback(x, y, z, blockKeyHere)
        }
      }
    }
  }

  forEachMark(callback: (x: number, y: number, z: number, color: THREE.Color) => void) {
    let minY = 0
    let maxY = this.y
    if (this.yRange) {
      minY = this.yRange[0]
      maxY = this.yRange[1]
    }
    this.marks.forEach(([x, y, z, color]) => {
      if (y < minY || y >= maxY) return
      callback(x, y, z, color)
    })
  }

  hasMarks() {
    return this.marks.length > 0
  }

  getMark(x: number, y: number, z: number): THREE.Color | undefined {
    if (x < 0 || y < 0 || z < 0 || x >= this.x || y >= this.y || z >= this.z) return undefined
    if (this.yRange && (y < this.yRange[0] || y > this.yRange[1] - 1)) return undefined
    return this.marks.find(([mx, my, mz]) => mx === x && my === y && mz === z)?.[3]
  }

  getBlock(x: number, y: number, z: number): string {
    if (x < 0 || y < 0 || z < 0 || x >= this.x || y >= this.y || z >= this.z) return AIR_KEY
    if (this.yRange && (y < this.yRange[0] || y > this.yRange[1] - 1)) return AIR_KEY
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
    if (this.nameStateMapping[AIR_KEY])
      console.warn('Block key "+" is reserved for air, please do not use it in the block mapping')
    if (this.nameStateMapping[STRUCTURE_VOID_KEY])
      console.warn(
        'Block key "-" is reserved for structure void, please do not use it in the block mapping',
      )
  }

  toBlockState(blockKey: string): BlockState {
    if (blockKey === AIR_KEY) return AIR_STATE
    if (blockKey === STRUCTURE_VOID_KEY) return STRUCTURE_VOID
    if (!this.nameStateMapping[blockKey])
      console.warn(`No name mapping for block key '${blockKey}, using default air (+)`)
    return this.nameStateMapping[blockKey] ?? AIR_STATE
  }

  getAllBlockStates(): BlockState[] {
    const blockStates = Object.values(this.nameStateMapping)
    if (blockStates.some((blockState) => blockState.fluidState.fluid === 'water'))
      blockStates.push(new BlockState('water[level=0]'))
    return blockStates
  }
}

export function bakeFluidRenderLayer(
  scene: THREE.Scene,
  materialPicker: MaterialPicker,
  blockStructure: BlockStructure,
  nameMapping: NameMapping,
  modelManager: BlockStateModelManager,
) {
  blockStructure.forEachBlock((x, y, z, blockKey) => {
    const thisFluid = nameMapping.toBlockState(blockKey).fluidState
    if (thisFluid.fluid === 'air') return
    renderFluid(scene, materialPicker, modelManager, x, y, z, (x, y, z) =>
      nameMapping.toBlockState(blockStructure.getBlock(x, y, z)),
    ).catch((reason) => {
      console.error(`Error in rendering fluid ${thisFluid.toString()} at [${x},${y},${z}]`)
      console.error(reason)
    })
  }, true)
}

export function bakeBlockModelRenderLayer(
  scene: THREE.Scene,
  materialPicker: MaterialPicker,
  blockStructure: BlockStructure,
  nameMapping: NameMapping,
  modelManager: BlockStateModelManager,
) {
  blockStructure.forEachBlock(async (x, y, z, blockKey) => {
    const thisBlock = nameMapping.toBlockState(blockKey)
    const blockName = thisBlock.blockName

    const matchHardcodedRenderer = hardCodedRenderers.filter((value) =>
      value.block instanceof RegExp ? value.block.test(blockName) : value.block === blockName,
    )
    if (matchHardcodedRenderer.length > 0) {
      console.log(
        `Using hard-coded renderer for block ${thisBlock} (${blockKey}) at [${x},${y},${z}]`,
      )
      matchHardcodedRenderer[0]
        .renderFunc(
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
        .catch((reason) => {
          console.error(
            `Error in hard-coded renderer for block ${thisBlock} (${blockKey}) at [${x},${y},${z}]`,
          )
          console.error(reason)
        })
      if (!matchHardcodedRenderer[0].needRenderModel) return
    }

    const modelMapping = await modelManager.getBlockModelProviderByKey(blockKey)
    if (!modelMapping) {
      console.warn(`No model mapping for block ${thisBlock} (${blockKey}) at [${x},${y},${z}]`)
      return
    }

    for (const provider of modelMapping) {
      const [modelReference, uvlock, rotX, rotY] = provider.getModel(x, y, z)
      const rotation = new Rotation(rotX ?? 0, rotY ?? 0)
      const translate = new THREE.Matrix4().makeTranslation(x, y, z)
      const baked = await modelManager.getOrBakeModel(
        materialPicker,
        modelReference,
        rotation,
        uvlock ?? false,
      )

      try {
        await renderModelNoCullFaces(baked, thisBlock, materialPicker, scene, translate)
      } catch (e) {
        console.error(
          `Error in rendering noncull faces for block ${thisBlock} (${blockKey}) at [${x},${y},${z}]`,
        )
        console.error(e)
      }

      try {
        for (const [direction, value] of Object.entries(baked.cullfaces)) {
          const directionFace = rotation.transformDirection(getDirectionFromName(direction))
          const oppositeFace = oppositeDirection(directionFace)
          const otherBlock = blockStructure.getBlock(
            ...moveTowardsDirection(x, y, z, directionFace),
          )
          const otherBlockState = nameMapping.toBlockState(otherBlock)

          if (hardCodedSkipRendering(thisBlock, otherBlockState, directionFace)) continue
          if (await modelManager.isBlockOcclude(otherBlockState)) {
            if (
              isOcclusion(
                await modelManager.getBlockOcclusionFace(thisBlock, directionFace),
                await modelManager.getBlockOcclusionFace(otherBlockState, oppositeFace),
              )
            )
              continue
          }

          await renderBakedFaces(value, thisBlock, materialPicker, scene, translate)
        }
      } catch (e) {
        console.error(
          `Error in rendering cull faces for block ${thisBlock} (${blockKey}) at [${x},${y},${z}]`,
        )
        console.error(e)
      }
    }
  }, true)
}

export function bakeBlockMarkers(scene: THREE.Scene, structure: BlockStructure) {
  structure.forEachMark((x, y, z, color) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      opacity: 0.2,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    const hexColor = color.getHex()
    const faces = []

    // Avoid z-fighting and self-occlusion
    if (structure.getMark(x, y, z + 1)?.getHex() !== hexColor) {
      const southGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
      southGeometry.translate(0.5, 0.5, 1.00005)
      faces.push(new THREE.Mesh(southGeometry, material))
    }
    if (structure.getMark(x, y, z - 1)?.getHex() !== hexColor) {
      const northGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
      northGeometry.rotateY(Math.PI)
      northGeometry.translate(0.5, 0.5, -0.00005)
      faces.push(new THREE.Mesh(northGeometry, material))
    }
    if (structure.getMark(x + 1, y, z)?.getHex() !== hexColor) {
      const eastGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
      eastGeometry.rotateY(Math.PI / 2)
      eastGeometry.translate(1.00005, 0.5, 0.5)
      faces.push(new THREE.Mesh(eastGeometry, material))
    }
    if (structure.getMark(x - 1, y, z)?.getHex() !== hexColor) {
      const westGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
      westGeometry.rotateY(-Math.PI / 2)
      westGeometry.translate(-0.00005, 0.5, 0.5)
      faces.push(new THREE.Mesh(westGeometry, material))
    }
    if (structure.getMark(x, y + 1, z)?.getHex() !== hexColor) {
      const upGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
      upGeometry.rotateX(-Math.PI / 2)
      upGeometry.translate(0.5, 1.00005, 0.5)
      faces.push(new THREE.Mesh(upGeometry, material))
    }
    if (structure.getMark(x, y - 1, z)?.getHex() !== hexColor) {
      const downGeometry = new THREE.PlaneGeometry(1.0001, 1.0001)
      downGeometry.rotateX(Math.PI / 2)
      downGeometry.translate(0.5, -0.00005, 0.5)
      faces.push(new THREE.Mesh(downGeometry, material))
    }

    faces.forEach((face) => {
      face.position.set(x, y, z)
      scene.add(face)
    })
  })
}

export function bakeInvisibleBlocks(
  renderer: THREE.Renderer,
  scene: THREE.Scene,
  nameMapping: NameMapping,
  structure: BlockStructure,
): LineMaterial[] {
  const materialList = [] as LineMaterial[]
  structure.forEachBlock((x, y, z, blockKey) => {
    const blockState = nameMapping.toBlockState(blockKey)
    const color = invisibleBlockColor[blockState.blockName]
    if (color) {
      const offset = blockState.blockName === 'air' ? 0.1 : 0
      const box = new THREE.BoxGeometry(0.1 + offset, 0.1 + offset, 0.1 + offset)
      const edges = new THREE.EdgesGeometry(box)
      const material = new LineMaterial({ color, linewidth: 2.5 })
      const line = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(edges), material)
      line.position.set(x + 0.5, y + 0.5, z + 0.5)
      scene.add(line)

      const rect = renderer.domElement.getBoundingClientRect()
      material.resolution.set(rect.right - rect.left, rect.bottom - rect.top)
      materialList.push(material)
    }
  }, false)
  return materialList
}
