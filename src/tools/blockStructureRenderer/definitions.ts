// Block Model Structure ---------------------------------------------------------------------------

export interface BlockModel {
  elements?: ModelElement[]
}

export interface ModelElement {
  from: number[]
  to: number[]
  rotation?: ModelRotation
  shade?: boolean
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

// Block State Structure ---------------------------------------------------------------------------

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

// Block Texture Structure -------------------------------------------------------------------------

export interface AnimatedTexture {
  frames: number[]
  time: number[]
  interpolate?: boolean
}

// API Schema --------------------------------------------------------------------------------------

export interface BlockStateDefinition {
  name: string
  properties?: Record<string, string>
}

export interface StateData {
  state: BlockStateDefinition
  parts: (ModelReference | ModelReferenceWithWeight[])[]
  render_type: string
  face_sturdy: string[]
  blocks_motion: boolean
  occlusion: boolean
  occlusion_shape: Record<string, number[][]>
  special_textures: number[]
}

export const EMPTY_STATE_DATA: StateData = {
  state: { name: 'air' },
  parts: [],
  render_type: 'solid',
  face_sturdy: [],
  blocks_motion: false,
  occlusion: false,
  occlusion_shape: {},
  special_textures: [],
}

export interface BSRApiResponse {
  states: StateData[]
  models: Record<string, BlockModel>
  textures: Record<string, AnimatedTexture | number[]>
}
