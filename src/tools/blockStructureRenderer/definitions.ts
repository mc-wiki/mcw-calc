// Block Model Structure ---------------------------------------------------------------------------

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

// Block State Structure ---------------------------------------------------------------------------

export interface ModelRotation {
  origin: number[]
  axis: 'x' | 'y' | 'z'
  angle: number
  rescale?: boolean
}

export interface BlockStateModelCollection {
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

// Block Texture Structure -------------------------------------------------------------------------

export interface AnimatedTexture {
  frames: number[]
  time: number[]
  interpolate?: boolean
}

// Occlusion Face Structure ------------------------------------------------------------------------

export interface OcclusionFaceData {
  down?: number[][]
  up?: number[][]
  north?: number[][]
  south?: number[][]
  west?: number[][]
  east?: number[][]
  can_occlude: boolean
}
