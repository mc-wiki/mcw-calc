import type { AnimatedTexture } from '@/tools/blockStructureRenderer/definitions.ts'
import type { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import * as THREE from 'three'
import { ref } from 'vue'

export const ATLAS_WIDTH = 1024
export const ATLAS_HEIGHT = 1024
export const ANIMATED_TEXTURE_ATLAS_SIZE = 256
export const TEXTURE_ATLAS_LOCATION =
  'https://zh.minecraft.wiki/images/Block_structure_rendering_atlas.png?format=original'

interface AnimatedTextureTickerData {
  texture: AnimatedTexture
  lastFrameNowTime: number
  lastFrameTime: number
  lastFrameIndex: number
  x: number
  y: number
  width: number
  height: number
}

class TextureAtlasNode {
  private left?: TextureAtlasNode
  private right?: TextureAtlasNode
  private occupied: boolean = false

  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  // prettier-ignore
  insert(spriteData: number[]): TextureAtlasNode | null {
    if (this.left && this.right) {
      return this.left.insert(spriteData) || this.right.insert(spriteData)
    }
    if (this.occupied)
      return null
    const spriteDataWidth = spriteData[0]
    const spriteDataHeight = spriteData[1]
    if (this.width < spriteDataWidth || this.height < spriteDataHeight)
      return null
    if (this.width === spriteDataWidth && this.height === spriteDataHeight) {
      this.occupied = true
      return this
    }
    const dw = this.width - spriteDataWidth
    const dh = this.height - spriteDataHeight
    if (dw > dh) {
      this.left = new TextureAtlasNode(this.x, this.y, spriteDataWidth, this.height)
      this.right = new TextureAtlasNode(this.x + spriteDataWidth + 1, this.y, dw - 1, this.height)
    } else {
      this.left = new TextureAtlasNode(this.x, this.y, this.width, spriteDataHeight)
      this.right = new TextureAtlasNode(this.x, this.y + spriteDataHeight + 1, this.width, dh - 1)
    }
    return this.left.insert(spriteData)
  }
}

export class AnimatedTextureManager {
  private readonly modelManager: BlockStateModelManager
  readonly atlas: THREE.Texture
  readonly canvas: HTMLCanvasElement
  readonly atlasMipped: THREE.Texture
  private atlasSource?: THREE.Texture
  private readonly rootNode: TextureAtlasNode
  private readonly isAnimating: () => boolean

  private readonly animatedTextureData: Record<number, AnimatedTextureTickerData>

  constructor(modelManager: BlockStateModelManager, animateOption: () => boolean) {
    this.modelManager = modelManager
    this.isAnimating = animateOption
    this.animatedTextureData = []
    this.rootNode = new TextureAtlasNode(
      0,
      0,
      ANIMATED_TEXTURE_ATLAS_SIZE,
      ANIMATED_TEXTURE_ATLAS_SIZE,
    )

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

  async updateAtlas(atlas: THREE.Texture) {
    this.atlasSource = atlas

    const context = this.canvas.getContext('2d')!
    for (const key in this.animatedTextureData) {
      const animatedTextureData = this.animatedTextureData[key]
      const firstFrame = (await this.modelManager.blockDataStorage.getTextureByReference(
        animatedTextureData.texture.frames[0],
      )) as number[]
      context.drawImage(
        this.atlasSource!.image,
        firstFrame[0],
        firstFrame[1],
        animatedTextureData.width,
        animatedTextureData.height,
        animatedTextureData.x,
        animatedTextureData.y,
        animatedTextureData.width,
        animatedTextureData.height,
      )
    }

    setTimeout(() => this.animatedTextureTick(), 1000 / 20)
  }

  private async animatedTextureTick() {
    if (this.isAnimating()) {
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
          const textureFromAtlas = (await this.modelManager.blockDataStorage.getTextureByReference(
            nowTextureIndex,
          )) as number[]
          if (lastTextureIndex !== nowTextureIndex) {
            updateData.push({
              targetX: animatedTextureData.x,
              targetY: animatedTextureData.y,
              width: animatedTextureData.width,
              height: animatedTextureData.height,
              sourceX: textureFromAtlas[0],
              sourceY: textureFromAtlas[1],
            })
          }
        } else if (animatedTextureData.texture.interpolate) {
          const delta = 1 - animatedTextureData.lastFrameNowTime / animatedTextureData.lastFrameTime
          const lastTextureIndex =
            animatedTextureData.texture.frames[animatedTextureData.lastFrameIndex]
          const lastTextureFromAtlas =
            (await this.modelManager.blockDataStorage.getTextureByReference(
              lastTextureIndex,
            )) as number[]
          const nextFrameIndex =
            (animatedTextureData.lastFrameIndex + 1) % animatedTextureData.texture.frames.length
          const nextTextureIndex = animatedTextureData.texture.frames[nextFrameIndex]
          const nextTextureFromAtlas =
            (await this.modelManager.blockDataStorage.getTextureByReference(
              nextTextureIndex,
            )) as number[]
          updateData.push({
            targetX: animatedTextureData.x,
            targetY: animatedTextureData.y,
            width: animatedTextureData.width,
            height: animatedTextureData.height,
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
    }
    setTimeout(() => this.animatedTextureTick(), 1000 / 20)
  }

  putNewTexture(textureId: number, texture: AnimatedTexture, textureSize: number[]): number[] {
    if (textureId in this.animatedTextureData) {
      return [
        this.animatedTextureData[textureId].x,
        this.animatedTextureData[textureId].y,
        this.animatedTextureData[textureId].width,
        this.animatedTextureData[textureId].height,
      ]
    }
    const insertNode = this.rootNode.insert(textureSize)
    if (!insertNode) {
      return [0, 0, ...textureSize]
    }
    this.animatedTextureData[textureId] = {
      texture,
      lastFrameNowTime: 0,
      lastFrameTime: texture.time[0],
      lastFrameIndex: 0,
      x: insertNode.x,
      y: insertNode.y,
      width: textureSize[0],
      height: textureSize[1],
    }
    return [insertNode.x, insertNode.y, ...textureSize]
  }
}

export class SpriteData {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number

  readonly atlasWidth: number
  readonly atlasHeight: number

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    atlasWidth: number,
    atlasHeight: number,
  ) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.atlasWidth = atlasWidth
    this.atlasHeight = atlasHeight
  }

  getU(u: number) {
    return (u * this.width + this.x) / this.atlasWidth
  }

  getV(v: number) {
    return 1 - (v * this.height + this.y) / this.atlasHeight
  }
}

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
  const translucentMaterial = new THREE.MeshBasicMaterial({
    map: atlasTexture[0],
    fog: false,
    transparent: true,
  })

  return {
    solid: solidRenderingMaterial,
    cutout: cutoutMaterial,
    cutout_mipped: cutoutMippedMaterial,
    translucent: translucentMaterial,
    tripwire: tripwireMaterial,
  }
}

export class MaterialPicker {
  readonly staticTexture: Record<string, THREE.MeshBasicMaterial>
  readonly animatedTexture: Record<string, THREE.MeshBasicMaterial>
  readonly modelManager: BlockStateModelManager
  readonly animatedTextureManager: AnimatedTextureManager

  constructor(
    modelManager: BlockStateModelManager,
    loadedCallback: () => void,
    animateOption: () => boolean,
  ) {
    this.modelManager = modelManager
    this.animatedTextureManager = new AnimatedTextureManager(modelManager, animateOption)

    const refNoMipped = ref()
    const textureAtlasMipped = new THREE.TextureLoader().load(TEXTURE_ATLAS_LOCATION, () => {
      refNoMipped.value.needsUpdate = true
      this.animatedTextureManager.updateAtlas(textureAtlasMipped).then(loadedCallback)
    })
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

  async getTextureByReference(reference: number) {
    return (
      (await this.modelManager.blockDataStorage.getTextureByReference(reference)) ?? [0, 0, 16, 16]
    )
  }

  async pickMaterial(animated: boolean, blockState: string) {
    const renderType = await this.modelManager.getBlockRenderType(blockState)
    return animated ? this.animatedTexture[renderType] : this.staticTexture[renderType]
  }

  pickMaterialWithRenderType(
    renderType: string,
  ): (animated: boolean) => Promise<THREE.MeshBasicMaterial> {
    return async (animated: boolean) =>
      animated ? this.animatedTexture[renderType] : this.staticTexture[renderType]
  }
}
