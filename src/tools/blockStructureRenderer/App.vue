<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useI18n } from '@/utils/i18n.ts'
import locales from '@/tools/blockStructureRenderer/locales.ts'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { CdxCheckbox } from '@wikimedia/codex'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  type ModelReferenceProvider,
  type BlockState,
  type BlockModel,
  chooseModel,
  getOrBakeModel,
  Rotation
} from '@/tools/blockStructureRenderer/model.ts'

const props = defineProps<{
  blocks: string[]
  structure: string
  blockStates: string[]
  models: string[]
  textureAtlas: string[]
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

function setupTextureAtlas() {
  const textureAtlas = new THREE.TextureLoader().load(
    '/images/Block_structure_rendering_atlas.png?format=original',
    () => (loading.value = false),
  )
  textureAtlas.magFilter = THREE.NearestFilter
  textureAtlas.minFilter = THREE.NearestMipmapLinearFilter
  textureAtlas.wrapS = THREE.RepeatWrapping
  textureAtlas.wrapT = THREE.RepeatWrapping
  textureAtlas.colorSpace = THREE.SRGBColorSpace
  return textureAtlas
}

function setupBlockStructure() {
  // Mappings loading
  const blockStatesMapping = {} as Record<string, BlockState>
  props.blockStates.forEach((blockStatePair) => {
    const splitPoint = blockStatePair.indexOf('=')
    const blockStateName = blockStatePair.substring(0, splitPoint)
    const blockStateData = blockStatePair.substring(splitPoint + 1)
    blockStatesMapping[blockStateName] = JSON.parse(blockStateData) as BlockState
  })

  const modelsMapping = {} as Record<string, ModelReferenceProvider[]>
  props.blocks.forEach((blockPair) => {
    const splitPoint = blockPair.indexOf('=')
    const blockName = blockPair.substring(0, splitPoint)
    const blockStateKey = blockPair.substring(splitPoint + 1)
    modelsMapping[blockName] = chooseModel(blockStateKey, blockStatesMapping)
  })

  const blockModelMapping = {} as Record<number, BlockModel>
  props.models.forEach((modelPair) => {
    const [modelId, modelData] = modelPair.split('=', 2)
    blockModelMapping[parseInt(modelId, 10)] = JSON.parse(modelData) as BlockModel
  })

  const altasMapping = {} as Record<number, number[]>
  props.textureAtlas.forEach((atlasPair) => {
    const [spriteName, atlasData] = atlasPair.split('=', 2)
    altasMapping[parseInt(spriteName, 10)] = JSON.parse(atlasData) as number[]
  })

  // Material
  const textureAtlas = setupTextureAtlas()
  const solidRenderingMaterial = new THREE.MeshBasicMaterial({
    map: textureAtlas,
    fog: false,
  })
  const alphaRenderingMaterial = new THREE.MeshBasicMaterial({
    map: textureAtlas,
    fog: false,
    alphaTest: 0.1,
  })
  const transparentRenderingMaterial = new THREE.MeshBasicMaterial({
    map: textureAtlas,
    fog: false,
    transparent: true,
    alphaTest: 0.1,
  })

  const splitHeightLines = props.structure.split(';')
  let maxX = 0,
    maxZ = 0
  const maxY = splitHeightLines.length
  for (let y = 0; y < splitHeightLines.length; y++) {
    const splitLines = splitHeightLines[y].split(',')
    if (splitLines.length > maxZ) maxZ = splitLines.length
    for (let z = 0; z < splitLines.length; z++) {
      const line = splitLines[z]
      if (line.length > maxX) maxX = line.length
      for (let x = 0; x < line.length; x++) {
        const blockKey = line[x]
        if (blockKey === '-') continue
        modelsMapping[blockKey].forEach((provider) => {
          const [modelReference, uvlock, rotX, rotY] = provider.getModel(x, y, z)
          const baked = getOrBakeModel(
            blockModelMapping,
            altasMapping,
            modelReference,
            new Rotation(rotX ?? 0, rotY ?? 0),
            uvlock ?? false,
          )
          Object.entries(baked.cullfaces).forEach(([, value]) => {
            value.forEach((face) => {
              const geometry = face.planeGeometry.clone().translate(x, y, z)
              const mesh = new THREE.Mesh(geometry, alphaRenderingMaterial)
              scene.add(mesh)
            })
          })
          baked.unculledFaces.forEach((face) => {
            const geometry = face.planeGeometry.clone().translate(x, y, z)
            const mesh = new THREE.Mesh(geometry, alphaRenderingMaterial)
            scene.add(mesh)
          })
        })
      }
    }
  }

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
