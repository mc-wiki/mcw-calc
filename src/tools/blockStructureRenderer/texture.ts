import * as THREE from 'three'
import type { AnimatedTexture } from '@/tools/blockStructureRenderer/definitions.ts'
import { ref } from 'vue'

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

    const context = this.canvas.getContext('2d')!
    context.clearRect(0, 0, ANIMATED_TEXTURE_ATLAS_SIZE, ANIMATED_TEXTURE_ATLAS_SIZE)
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

export const ATLAS_WIDTH = 1024
export const ATLAS_HEIGHT = 512
export const ANIMATED_TEXTURE_ATLAS_SIZE = 256

export function makeTextureAtlasMaterials(
  atlasTexture: THREE.Texture[],
): Record<string, THREE.MeshBasicMaterial> {
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

export function makeMaterialPicker(
  textureAtlas: string[],
  renderTypes: string[],
  loadedCallback: () => void,
): MaterialPicker {
  const atlasMapping = {} as Record<number, number[]>
  textureAtlas.forEach((atlasPair) => {
    const [spriteName, atlasData] = atlasPair.split('=', 2)
    atlasMapping[parseInt(spriteName, 10)] = JSON.parse(atlasData) as number[]
  })

  const renderTypesMapping = {} as Record<string, string>
  renderTypes.forEach((renderTypePair) => {
    const splitPoint = renderTypePair.indexOf('=')
    const renderTypeName = renderTypePair.substring(0, splitPoint)
    renderTypesMapping[renderTypeName] = renderTypePair.substring(splitPoint + 1)
  })

  return new MaterialPicker(atlasMapping, renderTypesMapping, loadedCallback)
}

export class MaterialPicker {
  readonly staticTexture: Record<string, THREE.MeshBasicMaterial>
  readonly animatedTexture: Record<string, THREE.MeshBasicMaterial>
  readonly animatedTextureManager: AnimatedTextureManager

  readonly atlasMapping: Record<number, number[] | AnimatedTexture>
  readonly renderTypeMapping: Record<string, string>

  constructor(
    atlasMapping: Record<number, number[] | AnimatedTexture>,
    renderTypeMapping: Record<string, string>,
    loadedCallback: () => void,
  ) {
    this.atlasMapping = atlasMapping
    this.renderTypeMapping = renderTypeMapping
    this.animatedTextureManager = new AnimatedTextureManager(atlasMapping)

    const refNoMipped = ref()
    const textureAtlasMipped = new THREE.TextureLoader().load(
      '/images/Block_structure_rendering_atlas.png?format=original',
      () => {
        refNoMipped.value.needsUpdate = true
        this.animatedTextureManager.updateAtlas(textureAtlasMipped)
        loadedCallback()
      },
    )
    textureAtlasMipped.magFilter = THREE.NearestFilter
    textureAtlasMipped.minFilter = THREE.NearestMipmapLinearFilter
    textureAtlasMipped.wrapS = THREE.RepeatWrapping
    textureAtlasMipped.wrapT = THREE.RepeatWrapping
    textureAtlasMipped.colorSpace = THREE.SRGBColorSpace
    const textureAtlas = textureAtlasMipped.clone()
    refNoMipped.value = textureAtlas
    textureAtlas.generateMipmaps = false
    textureAtlas.minFilter = THREE.NearestFilter

    this.staticTexture = makeTextureAtlasMaterials([textureAtlasMipped, textureAtlas])
    this.animatedTexture = makeTextureAtlasMaterials([
      this.animatedTextureManager.atlasMipped,
      this.animatedTextureManager.atlas,
    ])
  }

  pickMaterial(animated: boolean, blockState: string) {
    const renderType = this.renderTypeMapping[blockState] ?? 'solid'
    return animated ? this.animatedTexture[renderType] : this.staticTexture[renderType]
  }
}
