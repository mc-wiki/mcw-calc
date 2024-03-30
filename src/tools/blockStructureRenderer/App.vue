<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useI18n } from '@/utils/i18n.ts'
import locales from '@/tools/blockStructureRenderer/locales.ts'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { CdxCheckbox, CdxTextInput, CdxSelect, CdxButton } from '@wikimedia/codex'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import {
  bakeBlockModelRenderLayer,
  bakeFluidRenderLayer,
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
  specialBlocksData: string[]
  liquidComputationData: string[]
}>()
const { t } = useI18n(__TOOL_NAME__, locales)
const renderTarget = ref()
const loaded = ref(false)

const orthographic = ref(false)
const animatedTexture = ref(true)

const displayModeStr = [
  t('blockStructureRenderer.displayModes.all'),
  t('blockStructureRenderer.displayModes.yRange'),
  t('blockStructureRenderer.displayModes.selectedY'),
]
const displayModes = displayModeStr.map((str) => ({
  value: str,
}))
const displayMode = ref(displayModeStr[0])
const ySelected = ref(0)
const yRangeMin = ref(0)
const yRangeMax = ref(0)

const cameraSettingModeStr = [
  t('blockStructureRenderer.cameraSetting.drag'),
  t('blockStructureRenderer.cameraSetting.manual'),
]
const cameraSettingModes = cameraSettingModeStr.map((str) => ({
  value: str,
}))
const cameraSettingMode = ref(cameraSettingModeStr[0])
const cameraX = ref(0)
const cameraY = ref(0)
const cameraZ = ref(0)
const cameraTargetX = ref(0)
const cameraTargetY = ref(0)
const cameraTargetZ = ref(0)

// Three.js setup
const rendererAvailable = WebGL.isWebGLAvailable()
const renderer = new THREE.WebGLRenderer({
  preserveDrawingBuffer: true,
}) // Do not enable antialiasing: it makes block edges black
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
orthographicCameraControls.update()
const perspectiveCameraControls = new OrbitControls(perspectiveCamera, renderer.domElement)
perspectiveCameraControls.addEventListener('change', () =>
  renderer.render(scene, perspectiveCamera),
)
perspectiveCameraControls.update()
const controls = computed(() =>
  orthographic.value ? orthographicCameraControls : perspectiveCameraControls,
)

const blockStructure = new BlockStructure(props.structure)
const nameMapping = new NameMapping(props.blocks)
const modelManager = new BlockStateModelManager(
  props.blockStates,
  props.models,
  props.occlusionShapes,
  props.liquidComputationData,
  props.specialBlocksData,
  nameMapping,
)
const materialPicker = makeMaterialPicker(
  props.textureAtlas,
  props.renderTypes,
  () => {
    loaded.value = true
    bakeFluidRenderLayer(scene, materialPicker, blockStructure, nameMapping, modelManager)
    bakeBlockModelRenderLayer(scene, materialPicker, blockStructure, nameMapping, modelManager)
  },
  () => animatedTexture.value,
)

if (rendererAvailable) {
  const [maxX, maxY, maxZ] = [blockStructure.x, blockStructure.y, blockStructure.z]
  yRangeMax.value = maxY - 1
  orthographicCameraControls.target.set(maxX / 2, maxY / 2, maxZ / 2)
  perspectiveCameraControls.target.set(maxX / 2, maxY / 2, maxZ / 2)
  orthographicCamera.position.set(maxX / 2, maxY * 1.5, maxZ * 1.5)
  perspectiveCamera.position.set(maxX / 2, maxY * 1.5, maxZ * 1.5)
  orthographicCameraControls.update()
  orthographicCameraControls.saveState()
  perspectiveCameraControls.update()
  perspectiveCameraControls.saveState()
}

function reBakeRenderLayers() {
  scene.clear()
  bakeFluidRenderLayer(scene, materialPicker, blockStructure, nameMapping, modelManager)
  bakeBlockModelRenderLayer(scene, materialPicker, blockStructure, nameMapping, modelManager)
}

function onDisplayModeChanged() {
  const mode = displayModeStr.findIndex((str) => str === displayMode.value)
  if (mode === 1) {
    if ((!yRangeMin.value && yRangeMin.value !== 0) || (!yRangeMax.value && yRangeMax.value !== 0))
      return
    if (yRangeMax.value > blockStructure.y - 1) return
    if (yRangeMin.value < 0) return
    if (yRangeMin.value > yRangeMax.value) return
    blockStructure.yRange = [yRangeMin.value, yRangeMax.value + 1]
  } else if (mode === 2) {
    if (!ySelected.value && ySelected.value !== 0) return
    if (ySelected.value < 0) return
    if (ySelected.value > blockStructure.y - 1) return
    blockStructure.yRange = [ySelected.value, ySelected.value + 1]
  } else {
    blockStructure.yRange = undefined
  }
  reBakeRenderLayers()
}

function onCameraSettingModeChanged() {
  const mode = cameraSettingModeStr.findIndex((str) => str === cameraSettingMode.value)
  if (mode === 0) {
    orthographicCameraControls.enabled = true
    perspectiveCameraControls.enabled = true
  } else {
    orthographicCameraControls.enabled = false
    perspectiveCameraControls.enabled = false
  }
  cameraX.value = camera.value.position.x
  cameraY.value = camera.value.position.y
  cameraZ.value = camera.value.position.z
  cameraTargetX.value = controls.value.target.x
  cameraTargetY.value = controls.value.target.y
  cameraTargetZ.value = controls.value.target.z
}

function setCamera() {
  orthographicCamera.position.set(cameraX.value, cameraY.value, cameraZ.value)
  perspectiveCamera.position.set(cameraX.value, cameraY.value, cameraZ.value)
  orthographicCameraControls.target.set(
    cameraTargetX.value,
    cameraTargetY.value,
    cameraTargetZ.value,
  )
  perspectiveCameraControls.target.set(
    cameraTargetX.value,
    cameraTargetY.value,
    cameraTargetZ.value,
  )
  orthographicCameraControls.update()
  perspectiveCameraControls.update()
}

function resetCamera() {
  orthographicCameraControls.reset()
  perspectiveCameraControls.reset()
  cameraX.value = camera.value.position.x
  cameraY.value = camera.value.position.y
  cameraZ.value = camera.value.position.z
  cameraTargetX.value = controls.value.target.x
  cameraTargetY.value = controls.value.target.y
  cameraTargetZ.value = controls.value.target.z
}

function saveRenderedImage() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.png')
  renderer.domElement.toBlob(function (blob) {
    let url = URL.createObjectURL(blob!)
    downloadLink.setAttribute('href', url)
    downloadLink.click()
  })
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
  <div
    ref="renderTarget"
    :style="{
      height: '50vh',
      width: '60%',
      marginBottom: '0.5em',
    }"
  />
  <cdx-checkbox v-if="loaded" v-model="orthographic">
    {{ t('blockStructureRenderer.orthographic') }}
  </cdx-checkbox>
  <cdx-checkbox v-if="loaded" v-model="animatedTexture">
    {{ t('blockStructureRenderer.animatedTexture') }}
  </cdx-checkbox>
  <div
    v-if="loaded"
    :style="{
      display: 'flex',
      flexDirection: 'column',
      flexWrap: 'wrap',
      gap: '.5rem',
      marginBottom: '0.5em',
    }"
  >
    <div>
      <label for="displayMode" :style="{ marginRight: '.5rem' }">
        {{ t('blockStructureRenderer.displayMode') }}
      </label>
      <cdx-select
        id="displayMode"
        v-model:selected="displayMode"
        :menu-items="displayModes"
        :style="{
          width: 'fit-content',
        }"
        @update:selected="onDisplayModeChanged"
      />
    </div>
    <div
      v-if="displayMode !== displayModeStr[0]"
      :style="{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '.5rem',
      }"
    >
      <span>{{ t('blockStructureRenderer.renderRange') }}</span>
      <cdx-text-input
        v-if="displayMode === displayModeStr[1]"
        v-model="yRangeMin"
        inputType="number"
        min="0"
        :max="Math.max(yRangeMax, 0)"
        step="1"
        @input="onDisplayModeChanged"
      />
      <span v-if="displayMode === displayModeStr[1]"> - </span>
      <cdx-text-input
        v-if="displayMode === displayModeStr[1]"
        v-model="yRangeMax"
        inputType="number"
        :min="Math.min(yRangeMin, blockStructure.y - 1)"
        :max="blockStructure.y - 1"
        step="1"
        @input="onDisplayModeChanged"
      />
      <cdx-text-input
        v-if="displayMode === displayModeStr[2]"
        v-model="ySelected"
        inputType="number"
        min="0"
        :max="blockStructure.y - 1"
        step="1"
        @input="onDisplayModeChanged"
      />
    </div>
  </div>
  <div
    v-if="loaded"
    :style="{
      display: 'flex',
      flexDirection: 'column',
      flexWrap: 'wrap',
      gap: '.5rem',
      marginBottom: '0.5em',
    }"
  >
    <div
      :style="{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '.5rem',
      }"
    >
      <label for="displayMode">
        {{ t('blockStructureRenderer.cameraSetting') }}
      </label>
      <cdx-select
        id="displayMode"
        v-model:selected="cameraSettingMode"
        :menu-items="cameraSettingModes"
        :style="{
          width: 'fit-content',
        }"
        @update:selected="onCameraSettingModeChanged"
      />
      <cdx-button v-if="cameraSettingMode === cameraSettingModeStr[1]" @click="setCamera">
        {{ t('blockStructureRenderer.cameraSetting.confirm') }}
      </cdx-button>
    </div>
    <div
      v-if="cameraSettingMode === cameraSettingModeStr[1]"
      :style="{
        display: 'flex',
        flexDirection: 'column',
        gap: '.5rem',
      }"
    >
      <div
        :style="{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '.5rem',
        }"
      >
        <span>{{ t('blockStructureRenderer.cameraSetting.position') }} (</span>
        <cdx-text-input v-model="cameraX" inputType="number" />
        <span>, </span>
        <cdx-text-input v-model="cameraY" inputType="number" />
        <span>, </span>
        <cdx-text-input v-model="cameraZ" inputType="number" />
        <span>)</span>
      </div>
      <div
        :style="{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '.5rem',
        }"
      >
        <span>{{ t('blockStructureRenderer.cameraSetting.target') }} (</span>
        <cdx-text-input v-model="cameraTargetX" inputType="number" />
        <span>, </span>
        <cdx-text-input v-model="cameraTargetY" inputType="number" />
        <span>, </span>
        <cdx-text-input v-model="cameraTargetZ" inputType="number" />
        <span>)</span>
      </div>
    </div>
  </div>
  <div
    v-if="loaded"
    :style="{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: '.5rem',
    }"
  >
    <cdx-button @click="resetCamera">{{ t('blockStructureRenderer.resetCamera') }}</cdx-button>
    <cdx-button @click="saveRenderedImage">{{ t('blockStructureRenderer.saveImage') }}</cdx-button>
  </div>
</template>
