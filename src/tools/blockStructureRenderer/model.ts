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
    matrix.makeRotationY(-this.y / 180 * Math.PI)
    matrix.multiply(new THREE.Matrix4().makeRotationX(-this.x / 180 * Math.PI))
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
  const vector1 = new THREE.Vector3(u1, v1, 0)
  vector1.applyMatrix4(makeTransform)
  const u2 = blockUV.uvs[2] / 16
  const v2 = blockUV.uvs[3] / 16
  const vector2 = new THREE.Vector3(u2, v2, 0)
  vector2.applyMatrix4(makeTransform)

  const transformedU1 = vector1.x * 16
  const transformedV1 = vector1.y * 16
  const transformedU2 = vector2.x * 16
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
  const matrix3f = new THREE.Matrix3().setFromMatrix4(makeTransform)
  const rotationVector = new THREE.Vector3(
    Math.cos(sourceRotation),
    Math.sin(sourceRotation),
    0,
  ).applyMatrix3(matrix3f)
  const rotationAngle =
    (-Math.round((Math.atan2(rotationVector.y, rotationVector.x) * 2) / Math.PI) * 90) % 360
  return new BlockFaceUV([correctU1, correctV1, correctU2, correctV2], rotationAngle)
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

export function getOrBakeModel(
  models: Record<number, BlockModel>,
  atlasMapping: Record<number, number[]>,
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
      blockFaceUV.uvs[0] = (spriteData[0] + blockFaceUV.uvs[0]) / 512
      blockFaceUV.uvs[2] = (spriteData[0] + blockFaceUV.uvs[2]) / 512
      blockFaceUV.uvs[1] = 1 - (spriteData[1] + blockFaceUV.uvs[1]) / 512
      blockFaceUV.uvs[3] = 1 - (spriteData[1] + blockFaceUV.uvs[3]) / 512

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
          [
            blockFaceUV.uvs[0],
            blockFaceUV.uvs[1],
            blockFaceUV.uvs[2],
            blockFaceUV.uvs[1],
            blockFaceUV.uvs[0],
            blockFaceUV.uvs[3],
            blockFaceUV.uvs[2],
            blockFaceUV.uvs[3],
          ],
          2,
        ),
      )

      if (cullface) {
        bakedModel.cullfaces[faceDirection]?.push({
          planeGeometry,
          tintindex: face.tintindex,
        })
      } else {
        bakedModel.unculledFaces.push({
          planeGeometry,
          tintindex: face.tintindex,
        })
      }
    }
  }

  return (bakedModelCache[cacheKey] = bakedModel)
}
