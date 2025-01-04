import type {
  BlockModel,
  ModelElement,
  ModelReference,
  ModelReferenceWithWeight,
  ModelRotation,
} from '@/tools/blockStructureRenderer/definitions.ts'
import type { Rotation } from '@/tools/blockStructureRenderer/math.ts'
import type { MaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'
import { getShade } from '@/tools/blockStructureRenderer/hardcodes.ts'
import {
  Direction,
  getDirectionFromName,
  getUVGlobalToLocalFromDirection,
  getUVLocalToGlobalFromDirection,
  getVectorFromDirection,
} from '@/tools/blockStructureRenderer/math.ts'
import {
  BlockDataStorage,
  BlockState,
  type NameMapping,
} from '@/tools/blockStructureRenderer/renderer.ts'
import {
  ANIMATED_TEXTURE_ATLAS_SIZE,
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
} from '@/tools/blockStructureRenderer/texture.ts'
import * as THREE from 'three'

// Model Reference Provider ------------------------------------------------------------------------

export interface ModelReferenceProvider {
  getModel: (x: number, y: number, z: number) => [number, boolean?, number?, number?]
}

export class SingleModelReference implements ModelReferenceProvider {
  private readonly model: ModelReference

  constructor(model: ModelReference) {
    this.model = model
  }

  getModel(): [number, boolean?, number?, number?] {
    return [this.model.model, this.model.uvlock, this.model.x, this.model.y]
  }
}

export class ModelReferenceGroup implements ModelReferenceProvider {
  private readonly totalWeight: number
  private readonly models: ModelReferenceWithWeight[]

  constructor(models: ModelReferenceWithWeight[]) {
    this.models = models
    this.totalWeight = models.reduce((acc, model) => acc + (model.weight ?? 1), 0)
  }

  getModel(x: number, y: number, z: number): [number, boolean?, number?, number?] {
    let positionRelativeSeed = (x * 3129871) ^ (z * 116129781) ^ y
    positionRelativeSeed =
      positionRelativeSeed * positionRelativeSeed * 42317861 + positionRelativeSeed * 11
    positionRelativeSeed = positionRelativeSeed >> 16

    // Java LCG algorithm
    const seedParsed = (positionRelativeSeed ^ 0x5deece66d) & 0xffffffffffff
    const first = (seedParsed * 25214903917 + 11) & 0xffffffffffff
    const second = (first * 25214903917 + 11) & 0xffffffffffff
    const random = Math.abs(((first >> 16) << 16) + (second >> 16)) % this.totalWeight

    let acc = 0
    for (const model of this.models) {
      acc += model.weight ?? 1
      if (random < acc) {
        return [model.model, model.uvlock, model.x, model.y]
      }
    }

    return [this.models[0].model, this.models[0].uvlock, this.models[0].x, this.models[0].y]
  }
}

function parseModelReferenceProvider(
  model: ModelReference | ModelReferenceWithWeight[],
): ModelReferenceProvider {
  return Array.isArray(model) ? new ModelReferenceGroup(model) : new SingleModelReference(model)
}

// Bake Block Face UV Functions --------------------------------------------------------------------

class BlockFaceUV {
  uvs: number[]
  rotation: number

  constructor(uv: number[], rotation: number) {
    this.uvs = Array.from(uv)
    this.rotation = rotation
  }

  getVertexes() {
    switch (this.rotation) {
      case 90:
        return [0, 3, 0, 1, 2, 3, 2, 1]
      case 180:
        return [2, 3, 0, 3, 2, 1, 0, 1]
      case 270:
        return [2, 1, 2, 3, 0, 1, 0, 3]
      case 0:
      default:
        return [0, 1, 2, 1, 0, 3, 2, 3]
    }
  }
}

function completeMissingUV(element: ModelElement, direction: Direction): number[] {
  switch (direction) {
    case Direction.DOWN:
      return [element.from[0], 16 - element.to[2], element.to[0], 16 - element.from[2]]
    case Direction.UP:
      return [element.from[0], element.from[2], element.to[0], element.to[2]]
    case Direction.NORTH:
      return [16 - element.to[0], 16 - element.to[1], 16 - element.from[0], 16 - element.from[1]]
    case Direction.SOUTH:
      return [element.from[0], 16 - element.to[1], element.to[0], 16 - element.from[1]]
    case Direction.WEST:
      return [element.from[2], 16 - element.to[1], element.to[2], 16 - element.from[1]]
    case Direction.EAST:
      return [16 - element.to[2], 16 - element.to[1], 16 - element.from[2], 16 - element.from[1]]
  }
}

function recomputeUVs(
  blockUV: BlockFaceUV,
  rotation: Rotation,
  faceDirection: Direction,
): BlockFaceUV {
  const makeTransform = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(0.5, 0.5, 0.5))
    .multiply(getUVGlobalToLocalFromDirection(faceDirection))
    .multiply(rotation.asMatrix().invert())
    .multiply(getUVLocalToGlobalFromDirection(rotation.transformDirection(faceDirection)))
    .multiply(new THREE.Matrix4().makeTranslation(-0.5, -0.5, -0.5))

  const u1 = blockUV.uvs[0] / 16
  const v1 = blockUV.uvs[1] / 16
  const vector1 = new THREE.Vector4(u1, v1, 0, 1)
  vector1.applyMatrix4(makeTransform)
  const u2 = blockUV.uvs[2] / 16
  const v2 = blockUV.uvs[3] / 16
  const vector2 = new THREE.Vector4(u2, v2, 0, 1)
  vector2.applyMatrix4(makeTransform)

  const transformedU1 = vector1.x * 16
  const transformedU2 = vector2.x * 16
  const transformedV1 = vector1.y * 16
  const transformedV2 = vector2.y * 16

  let correctU1, correctV1, correctU2, correctV2
  if (Math.sign(u2 - u1) === Math.sign(transformedU2 - transformedU1)) {
    correctU1 = transformedU1
    correctU2 = transformedU2
  } else {
    correctU1 = transformedU2
    correctU2 = transformedU1
  }
  if (Math.sign(v2 - v1) === Math.sign(transformedV2 - transformedV1)) {
    correctV1 = transformedV1
    correctV2 = transformedV2
  } else {
    correctV1 = transformedV2
    correctV2 = transformedV1
  }

  const sourceRotation = (blockUV.rotation * Math.PI) / 180
  const rotationVector = new THREE.Vector3(
    Math.cos(sourceRotation),
    Math.sin(sourceRotation),
    0,
  ).applyMatrix3(new THREE.Matrix3().setFromMatrix4(makeTransform))
  const rotationAngle =
    (-Math.round((Math.atan2(rotationVector.y, rotationVector.x) / Math.PI) * 2) * 90) % 360
  return new BlockFaceUV([correctU1, correctV1, correctU2, correctV2], (rotationAngle + 360) % 360)
}

// Bake Face Functions -----------------------------------------------------------------------------

const FACE_MIN_Y = 0
const FACE_MAX_Y = 1
const FACE_MIN_Z = 2
const FACE_MAX_Z = 3
const FACE_MIN_X = 4
const FACE_MAX_X = 5

function computePlaneHeightAndWidth(
  initialShape: number[],
  faceDirection: Direction,
): [number, number] {
  switch (faceDirection) {
    case Direction.DOWN:
    case Direction.UP:
      return [
        initialShape[FACE_MAX_Z] - initialShape[FACE_MIN_Z],
        initialShape[FACE_MAX_X] - initialShape[FACE_MIN_X],
      ]
    case Direction.NORTH:
    case Direction.SOUTH:
      return [
        initialShape[FACE_MAX_Y] - initialShape[FACE_MIN_Y],
        initialShape[FACE_MAX_X] - initialShape[FACE_MIN_X],
      ]
    case Direction.WEST:
    case Direction.EAST:
      return [
        initialShape[FACE_MAX_Y] - initialShape[FACE_MIN_Y],
        initialShape[FACE_MAX_Z] - initialShape[FACE_MIN_Z],
      ]
  }
}

function rotatePlaneGeometry(planeGeometry: THREE.PlaneGeometry, faceDirection: Direction) {
  switch (faceDirection) {
    case Direction.DOWN:
      planeGeometry.rotateX(Math.PI / 2)
      break
    case Direction.UP:
      planeGeometry.rotateX(-Math.PI / 2)
      break
    case Direction.NORTH:
      planeGeometry.rotateY(Math.PI)
      break
    case Direction.SOUTH:
      break
    case Direction.WEST:
      planeGeometry.rotateY(-Math.PI / 2)
      break
    case Direction.EAST:
      planeGeometry.rotateY(Math.PI / 2)
      break
  }
}

function translatePlaneGeometry(
  planeGeometry: THREE.PlaneGeometry,
  initialShape: number[],
  faceDirection: Direction,
) {
  const xMean = (initialShape[FACE_MIN_X] + initialShape[FACE_MAX_X]) / 2
  const yMean = (initialShape[FACE_MIN_Y] + initialShape[FACE_MAX_Y]) / 2
  const zMean = (initialShape[FACE_MIN_Z] + initialShape[FACE_MAX_Z]) / 2
  switch (faceDirection) {
    case Direction.DOWN:
      planeGeometry.translate(xMean, initialShape[FACE_MIN_Y], zMean)
      break
    case Direction.UP:
      planeGeometry.translate(xMean, initialShape[FACE_MAX_Y], zMean)
      break
    case Direction.NORTH:
      planeGeometry.translate(xMean, yMean, initialShape[FACE_MIN_Z])
      break
    case Direction.SOUTH:
      planeGeometry.translate(xMean, yMean, initialShape[FACE_MAX_Z])
      break
    case Direction.WEST:
      planeGeometry.translate(initialShape[FACE_MIN_X], yMean, zMean)
      break
    case Direction.EAST:
      planeGeometry.translate(initialShape[FACE_MAX_X], yMean, zMean)
      break
  }
}

function applyPlaneTransformations(
  planeGeometry: THREE.PlaneGeometry,
  origin: THREE.Vector3,
  rotateMatrix: THREE.Matrix4,
  scaleVector: THREE.Vector3,
) {
  planeGeometry.translate(-origin.x, -origin.y, -origin.z)
  planeGeometry.applyMatrix4(rotateMatrix)
  planeGeometry.scale(scaleVector.x, scaleVector.y, scaleVector.z)
  planeGeometry.translate(origin.x, origin.y, origin.z)
}

function computeElementRotation(
  elementRotation: ModelRotation,
): [THREE.Matrix4, THREE.Vector3, THREE.Vector3] {
  let axis, scaleVector
  switch (elementRotation.axis) {
    case 'x':
      axis = new THREE.Vector3(1, 0, 0)
      scaleVector = new THREE.Vector3(0, 1, 1)
      break
    case 'y':
      axis = new THREE.Vector3(0, 1, 0)
      scaleVector = new THREE.Vector3(1, 0, 1)
      break
    case 'z':
      axis = new THREE.Vector3(0, 0, 1)
      scaleVector = new THREE.Vector3(1, 1, 0)
      break
  }
  const origin = new THREE.Vector3(
    elementRotation.origin[0] / 16,
    elementRotation.origin[1] / 16,
    elementRotation.origin[2] / 16,
  )
  const rotationMatrix = new THREE.Matrix4().makeRotationAxis(
    axis,
    (elementRotation.angle / 180) * Math.PI,
  )
  if (elementRotation.rescale) {
    if (Math.abs(elementRotation.angle) === 22.5) {
      scaleVector.multiplyScalar(1.0 / Math.cos(Math.PI / 8) - 1)
    } else {
      scaleVector.multiplyScalar(1.0 / Math.cos(Math.PI / 4) - 1)
    }
    scaleVector.add(new THREE.Vector3(1, 1, 1))
  } else {
    scaleVector = new THREE.Vector3(1, 1, 1)
  }
  return [rotationMatrix, origin, scaleVector]
}

// Baked Data Structures ---------------------------------------------------------------------------

export interface BakedFace {
  planeGeometry: THREE.PlaneGeometry
  animated: boolean
  direction: Direction
  directionVec: THREE.Vector3
  shade: boolean
  tintindex?: number
}

export interface BakedModel {
  cullfaces: {
    down: BakedFace[]
    up: BakedFace[]
    north: BakedFace[]
    south: BakedFace[]
    west: BakedFace[]
    east: BakedFace[]
  }
  unculledFaces: BakedFace[]
}

export class BlockStateModelManager {
  readonly bakedModelCache: Record<string, BakedModel> = {}
  readonly blockDataStorage: BlockDataStorage
  readonly nameMapping: NameMapping
  readonly modelsMapping: Promise<Record<string, ModelReferenceProvider[]>>

  constructor(nameMapping: NameMapping) {
    this.nameMapping = nameMapping
    this.blockDataStorage = new BlockDataStorage(nameMapping.getAllBlockStates())
    this.modelsMapping = this.blockDataStorage.getModelRefs().then((models) => {
      const result: Record<string, ModelReferenceProvider[]> = {}
      for (const [blockName, model] of Object.entries(models)) {
        result[blockName] = model.map(parseModelReferenceProvider)
      }
      return result
    })
  }

  async getSpecialBlocksData(blockName: string) {
    const stateData = await this.blockDataStorage.getBlockDataByName(blockName)
    if (!stateData || stateData.length === 0) return []
    return stateData[0].special_textures
  }

  async getBlockRenderType(blockName: string) {
    const stateData = await this.blockDataStorage.getBlockDataByName(blockName)
    if (!stateData || stateData.length === 0) return 'solid'
    return stateData[0].render_type
  }

  async isBlockBlocksMotion(blockState: BlockState) {
    return (await this.blockDataStorage.getBlockData(blockState)).blocks_motion
  }

  async getBlockSturdyFaces(blockState: BlockState) {
    return (await this.blockDataStorage.getBlockData(blockState)).face_sturdy
  }

  async isBlockOcclude(blockState: BlockState) {
    return (await this.blockDataStorage.getBlockData(blockState)).occlusion
  }

  async getBlockOcclusionFace(blockState: BlockState, face: Direction) {
    return (await this.blockDataStorage.getBlockData(blockState)).occlusion_shape[face] ?? []
  }

  async getBlockModelProvider(blockState: BlockState) {
    const name = blockState.toString()
    const models = await this.modelsMapping
    return models[name] ?? []
  }

  async getBlockModelProviderByKey(blockName: string) {
    return this.getBlockModelProvider(this.nameMapping.toBlockState(blockName))
  }

  async getOrBakeModel(
    materialPicker: MaterialPicker,
    modelReferenceInt: number,
    rotation: Rotation,
    uvlock: boolean,
  ) {
    const cacheKey = `${modelReferenceInt}:${rotation.toStringKey()}:${uvlock}`
    if (cacheKey in this.bakedModelCache) return this.bakedModelCache[cacheKey]

    const model = await this.blockDataStorage.getModelByReference(modelReferenceInt)
    if (!model) return (this.bakedModelCache[cacheKey] = createEmptyBakedModel())
    return (this.bakedModelCache[cacheKey] = await bakeModel(
      materialPicker,
      model,
      rotation,
      uvlock,
    ))
  }
}

function createEmptyBakedModel(): BakedModel {
  return {
    cullfaces: {
      down: [],
      up: [],
      north: [],
      south: [],
      west: [],
      east: [],
    },
    unculledFaces: [],
  }
}

export async function bakeModel(
  materialPicker: MaterialPicker,
  model: BlockModel,
  rotation: Rotation,
  uvlock: boolean,
) {
  const bakedModel = createEmptyBakedModel()

  for (const element of model.elements ?? []) {
    const from = new THREE.Vector3(...element.from)
    const to = new THREE.Vector3(...element.to)

    // Compute the element rotation
    const elementRotation = element.rotation
    const [elementRotationMatrix, origin, scaleVector] = elementRotation
      ? computeElementRotation(elementRotation)
      : [new THREE.Matrix4(), new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1)]

    for (const [faceName, face] of Object.entries(element.faces)) {
      if (!face) continue
      const faceDirection = getDirectionFromName(faceName)

      let blockFaceUV = new BlockFaceUV(
        face.uv ?? completeMissingUV(element, faceDirection),
        face.rotation ?? 0,
      )
      if (uvlock) {
        blockFaceUV = recomputeUVs(blockFaceUV, rotation, faceDirection)
      }

      const spriteData = await materialPicker.getTextureByReference(face.texture)
      let animated = false
      if (Array.isArray(spriteData)) {
        blockFaceUV.uvs[0] = (spriteData[0] + blockFaceUV.uvs[0]) / ATLAS_WIDTH
        blockFaceUV.uvs[2] = (spriteData[0] + blockFaceUV.uvs[2]) / ATLAS_WIDTH
        blockFaceUV.uvs[1] = 1 - (spriteData[1] + blockFaceUV.uvs[1]) / ATLAS_HEIGHT
        blockFaceUV.uvs[3] = 1 - (spriteData[1] + blockFaceUV.uvs[3]) / ATLAS_HEIGHT
      } else {
        const firstFrame = (await materialPicker.getTextureByReference(
          spriteData.frames[0],
        )) as number[]
        const [x, y] = materialPicker.animatedTextureManager.putNewTexture(
          face.texture,
          spriteData,
          [firstFrame[2], firstFrame[3]],
        )
        blockFaceUV.uvs[0] = (x + blockFaceUV.uvs[0]) / ANIMATED_TEXTURE_ATLAS_SIZE
        blockFaceUV.uvs[2] = (x + blockFaceUV.uvs[2]) / ANIMATED_TEXTURE_ATLAS_SIZE
        blockFaceUV.uvs[1] = 1 - (y + blockFaceUV.uvs[1]) / ANIMATED_TEXTURE_ATLAS_SIZE
        blockFaceUV.uvs[3] = 1 - (y + blockFaceUV.uvs[3]) / ANIMATED_TEXTURE_ATLAS_SIZE
        animated = true
      }

      const initialShape = [from.y / 16, to.y / 16, from.z / 16, to.z / 16, from.x / 16, to.x / 16]
      const [planeHeight, planeWidth] = computePlaneHeightAndWidth(initialShape, faceDirection)
      const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
      rotatePlaneGeometry(planeGeometry, faceDirection)
      translatePlaneGeometry(planeGeometry, initialShape, faceDirection)
      if (elementRotation) {
        applyPlaneTransformations(planeGeometry, origin, elementRotationMatrix, scaleVector)
      }
      if (!rotation.isIdentity()) {
        applyPlaneTransformations(
          planeGeometry,
          new THREE.Vector3(0.5, 0.5, 0.5),
          rotation.asMatrix(),
          new THREE.Vector3(1, 1, 1),
        )
      }

      planeGeometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(
          blockFaceUV.getVertexes().map((i) => blockFaceUV.uvs[i]),
          2,
        ),
      )

      const v1 = new THREE.Vector3(...planeGeometry.getAttribute('position').array.slice(0, 3))
      const v2 = new THREE.Vector3(...planeGeometry.getAttribute('position').array.slice(3, 6))
      const v3 = new THREE.Vector3(...planeGeometry.getAttribute('position').array.slice(6, 9))
      const normal = new THREE.Vector3()
        .crossVectors(v2.clone().sub(v1), v1.clone().sub(v3))
        .normalize()
      let direction
      if (Number.isFinite(normal.x) && Number.isFinite(normal.y) && Number.isFinite(normal.z)) {
        let maxValue = 0
        for (const [, value] of Object.entries(Direction)) {
          const dirNormal = getVectorFromDirection(value)
          if (dirNormal.dot(normal) > maxValue) {
            maxValue = dirNormal.dot(normal)
            direction = value
          }
        }
      }

      if (face.cullface) {
        bakedModel.cullfaces[getDirectionFromName(face.cullface)]?.push({
          planeGeometry,
          animated,
          direction: direction ?? Direction.UP,
          directionVec: normal,
          shade: element.shade ?? true,
          tintindex: face.tintindex,
        })
      } else {
        bakedModel.unculledFaces.push({
          planeGeometry,
          animated,
          direction: direction ?? Direction.UP,
          directionVec: normal,
          shade: element.shade ?? true,
          tintindex: face.tintindex,
        })
      }
    }
  }

  return bakedModel
}

export async function renderBakedFacesWithMS(
  faces: BakedFace[],
  block: BlockState,
  materialSupplier: (animated: boolean, blockName: string) => Promise<THREE.MeshBasicMaterial>,
  scene: THREE.Scene,
  transform: THREE.Matrix4,
  recomputeFaceShade?: boolean,
) {
  for (const face of faces) {
    const material = (await materialSupplier(face.animated, block.blockName)).clone()
    if (face.tintindex !== undefined) {
      material.color.set(new THREE.Color(Number.parseInt(block.tintData[face.tintindex], 16)))
    }
    if (recomputeFaceShade) {
      const transformedNormal = face.directionVec
        .clone()
        .applyMatrix3(new THREE.Matrix3().setFromMatrix4(transform))
        .normalize()
      let direction
      if (
        Number.isFinite(transformedNormal.x) &&
        Number.isFinite(transformedNormal.y) &&
        Number.isFinite(transformedNormal.z)
      ) {
        let maxValue = 0
        for (const [, value] of Object.entries(Direction)) {
          const dirNormal = getVectorFromDirection(value)
          if (dirNormal.dot(transformedNormal) > maxValue) {
            maxValue = dirNormal.dot(transformedNormal)
            direction = value
          }
        }
      }
      material.color.multiplyScalar(getShade(direction ?? Direction.UP, face.shade))
    } else {
      material.color.multiplyScalar(getShade(face.direction, face.shade))
    }
    const geometry = face.planeGeometry.clone().applyMatrix4(transform)
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
  }
}

export async function renderBakedFaces(
  faces: BakedFace[],
  block: BlockState,
  materialPicker: MaterialPicker,
  scene: THREE.Scene,
  transform: THREE.Matrix4,
  recomputeFaceShade?: boolean,
) {
  await renderBakedFacesWithMS(
    faces,
    block,
    (animated, blockName) => materialPicker.pickMaterial(animated, blockName),
    scene,
    transform,
    recomputeFaceShade,
  )
}

export async function renderModelNoCullFaces(
  bakedModel: BakedModel,
  block: BlockState,
  materialPicker: MaterialPicker,
  scene: THREE.Scene,
  transform: THREE.Matrix4,
  recomputeFaceShade?: boolean,
) {
  await renderBakedFaces(
    bakedModel.unculledFaces,
    block,
    materialPicker,
    scene,
    transform,
    recomputeFaceShade,
  )
}

export async function renderModelNoCullsWithMS(
  bakedModel: BakedModel,
  block: BlockState,
  materialSupplier: (animated: boolean, blockName: string) => Promise<THREE.MeshBasicMaterial>,
  scene: THREE.Scene,
  transform: THREE.Matrix4,
  recomputeFaceShade?: boolean,
) {
  await renderBakedFacesWithMS(
    bakedModel.unculledFaces,
    block,
    materialSupplier,
    scene,
    transform,
    recomputeFaceShade,
  )
}
