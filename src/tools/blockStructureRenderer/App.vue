<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { CdxCheckbox, CdxTextInput, CdxSelect, CdxButton } from '@wikimedia/codex'
import { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import {
  bakeBlockMarkers,
  bakeBlockModelRenderLayer,
  bakeFluidRenderLayer,
  bakeInvisibleBlocks,
  BlockStructure,
  NameMapping,
} from '@/tools/blockStructureRenderer/renderer.ts'
import { makeMaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { saveAsLitematic, saveAsStructureFile } from '@/tools/blockStructureRenderer/structure.ts'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'

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
  marks: string[]

  cameraPosData: string[]
  orthographicDefault: boolean
  animatedTextureDefault: boolean
  showInvisibleBlocksDefault: boolean
  displayMarksDefault: boolean
  backgroundColorDefault: string
  backgroundAlphaDefault: number
}>()
const { t } = useI18n()
const renderTarget = ref()
const loaded = ref(false)

const orthographic = ref(props.orthographicDefault)
const animatedTexture = ref(props.animatedTextureDefault)
const invisibleBlocks = ref(props.showInvisibleBlocksDefault)
const displayMarks = ref(props.displayMarksDefault)
const backgroundColor = ref(props.backgroundColorDefault)
const backgroundAlpha = ref(
  isNaN(props.backgroundAlphaDefault) ? 255 : props.backgroundAlphaDefault,
)

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
const cameraPitch = ref(0)
const cameraYaw = ref(0)

// Three.js setup
const rendererAvailable = WebGL.isWebGLAvailable()
const renderer = new THREE.WebGLRenderer({
  preserveDrawingBuffer: true,
  alpha: true,
  antialias: false,
}) // Do not enable antialiasing: it makes block edges black
renderer.setPixelRatio(window.devicePixelRatio)

const scene = new THREE.Scene()
renderer.setClearColor(backgroundColor.value, backgroundAlpha.value / 255)

const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
const perspectiveCamera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000)
const camera = computed(() => (orthographic.value ? orthographicCamera : perspectiveCamera))
const controls = new PointerLockControls(camera.value, renderer.domElement)
controls.pointerSpeed = 5
controls.addEventListener('change', () => renderer.render(scene, perspectiveCamera))

renderer.domElement.addEventListener('click', () => {
  if (cameraSettingModeStr.findIndex((str) => str === cameraSettingMode.value) === 0)
    controls.lock()
})

// Action ------------------------------------------------------------------------------------------
const isLeftMoving = ref(false)
const isRightMoving = ref(false)
const isForwardMoving = ref(false)
const isBackwardMoving = ref(false)
const isUpMoving = ref(false)
const isDownMoving = ref(false)

document.addEventListener('keydown', (event) => {
  if (!controls.isLocked) return
  switch (event.key.toLowerCase()) {
    case 'w':
      isForwardMoving.value = true
      break
    case 'a':
      isLeftMoving.value = true
      break
    case 's':
      isBackwardMoving.value = true
      break
    case 'd':
      isRightMoving.value = true
      break
    case ' ':
      isUpMoving.value = true
      break
    case 'shift':
      isDownMoving.value = true
      break
  }
})
document.addEventListener('keyup', (event) => {
  switch (event.key.toLowerCase()) {
    case 'w':
      isForwardMoving.value = false
      break
    case 'a':
      isLeftMoving.value = false
      break
    case 's':
      isBackwardMoving.value = false
      break
    case 'd':
      isRightMoving.value = false
      break
    case ' ':
      isUpMoving.value = false
      break
    case 'shift':
      isDownMoving.value = false
      break
  }
})

// Material and model setup ------------------------------------------------------------------------

const lineMaterialList = ref([] as LineMaterial[])

const blockStructure = new BlockStructure(props.structure, props.marks)
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
    if (displayMarks.value) bakeBlockMarkers(scene, blockStructure)
    if (invisibleBlocks.value)
      lineMaterialList.value = bakeInvisibleBlocks(renderer, scene, nameMapping, blockStructure)
  },
  () => animatedTexture.value,
)

function clearScene() {
  scene.children.forEach((child) => {
    child.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material.dispose()
        obj.geometry.dispose()
      }
    })
  })
  scene.clear()
  lineMaterialList.value = []
}

function reBakeRenderLayers() {
  clearScene()
  bakeFluidRenderLayer(scene, materialPicker, blockStructure, nameMapping, modelManager)
  bakeBlockModelRenderLayer(scene, materialPicker, blockStructure, nameMapping, modelManager)
  if (displayMarks.value) bakeBlockMarkers(scene, blockStructure)
  if (invisibleBlocks.value)
    lineMaterialList.value = bakeInvisibleBlocks(renderer, scene, nameMapping, blockStructure)
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

// Camera settings ---------------------------------------------------------------------------------
function parsePosition(value?: string) {
  if (value) {
    const pos = value.split(',')
    const x = parseFloat(pos[0].trim())
    const y = parseFloat(pos[1].trim())
    const z = parseFloat(pos[2].trim())
    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) return [x, y, z]
  }
}

function parseAngles(value?: string) {
  if (value) {
    const angles = value.split(',')
    const pitch = parseFloat(angles[0].trim())
    const yaw = parseFloat(angles[1].trim())
    if (!isNaN(pitch) && !isNaN(yaw)) return [pitch, yaw]
  }
}

const defaultCameraPos = parsePosition(props.cameraPosData[0]) ?? [
  blockStructure.x / 2,
  blockStructure.y * 1.5,
  blockStructure.z * 1.5,
]
const defaultCameraAngles = parseAngles(props.cameraPosData[1]) ?? [0, 0]

if (rendererAvailable) {
  yRangeMax.value = blockStructure.y - 1
  resetCamera()
}

function onCameraChanged() {
  if (orthographic.value) {
    orthographicCamera.position.set(...perspectiveCamera.position.toArray())
    orthographicCamera.setRotationFromEuler(perspectiveCamera.rotation)
    controls.camera = orthographicCamera
  } else {
    perspectiveCamera.position.set(...orthographicCamera.position.toArray())
    perspectiveCamera.setRotationFromEuler(orthographicCamera.rotation)
    controls.camera = perspectiveCamera
  }
}

function onCameraSettingModeChanged() {
  if (cameraSettingModeStr.findIndex((str) => str === cameraSettingMode.value) !== 0) {
    const [x, y, z] = camera.value.position.toArray()
    cameraX.value = x
    cameraY.value = y
    cameraZ.value = z
    const euler = camera.value.rotation.reorder('YXZ')
    cameraPitch.value = (euler.x * 180) / Math.PI
    cameraYaw.value = (euler.y * 180) / Math.PI
  }
}

function setCamera() {
  orthographicCamera.position.set(cameraX.value, cameraY.value, cameraZ.value)
  perspectiveCamera.position.set(cameraX.value, cameraY.value, cameraZ.value)
  orthographicCamera.setRotationFromEuler(
    new THREE.Euler(
      (cameraPitch.value * Math.PI) / 180,
      (cameraYaw.value * Math.PI) / 180,
      0,
      'YXZ',
    ),
  )
  perspectiveCamera.setRotationFromEuler(
    new THREE.Euler(
      (cameraPitch.value * Math.PI) / 180,
      (cameraYaw.value * Math.PI) / 180,
      0,
      'YXZ',
    ),
  )
}

function resetCamera() {
  orthographicCamera.position.set(defaultCameraPos[0], defaultCameraPos[1], defaultCameraPos[2])
  perspectiveCamera.position.set(defaultCameraPos[0], defaultCameraPos[1], defaultCameraPos[2])
  orthographicCamera.setRotationFromEuler(
    new THREE.Euler(
      (defaultCameraAngles[0] * Math.PI) / 180,
      (defaultCameraAngles[1] * Math.PI) / 180,
      0,
      'YXZ',
    ),
  )
  perspectiveCamera.setRotationFromEuler(
    new THREE.Euler(
      (defaultCameraAngles[0] * Math.PI) / 180,
      (defaultCameraAngles[1] * Math.PI) / 180,
      0,
      'YXZ',
    ),
  )
  cameraX.value = defaultCameraPos[0]
  cameraY.value = defaultCameraPos[1]
  cameraZ.value = defaultCameraPos[2]
  cameraPitch.value = defaultCameraAngles[0]
  cameraYaw.value = defaultCameraAngles[1]
}

function changeBackgroundColor() {
  renderer.setClearColor(backgroundColor.value, backgroundAlpha.value / 255)
}

// Save as file ------------------------------------------------------------------------------------

function saveRenderedImage() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.png')
  renderer.domElement.toBlob(function (blob) {
    let url = URL.createObjectURL(blob!)
    downloadLink.setAttribute('href', url)
    downloadLink.click()
  })
}

function saveStructureFile() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.nbt')
  const blob = new Blob([saveAsStructureFile(blockStructure, nameMapping)])
  let url = URL.createObjectURL(blob)
  downloadLink.setAttribute('href', url)
  downloadLink.click()
}

function saveLitematic() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.litematic')
  const blob = new Blob([saveAsLitematic(blockStructure, nameMapping)])
  let url = URL.createObjectURL(blob)
  downloadLink.setAttribute('href', url)
  downloadLink.click()
}

// Main render loop --------------------------------------------------------------------------------

const hidden = ref(false)
const lastTime = ref(Date.now())

function animate() {
  requestAnimationFrame(animate)

  // Check if the render target is visible
  if (renderTarget.value.offsetParent === null) {
    if (hidden.value) return
    hidden.value = true
    clearScene()
    return
  }
  if (hidden.value) {
    hidden.value = false
    reBakeRenderLayers()
  }

  const bounds = renderTarget.value.getBoundingClientRect()
  if (
    (bounds.top <= 0 && bounds.bottom <= 0) ||
    (bounds.top >= document.documentElement.clientHeight &&
      bounds.bottom >= document.documentElement.clientHeight) ||
    (bounds.left <= 0 && bounds.right <= 0) ||
    (bounds.left >= document.documentElement.clientWidth &&
      bounds.right >= document.documentElement.clientWidth)
  )
    return

  // Move Control
  const delta = (Date.now() - lastTime.value) / 1000
  lastTime.value = Date.now()
  const moveSpeed = 5 * delta
  let x = 0
  let z = 0
  if (isForwardMoving.value) z += moveSpeed
  if (isBackwardMoving.value) z -= moveSpeed
  if (isLeftMoving.value) x -= moveSpeed
  if (isRightMoving.value) x += moveSpeed
  if (isUpMoving.value) camera.value.position.y += moveSpeed
  if (isDownMoving.value) camera.value.position.y -= moveSpeed
  controls.moveRight(x)
  controls.moveForward(z)

  renderer.render(scene, camera.value)
}

function updateDisplay() {
  const rect = renderTarget.value.getBoundingClientRect()
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  const aspect = width / height
  perspectiveCamera.aspect = aspect
  orthographicCamera.left = -aspect * 2
  orthographicCamera.right = aspect * 2
  orthographicCamera.top = 2
  orthographicCamera.bottom = -2
  renderer.setSize(width, height)
  orthographicCamera.updateProjectionMatrix()
  perspectiveCamera.updateProjectionMatrix()
  lineMaterialList.value.forEach((lineMaterial) => {
    lineMaterial.resolution.set(width, height)
  })
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
    class="renderer-component"
    ref="renderTarget"
    :style="{
      height: '60vh',
      width: 'max(60%, 60vh)',
      marginTop: '0.5em',
      marginBottom: '0.5em',
    }"
  />
  <cdx-checkbox v-if="loaded" v-model="orthographic" @change="onCameraChanged">
    {{ t('blockStructureRenderer.orthographic') }}
  </cdx-checkbox>
  <cdx-checkbox v-if="loaded" v-model="animatedTexture">
    {{ t('blockStructureRenderer.animatedTexture') }}
  </cdx-checkbox>
  <cdx-checkbox v-if="loaded" v-model="invisibleBlocks" @change="reBakeRenderLayers">
    {{ t('blockStructureRenderer.renderInvisibleBlocks') }}
  </cdx-checkbox>
  <cdx-checkbox
    v-if="loaded && blockStructure.hasMarks()"
    v-model="displayMarks"
    @change="reBakeRenderLayers"
  >
    {{ t('blockStructureRenderer.renderMarks') }}
  </cdx-checkbox>

  <div
    v-if="loaded"
    :style="{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '.5rem',
      marginBottom: '0.5em',
    }"
  >
    <label for="colorPicker">{{ t('blockStructureRenderer.backgroundColor') }}</label>
    <input
      type="color"
      v-model="backgroundColor"
      id="colorPicker"
      @change="changeBackgroundColor"
    />
    <label for="backgroundAlpha">{{ t('blockStructureRenderer.backgroundAlpha') }}</label>
    <cdx-text-input
      id="backgroundAlpha"
      v-model="backgroundAlpha"
      inputType="number"
      :min="0"
      :max="255"
      step="1"
      @input="changeBackgroundColor"
    />
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
      <label for="cameraSetting">
        {{ t('blockStructureRenderer.cameraSetting') }}
      </label>
      <cdx-select
        id="cameraSetting"
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
        <cdx-text-input v-model="cameraX" inputType="number" step="0.1" />
        <span>, </span>
        <cdx-text-input v-model="cameraY" inputType="number" step="0.1" />
        <span>, </span>
        <cdx-text-input v-model="cameraZ" inputType="number" step="0.1" />
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
        <span>{{ t('blockStructureRenderer.cameraSetting.pose') }} (</span>
        <cdx-text-input v-model="cameraPitch" inputType="number" step="0.1" />
        <span>, </span>
        <cdx-text-input v-model="cameraYaw" inputType="number" step="0.1" />
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
      marginBottom: '0.5em',
    }"
  >
    <cdx-button @click="resetCamera">{{ t('blockStructureRenderer.resetCamera') }}</cdx-button>
    <cdx-button @click="saveRenderedImage">{{ t('blockStructureRenderer.saveImage') }}</cdx-button>
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
    <cdx-button @click="saveStructureFile"
      >{{ t('blockStructureRenderer.saveStructureFile') }}
    </cdx-button>
    <cdx-button @click="saveLitematic">{{ t('blockStructureRenderer.saveLitematic') }}</cdx-button>
  </div>
</template>
