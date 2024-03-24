import * as THREE from 'three'

export interface BlockModel {
  elements?: ModelElement[]
}

export interface ModelElement {
  from: number[]
  to: number[]
  rotation?: ModelRotation
  faces: {
    down?: ModelFace
    up?: ModelFace
    north?: ModelFace
    south?: ModelFace
    west?: ModelFace
    east?: ModelFace
  }
}

export interface ModelFace {
  texture: number
  uv?: number[]
  rotation?: number
  tintindex?: number
  cullface?: string
}

export interface ModelRotation {
  origin: number[]
  axis: 'x' | 'y' | 'z'
  angle: number
  rescale?: boolean
}

export interface BlockState {
  variants?: Record<string, ModelReference | ModelReferenceWithWeight[]>
  multipart?: ConditionalPart[]
}

export interface ModelReference {
  model: number
  uvlock?: boolean
  x?: number
  y?: number
}

export interface ModelReferenceWithWeight {
  model: number
  uvlock?: boolean
  x?: number
  y?: number
  weight?: number
}

export interface ConditionalPart {
  apply: ModelReference | ModelReferenceWithWeight[]
  when?: Record<string, any> | AndCondition | OrCondition
}

export interface AndCondition {
  AND: (Record<string, any> | AndCondition | OrCondition)[]
}

export interface OrCondition {
  OR: (Record<string, any> | AndCondition | OrCondition)[]
}

export interface AnimatedTexture {
  frames: number[]
  time: number[]
  interpolate?: boolean
}

export interface ModelReferenceProvider {
  getModel(x: number, y: number, z: number): [number, boolean?, number?, number?]
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

function conditionMatch(
  condition: Record<string, any> | AndCondition | OrCondition,
  blockProperties: Record<string, string>,
): boolean {
  if ('AND' in condition) {
    return condition.AND.every((part: Record<string, any> | AndCondition | OrCondition) =>
      conditionMatch(part, blockProperties),
    )
  } else if ('OR' in condition) {
    return condition.OR.some((part: Record<string, any> | AndCondition | OrCondition) =>
      conditionMatch(part, blockProperties),
    )
  } else {
    return Object.entries(condition).every(([key, value]) =>
      blockProperties[key].split('|').includes(value),
    )
  }
}

export function chooseModel(
  blockState: string,
  blockStatesMapping: Record<string, BlockState>,
): ModelReferenceProvider[] {
  const blockName = blockState.split('[')[0]
  const blockStateData = blockStatesMapping[blockName]
  if (blockState.includes('[')) {
    const blockProperties = blockState.split('[')[1].split(']')[0].split(',')
    const blockPropertiesMap: Record<string, string> = {}
    for (const property of blockProperties) {
      const [key, value] = property.split('=')
      blockPropertiesMap[key] = value
    }

    if (blockStateData.variants) {
      for (const [key, value] of Object.entries(blockStateData.variants)) {
        const stateCondition = key.split(',')
        let match = true
        for (const condition of stateCondition) {
          const [key, value] = condition.split('=')
          if (blockPropertiesMap[key] !== value) {
            match = false
            break
          }
        }
        if (match) {
          return [parseModelReferenceProvider(value)]
        }
      }
    } else if (blockStateData.multipart) {
      const matchingPart = blockStateData.multipart.filter((part) =>
        conditionMatch(part.when ?? {}, blockPropertiesMap),
      )
      if (matchingPart.length > 0) {
        return matchingPart.map((part) => parseModelReferenceProvider(part.apply))
      }
    }
  } else {
    if (blockStateData.variants && blockStateData.variants['']) {
      return [parseModelReferenceProvider(blockStateData.variants[''])]
    } else if (blockStateData.multipart) {
      return blockStateData.multipart.map((part) => parseModelReferenceProvider(part.apply))
    }
  }
  return []
}

enum Direction {
  DOWN = 'down',
  UP = 'up',
  NORTH = 'north',
  SOUTH = 'south',
  WEST = 'west',
  EAST = 'east',
}

function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.DOWN:
      return Direction.UP
    case Direction.UP:
      return Direction.DOWN
    case Direction.NORTH:
      return Direction.SOUTH
    case Direction.SOUTH:
      return Direction.NORTH
    case Direction.WEST:
      return Direction.EAST
    case Direction.EAST:
      return Direction.WEST
  }
}

function moveTowardsDirection(
  x: number,
  y: number,
  z: number,
  direction: Direction,
): [number, number, number] {
  switch (direction) {
    case Direction.DOWN:
      return [x, y - 1, z]
    case Direction.UP:
      return [x, y + 1, z]
    case Direction.NORTH:
      return [x, y, z - 1]
    case Direction.SOUTH:
      return [x, y, z + 1]
    case Direction.WEST:
      return [x - 1, y, z]
    case Direction.EAST:
      return [x + 1, y, z]
  }
}

function getVectorFromDirection(direction: Direction): THREE.Vector3 {
  switch (direction) {
    case Direction.DOWN:
      return new THREE.Vector3(0, -1, 0)
    case Direction.UP:
      return new THREE.Vector3(0, 1, 0)
    case Direction.NORTH:
      return new THREE.Vector3(0, 0, -1)
    case Direction.SOUTH:
      return new THREE.Vector3(0, 0, 1)
    case Direction.WEST:
      return new THREE.Vector3(-1, 0, 0)
    case Direction.EAST:
      return new THREE.Vector3(1, 0, 0)
  }
}

function getUVLocalToGlobalFromDirection(direction: Direction): THREE.Matrix4 {
  switch (direction) {
    case Direction.SOUTH:
      return new THREE.Matrix4()
    case Direction.EAST:
      return new THREE.Matrix4().makeRotationY(Math.PI / 2)
    case Direction.WEST:
      return new THREE.Matrix4().makeRotationY(-Math.PI / 2)
    case Direction.NORTH:
      return new THREE.Matrix4().makeRotationY(Math.PI)
    case Direction.UP:
      return new THREE.Matrix4().makeRotationX(-Math.PI / 2)
    case Direction.DOWN:
      return new THREE.Matrix4().makeRotationX(Math.PI / 2)
  }
}

function getUVGlobalToLocalFromDirection(direction: Direction): THREE.Matrix4 {
  return getUVLocalToGlobalFromDirection(direction).invert()
}

function getDirectionFromName(name: string): Direction {
  return Direction[name.toUpperCase() as keyof typeof Direction]
}

export class Rotation {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  toStringKey(): string {
    return `[${this.x},${this.y}]`
  }

  asMatrix(): THREE.Matrix4 {
    const matrix = new THREE.Matrix4()
    matrix.multiply(new THREE.Matrix4().makeRotationY((-this.y / 180) * Math.PI))
    matrix.multiply(new THREE.Matrix4().makeRotationX((-this.x / 180) * Math.PI))
    return matrix
  }

  findNearestDirection(vector: THREE.Vector3): Direction {
    let nearestDirection = Direction.NORTH
    let nearestDot = -Infinity
    const directions = Object.values(Direction)
    for (const direction of directions) {
      const dot = getVectorFromDirection(direction).dot(vector)
      if (dot > nearestDot) {
        nearestDot = dot
        nearestDirection = direction
      }
    }
    return nearestDirection
  }

  transformDirection(direction: Direction): Direction {
    const matrix = this.asMatrix()
    const vector = getVectorFromDirection(direction)
    vector.applyMatrix4(matrix)
    return this.findNearestDirection(vector)
  }

  isIdentity(): boolean {
    return this.x == 0 && this.y == 0
  }
}

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

const FACE_MIN_Y = 0
const FACE_MAX_Y = 1
const FACE_MIN_Z = 2
const FACE_MAX_Z = 3
const FACE_MIN_X = 4
const FACE_MAX_X = 5

interface BakedModel {
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

interface BakedFace {
  planeGeometry: THREE.PlaneGeometry
  animated: boolean
  tintindex?: number
}

const bakedModelCache: Record<string, BakedModel> = {}

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
    if (Math.abs(elementRotation.angle) == 22.5) {
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

interface AnimatedTextureTickerData {
  texture: AnimatedTexture
  lastFrameNowTime: number
  lastFrameTime: number
  lastFrameIndex: number
  x: number
  y: number
}

export class AnimatedTextureManager {
  private readonly atlasMapping: Record<number, number[] | AnimatedTexture>
  readonly atlas: THREE.Texture
  readonly canvas: HTMLCanvasElement
  readonly atlasMipped: THREE.Texture
  private atlasSource?: THREE.Texture
  private madeIndex: number

  private readonly animatedTextureData: Record<number, AnimatedTextureTickerData>

  constructor(atlasMapping: Record<number, number[] | AnimatedTexture>) {
    this.atlasMapping = atlasMapping
    this.madeIndex = 0
    this.animatedTextureData = []

    this.canvas = document.createElement('canvas')
    this.canvas.width = ANIMATED_TEXTURE_ATLAS_SIZE
    this.canvas.height = ANIMATED_TEXTURE_ATLAS_SIZE
    this.canvas
      .getContext('2d')!
      .clearRect(0, 0, ANIMATED_TEXTURE_ATLAS_SIZE, ANIMATED_TEXTURE_ATLAS_SIZE)

    this.atlas = new THREE.CanvasTexture(this.canvas)
    this.atlas.magFilter = THREE.NearestFilter
    this.atlas.minFilter = THREE.NearestFilter
    this.atlas.wrapS = THREE.RepeatWrapping
    this.atlas.wrapT = THREE.RepeatWrapping
    this.atlas.colorSpace = THREE.SRGBColorSpace
    this.atlas.generateMipmaps = false
    this.atlasMipped = new THREE.CanvasTexture(this.canvas)
    this.atlasMipped.magFilter = THREE.NearestFilter
    this.atlasMipped.minFilter = THREE.NearestMipmapLinearFilter
    this.atlasMipped.wrapS = THREE.RepeatWrapping
    this.atlasMipped.wrapT = THREE.RepeatWrapping
    this.atlasMipped.colorSpace = THREE.SRGBColorSpace
  }

  updateAtlas(atlas: THREE.Texture) {
    this.atlasSource = atlas
    this.animatedTextureTick()
  }

  private animatedTextureTick() {
    const updateData = []
    for (const key in this.animatedTextureData) {
      const animatedTextureData = this.animatedTextureData[key]
      animatedTextureData.lastFrameNowTime++
      if (animatedTextureData.lastFrameNowTime >= animatedTextureData.lastFrameTime) {
        const lastTextureIndex =
          animatedTextureData.texture.frames[animatedTextureData.lastFrameIndex]
        animatedTextureData.lastFrameIndex =
          (animatedTextureData.lastFrameIndex + 1) % animatedTextureData.texture.frames.length
        const nowTextureIndex =
          animatedTextureData.texture.frames[animatedTextureData.lastFrameIndex]
        animatedTextureData.lastFrameNowTime = 0
        animatedTextureData.lastFrameTime =
          animatedTextureData.texture.time[animatedTextureData.lastFrameIndex]
        const textureFromAtlas = this.atlasMapping[nowTextureIndex] as number[]
        if (lastTextureIndex !== nowTextureIndex) {
          updateData.push({
            targetX: animatedTextureData.x,
            targetY: animatedTextureData.y,
            width: 16,
            height: 16,
            sourceX: textureFromAtlas[0],
            sourceY: textureFromAtlas[1],
          })
        }
      } else if (animatedTextureData.texture.interpolate) {
        const delta = 1 - animatedTextureData.lastFrameNowTime / animatedTextureData.lastFrameTime
        const lastTextureIndex =
          animatedTextureData.texture.frames[animatedTextureData.lastFrameIndex]
        const lastTextureFromAtlas = this.atlasMapping[lastTextureIndex] as number[]
        const nextFrameIndex =
          (animatedTextureData.lastFrameIndex + 1) % animatedTextureData.texture.frames.length
        const nextTextureIndex = animatedTextureData.texture.frames[nextFrameIndex]
        const nextTextureFromAtlas = this.atlasMapping[nextTextureIndex] as number[]
        updateData.push({
          targetX: animatedTextureData.x,
          targetY: animatedTextureData.y,
          width: 16,
          height: 16,
          sourceX: lastTextureFromAtlas[0],
          sourceY: lastTextureFromAtlas[1],
          interpolateX: nextTextureFromAtlas[0],
          interpolateY: nextTextureFromAtlas[1],
          interpolateMix: delta,
        })
      }
    }
    if (updateData.length > 0) {
      const context = this.canvas.getContext('2d')!
      for (const update of updateData) {
        context.clearRect(update.targetX, update.targetY, update.width, update.height)
        if (update.interpolateMix) {
          const mix = update.interpolateMix
          context.globalAlpha = mix
          context.drawImage(
            this.atlasSource!.image,
            update.sourceX,
            update.sourceY,
            update.width,
            update.height,
            update.targetX,
            update.targetY,
            update.width,
            update.height,
          )
          context.globalAlpha = 1 - mix
          context.drawImage(
            this.atlasSource!.image,
            update.interpolateX!,
            update.interpolateY!,
            update.width,
            update.height,
            update.targetX,
            update.targetY,
            update.width,
            update.height,
          )
          context.globalAlpha = 1
        } else {
          context.drawImage(
            this.atlasSource!.image,
            update.sourceX,
            update.sourceY,
            update.width,
            update.height,
            update.targetX,
            update.targetY,
            update.width,
            update.height,
          )
        }
      }
      this.atlas.needsUpdate = true
      this.atlasMipped.needsUpdate = true
    }
    setTimeout(() => this.animatedTextureTick(), 1000 / 20)
  }

  putNewTexture(textureId: number, texture: AnimatedTexture): number[] {
    if (textureId in this.animatedTextureData) {
      return [this.animatedTextureData[textureId].x, this.animatedTextureData[textureId].y]
    }
    const x = this.madeIndex % 16
    const y = Math.floor(this.madeIndex / 16)
    this.madeIndex++
    this.animatedTextureData[textureId] = {
      texture,
      lastFrameNowTime: 0,
      lastFrameTime: texture.time[0],
      lastFrameIndex: 0,
      x: x * 16,
      y: y * 16,
    }
    return [x * 16, y * 16]
  }
}

const ATLAS_WIDTH = 1024
const ATLAS_HEIGHT = 512
const ANIMATED_TEXTURE_ATLAS_SIZE = 256

export function getOrBakeModel(
  animatedTextureManager: AnimatedTextureManager,
  models: Record<number, BlockModel>,
  atlasMapping: Record<number, number[] | AnimatedTexture>,
  modelReferenceInt: number,
  rotation: Rotation,
  uvlock: boolean,
): BakedModel {
  const cacheKey = `${modelReferenceInt}:${rotation.toStringKey()}:${uvlock}`
  if (cacheKey in bakedModelCache) {
    return bakedModelCache[cacheKey]
  }

  const model = models[modelReferenceInt]
  const bakedModel = {
    cullfaces: {
      down: [],
      up: [],
      north: [],
      south: [],
      west: [],
      east: [],
    },
    unculledFaces: [],
  } as BakedModel
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
      const cullface = face.cullface
      const faceDirection = getDirectionFromName(faceName)

      let blockFaceUV = new BlockFaceUV(face.uv ?? [0, 0, 16, 16], face.rotation ?? 0)
      if (uvlock) {
        blockFaceUV = recomputeUVs(blockFaceUV, rotation, faceDirection)
      }

      const spriteData = atlasMapping[face.texture]
      let animated = false
      if (spriteData instanceof Array) {
        blockFaceUV.uvs[0] = (spriteData[0] + blockFaceUV.uvs[0]) / ATLAS_WIDTH
        blockFaceUV.uvs[2] = (spriteData[0] + blockFaceUV.uvs[2]) / ATLAS_WIDTH
        blockFaceUV.uvs[1] = 1 - (spriteData[1] + blockFaceUV.uvs[1]) / ATLAS_HEIGHT
        blockFaceUV.uvs[3] = 1 - (spriteData[1] + blockFaceUV.uvs[3]) / ATLAS_HEIGHT
      } else {
        const [x, y] = animatedTextureManager.putNewTexture(face.texture, spriteData)
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

      if (cullface) {
        bakedModel.cullfaces[faceDirection]?.push({
          planeGeometry,
          animated,
          tintindex: face.tintindex,
        })
      } else {
        bakedModel.unculledFaces.push({
          planeGeometry,
          animated,
          tintindex: face.tintindex,
        })
      }
    }
  }

  return (bakedModelCache[cacheKey] = bakedModel)
}

function makeTextureAtlasMaterials(atlasTexture: THREE.Texture[]): Record<string, THREE.Material> {
  const solidRenderingMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture[0],
    fog: false,
  })
  const tripwireMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture[0],
    fog: false,
    transparent: true,
    alphaTest: 0.1,
  })
  const cutoutMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture[1],
    fog: false,
    alphaTest: 0.5,
  })
  const cutoutMippedMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture[0],
    fog: false,
    alphaTest: 0.1,
  })
  const translucentRenderingMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture[0],
    fog: false,
    transparent: true,
  })

  return {
    solid: solidRenderingMaterial,
    cutout: cutoutMaterial,
    cutout_mipped: cutoutMippedMaterial,
    translucent: translucentRenderingMaterial,
    tripwire: tripwireMaterial,
  }
}

export interface OcclusionFaceData {
  down?: number[][]
  up?: number[][]
  north?: number[][]
  south?: number[][]
  west?: number[][]
  east?: number[][]
}

function pointInsideAABB(point: number[], aabb: number[]) {
  return point[0] > aabb[0] && point[0] < aabb[2] && point[1] > aabb[1] && point[1] < aabb[3]
}

function isOcclusion(thisFace: number[][], otherFace: number[][]): boolean {
  if (otherFace.length == 0) return false
  if (thisFace.length == 0) return true
  if (
    thisFace.length == otherFace.length &&
    thisFace.every((val, i) => val.every((v, j) => v == otherFace[i][j]))
  )
    return true
  for (const thisFaceElement of thisFace) {
    let nonOccludedPart = [thisFaceElement]
    for (const otherFaceElement of otherFace) {
      const computedNonOccludedPart = [] as number[][]
      for (const part of nonOccludedPart) {
        if (
          otherFaceElement[0] <= part[0] &&
          otherFaceElement[1] <= part[1] &&
          otherFaceElement[2] >= part[2] &&
          otherFaceElement[3] >= part[3]
        )
          continue
        if (
          part[0] < otherFaceElement[2] &&
          part[2] > otherFaceElement[0] &&
          part[1] < otherFaceElement[3] &&
          part[3] > otherFaceElement[1]
        ) {
          const minMinInside = pointInsideAABB([otherFaceElement[0], otherFaceElement[1]], part)
          const minMaxInside = pointInsideAABB([otherFaceElement[0], otherFaceElement[3]], part)
          const maxMinInside = pointInsideAABB([otherFaceElement[2], otherFaceElement[1]], part)
          const maxMaxInside = pointInsideAABB([otherFaceElement[2], otherFaceElement[3]], part)
          if (minMinInside && minMaxInside && maxMinInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
              [otherFaceElement[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[0], otherFaceElement[3], otherFaceElement[2], part[3]],
            )
          } else if (minMinInside && minMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], part[2], otherFaceElement[1]],
              [part[0], otherFaceElement[1], otherFaceElement[0], otherFaceElement[3]],
              [part[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (minMaxInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], otherFaceElement[3], otherFaceElement[2], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (maxMinInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], part[2], otherFaceElement[1]],
              [otherFaceElement[2], otherFaceElement[1], part[2], otherFaceElement[3]],
              [part[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (maxMinInside && minMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (minMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], part[1], part[2], otherFaceElement[1]],
            )
          } else if (minMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (maxMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], otherFaceElement[3], otherFaceElement[2], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else {
            const minHorizontalInside =
              otherFaceElement[0] > part[0] && otherFaceElement[0] < part[2]
            const maxHorizontalInside =
              otherFaceElement[2] > part[0] && otherFaceElement[2] < part[2]
            const minVerticalInside = otherFaceElement[1] > part[1] && otherFaceElement[1] < part[3]
            const maxVerticalInside = otherFaceElement[3] > part[1] && otherFaceElement[3] < part[3]
            if (minHorizontalInside) {
              computedNonOccludedPart.push([part[0], part[1], otherFaceElement[0], part[3]])
            }
            if (maxHorizontalInside) {
              computedNonOccludedPart.push([otherFaceElement[2], part[1], part[2], part[3]])
            }
            if (minVerticalInside) {
              computedNonOccludedPart.push([part[0], part[1], part[2], otherFaceElement[1]])
            }
            if (maxVerticalInside) {
              computedNonOccludedPart.push([part[0], otherFaceElement[3], part[2], part[3]])
            }
          }
        } else {
          computedNonOccludedPart.push(part)
        }
      }
      nonOccludedPart = computedNonOccludedPart
    }
    if (nonOccludedPart.length > 0) return false
  }
  return true
}

class BlockStructure {
  readonly strctures: string[][][] // yzx
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
    this.strctures = new Array(maxY)
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
          this.strctures[y][z][x] = line[x]
        }
      }
    }
  }

  forEach(callback: (x: number, y: number, z: number, blockKey: string) => void) {
    for (let y = 0; y < this.y; y++) {
      for (let z = 0; z < this.z; z++) {
        for (let x = 0; x < this.x; x++) {
          if (this.strctures[y][z][x] === '-') continue
          callback(x, y, z, this.strctures[y][z][x])
        }
      }
    }
  }

  getBlock(x: number, y: number, z: number): string {
    if (x < 0 || y < 0 || z < 0 || x >= this.x || y >= this.y || z >= this.z) return '-'
    return this.strctures[y][z][x]
  }
}

export function bakeBlockModelRenderLayer(
  scene: THREE.Scene,
  animatedTextureManager: AnimatedTextureManager,
  structure: string,
  nameStateMapping: Record<string, string>,
  modelsMapping: Record<string, ModelReferenceProvider[]>,
  blockModelMapping: Record<number, BlockModel>,
  renderTypesMapping: Record<string, string>,
  atlasMapping: Record<number, number[] | AnimatedTexture>,
  atlasTexture: THREE.Texture[],
  occlusionShapesMapping: Record<string, OcclusionFaceData>,
) {
  const materialMapping = makeTextureAtlasMaterials(atlasTexture)
  const animatedMaterialMapping = makeTextureAtlasMaterials([
    animatedTextureManager.atlasMipped,
    animatedTextureManager.atlas,
  ])
  const blockStructure = new BlockStructure(structure)

  blockStructure.forEach((x, y, z, blockKey) => {
    modelsMapping[blockKey].forEach((provider) => {
      const [modelReference, uvlock, rotX, rotY] = provider.getModel(x, y, z)
      const rotation = new Rotation(rotX ?? 0, rotY ?? 0)
      const baked = getOrBakeModel(
        animatedTextureManager,
        blockModelMapping,
        atlasMapping,
        modelReference,
        rotation,
        uvlock ?? false,
      )

      baked.unculledFaces.forEach((face) => {
        const materialChoose = (face.animated ? animatedMaterialMapping : materialMapping)[
          renderTypesMapping[nameStateMapping[blockKey]] ?? 'solid'
        ]
        const geometry = face.planeGeometry.clone().translate(x, y, z)
        const mesh = new THREE.Mesh(geometry, materialChoose)
        scene.add(mesh)
      })

      occlusionShapesMapping['-'] = {}
      Object.entries(baked.cullfaces).forEach(([direction, value]) => {
        const directionFace = rotation.transformDirection(getDirectionFromName(direction))
        const oppositeFace = oppositeDirection(directionFace)
        const occlusionThis = (occlusionShapesMapping[blockKey] ?? {})[directionFace] ?? []
        const otherBlock = blockStructure.getBlock(...moveTowardsDirection(x, y, z, directionFace))
        const occlusionOther = (occlusionShapesMapping[otherBlock] ?? {})[oppositeFace] ?? []
        if (isOcclusion(occlusionThis, occlusionOther)) return

        value.forEach((face) => {
          const materialChoose = (face.animated ? animatedMaterialMapping : materialMapping)[
            renderTypesMapping[nameStateMapping[blockKey]] ?? 'solid'
          ]
          const geometry = face.planeGeometry.clone().translate(x, y, z)
          const mesh = new THREE.Mesh(geometry, materialChoose)
          scene.add(mesh)
        })
      })
    })
  })
  return [blockStructure.x, blockStructure.y, blockStructure.z]
}
