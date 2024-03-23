<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useI18n } from '@/utils/i18n.ts'
import locales from '@/tools/blockStructureRenderer/locales.ts'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { CdxCheckbox } from '@wikimedia/codex'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  type AnimatedTexture,
  AnimatedTextureManager,
  bakeBlockModelRenderLayer,
  type BlockModel,
  type BlockState,
  chooseModel,
  type ModelReferenceProvider,
} from '@/tools/blockStructureRenderer/model.ts'

const props = defineProps<{
  blocks: string[]
  structure: string
  blockStates: string[]
  models: string[]
  textureAtlas: string[]
  renderTypes: string[]
}>()
const { t } = useI18n(__TOOL_NAME__, locales)
const renderTarget = ref()

const orthographic = ref(false)
const loading = ref(true)

// Three.js setup
const webGLAvailable = WebGL.isWebGLAvailable()
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
const perspectiveCamera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000)
const camera = computed(() => (orthographic.value ? orthographicCamera : perspectiveCamera))

const orthographicCameraControls = new OrbitControls(orthographicCamera, renderer.domElement)
orthographicCameraControls.addEventListener('change', () =>
  renderer.render(scene, orthographicCamera),
)
orthographicCameraControls.enablePan = false
orthographicCameraControls.update()
const perspectiveCameraControls = new OrbitControls(perspectiveCamera, renderer.domElement)
perspectiveCameraControls.addEventListener('change', () =>
  renderer.render(scene, perspectiveCamera),
)
perspectiveCameraControls.enablePan = false
perspectiveCameraControls.update()
const controls = computed(() =>
  orthographic.value ? orthographicCameraControls : perspectiveCameraControls,
)

if (webGLAvailable) {
  setupBlockStructure()
}

function setupTextureAtlas(atlasMapping: Record<number, number[] | AnimatedTexture>): [THREE.Texture[], AnimatedTextureManager] {
  const refNoMipped = ref()
  const animatedTextureManager = new AnimatedTextureManager(atlasMapping)
  const textureAtlasMipped = new THREE.TextureLoader().load(
    '/images/Block_structure_rendering_atlas.png?format=original',
    () => {
      loading.value = false
      refNoMipped.value.needsUpdate = true
      animatedTextureManager.updateAtlas(textureAtlasMipped)
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
  return [[textureAtlasMipped, textureAtlas], animatedTextureManager]
}

function setupMappings(): [
  Record<string, string>,
  Record<string, string>,
  Record<string, ModelReferenceProvider[]>,
  Record<number, BlockModel>,
  Record<number, number[] | AnimatedTexture>,
  Record<string, string>,
] {
  const blockStatesMapping = {} as Record<string, BlockState>
  props.blockStates.forEach((blockStatePair) => {
    const splitPoint = blockStatePair.indexOf('=')
    const blockStateName = blockStatePair.substring(0, splitPoint)
    const blockStateData = blockStatePair.substring(splitPoint + 1)
    blockStatesMapping[blockStateName] = JSON.parse(blockStateData) as BlockState
  })

  const nameStateMapping = {} as Record<string, string>
  const nameBlockMapping = {} as Record<string, string>
  const modelsMapping = {} as Record<string, ModelReferenceProvider[]>
  props.blocks.forEach((blockPair) => {
    const splitPoint = blockPair.indexOf('=')
    const blockName = blockPair.substring(0, splitPoint)
    const blockStateKey = blockPair.substring(splitPoint + 1)
    nameStateMapping[blockName] = blockStateKey
    nameBlockMapping[blockName] = blockStateKey.includes('[')
      ? blockStateKey.substring(0, blockStateKey.indexOf('['))
      : blockStateKey
    modelsMapping[blockName] = chooseModel(blockStateKey, blockStatesMapping)
  })

  const blockModelMapping = {} as Record<number, BlockModel>
  props.models.forEach((modelPair) => {
    const [modelId, modelData] = modelPair.split('=', 2)
    blockModelMapping[parseInt(modelId, 10)] = JSON.parse(modelData) as BlockModel
  })

  const atlasMapping = {} as Record<number, number[]>
  props.textureAtlas.forEach((atlasPair) => {
    const [spriteName, atlasData] = atlasPair.split('=', 2)
    atlasMapping[parseInt(spriteName, 10)] = JSON.parse(atlasData) as number[]
  })

  const renderTypesMapping = {} as Record<string, string>
  props.renderTypes.forEach((renderTypePair) => {
    const splitPoint = renderTypePair.indexOf('=')
    const renderTypeName = renderTypePair.substring(0, splitPoint)
    renderTypesMapping[renderTypeName] = renderTypePair.substring(splitPoint + 1)
  })

  return [
    nameStateMapping,
    nameBlockMapping,
    modelsMapping,
    blockModelMapping,
    atlasMapping,
    renderTypesMapping,
  ]
}

function setupBlockStructure() {
  // Mappings loading
  const [, nameBlockMapping, modelsMapping, blockModelMapping, atlasMapping, renderTypesMapping] =
    setupMappings()

  const [textureAtlas, animatedTextureManager] = setupTextureAtlas(atlasMapping)
  const [maxX, maxY, maxZ] = bakeBlockModelRenderLayer(
    scene,
    animatedTextureManager,
    props.structure,
    nameBlockMapping,
    modelsMapping,
    blockModelMapping,
    renderTypesMapping,
    atlasMapping,
    textureAtlas,
  )

  orthographicCameraControls.target.set(maxX / 2, maxY / 2, maxZ / 2)
  perspectiveCameraControls.target.set(maxX / 2, maxY / 2, maxZ / 2)
  orthographicCamera.position.set(maxX / 2, maxY * 1.5, maxZ * 1.5)
  perspectiveCamera.position.set(maxX / 2, maxY * 1.5, maxZ * 1.5)
  orthographicCameraControls.update()
  perspectiveCameraControls.update()
}

function animate() {
  requestAnimationFrame(animate)
  controls.value.update()
  renderer.render(scene, camera.value)
}

function updateDisplay() {
  const nowSize = renderTarget.value.getBoundingClientRect()
  if (camera.value instanceof THREE.PerspectiveCamera) {
    camera.value.aspect = nowSize.width / nowSize.height
  } else {
    const aspect = nowSize.width / nowSize.height
    camera.value.left = -aspect * 2
    camera.value.right = aspect * 2
    camera.value.top = 2
    camera.value.bottom = -2
  }
  camera.value.updateProjectionMatrix()
  renderer.setSize(nowSize.width, nowSize.height)
  controls.value.update()
}

onMounted(() => {
  if (webGLAvailable) {
    updateDisplay()
    renderTarget.value.appendChild(renderer.domElement)
    new ResizeObserver(updateDisplay).observe(renderTarget.value)
    animate()
  } else {
    renderTarget.value.appendChild(WebGL.getWebGLErrorMessage())
  }
})

onUpdated(() => {
  if (webGLAvailable) {
    updateDisplay()
  }
})
</script>

<template>
  <div ref="renderTarget" style="height: 400px; width: 60%; margin-bottom: 0.5rem" />
  <cdx-checkbox v-model="orthographic">
    {{ t('blockStructureRenderer.orthographic') }}
  </cdx-checkbox>
</template>
