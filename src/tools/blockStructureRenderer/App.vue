<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useI18n } from '@/utils/i18n.ts'
import locales from '@/tools/blockStructureRenderer/locales.ts'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { CdxCheckbox } from '@wikimedia/codex'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import {
  bakeBlockModelRenderLayer,
  BlockStructure,
  NameMapping,
} from '@/tools/blockStructureRenderer/renderer.ts'
import { makeMaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'

const props = defineProps<{
  blocks: string[]
  structure: string
  blockStates: string[]
  models: string[]
  textureAtlas: string[]
  renderTypes: string[]
  occlusionShapes: string[]
}>()
const { t } = useI18n(__TOOL_NAME__, locales)
const renderTarget = ref()

const orthographic = ref(false)
const loading = ref(true)

// Three.js setup
const rendererAvailable = WebGL.isWebGLAvailable()
const renderer = new THREE.WebGLRenderer()
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

if (rendererAvailable) {
  const blockStructure = new BlockStructure(props.structure)
  const nameMapping = new NameMapping(props.blocks)
  const modelManager = new BlockStateModelManager(
    props.blockStates,
    props.models,
    props.occlusionShapes,
    nameMapping,
  )
  const materialPicker = makeMaterialPicker(props.textureAtlas, props.renderTypes, () => {
    loading.value = false
    bakeBlockModelRenderLayer(scene, materialPicker, blockStructure, nameMapping, modelManager)
  })

  const [maxX, maxY, maxZ] = [blockStructure.x, blockStructure.y, blockStructure.z]
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
  if (rendererAvailable) {
    updateDisplay()
    renderTarget.value.appendChild(renderer.domElement)
    new ResizeObserver(updateDisplay).observe(renderTarget.value)
    animate()
  } else {
    renderTarget.value.appendChild(WebGL.getWebGLErrorMessage())
  }
})

onUpdated(() => {
  if (rendererAvailable) {
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
