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
const backgroundColor = ref('#ffffff')

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

const orbitOrthoControls = new OrbitControls(orthographicCamera, renderer.domElement)
orbitOrthoControls.addEventListener('change', () => renderer.render(scene, orthographicCamera))
orbitOrthoControls.update()
const orbitPerspectiveControls = new OrbitControls(perspectiveCamera, renderer.domElement)
orbitPerspectiveControls.addEventListener('change', () => renderer.render(scene, perspectiveCamera))
orbitPerspectiveControls.update()

const controls = computed(() =>
  orthographic.value ? orbitOrthoControls : orbitPerspectiveControls,
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
  orbitOrthoControls.target.set(maxX / 2, maxY / 2, maxZ / 2)
  orbitPerspectiveControls.target.set(maxX / 2, maxY / 2, maxZ / 2)
  orthographicCamera.position.set(maxX / 2, maxY * 1.5, maxZ * 1.5)
  perspectiveCamera.position.set(maxX / 2, maxY * 1.5, maxZ * 1.5)
  orbitOrthoControls.update()
  orbitOrthoControls.saveState()
  orbitPerspectiveControls.update()
  orbitPerspectiveControls.saveState()
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
    orbitOrthoControls.enabled = true
    orbitPerspectiveControls.enabled = true
  } else {
    orbitOrthoControls.enabled = false
    orbitPerspectiveControls.enabled = false
  }
  const control = orthographic.value ? orbitOrthoControls : orbitPerspectiveControls
  cameraX.value = camera.value.position.x - control.target.x
  cameraY.value = camera.value.position.y - control.target.y
  cameraZ.value = camera.value.position.z - control.target.z
  cameraTargetX.value = control.target.x
  cameraTargetY.value = control.target.y
  cameraTargetZ.value = control.target.z
}

function setCamera() {
  orthographicCamera.position.set(
    cameraX.value + cameraTargetX.value,
    cameraY.value + cameraTargetY.value,
    cameraZ.value + cameraTargetZ.value,
  )
  perspectiveCamera.position.set(
    cameraX.value + cameraTargetX.value,
    cameraY.value + cameraTargetY.value,
    cameraZ.value + cameraTargetZ.value,
  )
  orthographicCamera.lookAt(cameraTargetX.value, cameraTargetY.value, cameraTargetZ.value)
  perspectiveCamera.lookAt(cameraTargetX.value, cameraTargetY.value, cameraTargetZ.value)
  orbitPerspectiveControls.target.set(cameraTargetX.value, cameraTargetY.value, cameraTargetZ.value)
  orbitOrthoControls.target.set(cameraTargetX.value, cameraTargetY.value, cameraTargetZ.value)
  orbitOrthoControls.update()
  orbitPerspectiveControls.update()
}

function resetCamera() {
  orbitOrthoControls.reset()
  orbitPerspectiveControls.reset()
  cameraX.value = camera.value.position.x - blockStructure.x / 2
  cameraY.value = camera.value.position.y - blockStructure.y / 2
  cameraZ.value = camera.value.position.z - blockStructure.z / 2
  cameraTargetX.value = blockStructure.x / 2
  cameraTargetY.value = blockStructure.y / 2
  cameraTargetZ.value = blockStructure.z / 2
}

function changeBackgroundColor() {
  scene.background = new THREE.Color(backgroundColor.value)
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
  const aspect = nowSize.width / nowSize.height
  perspectiveCamera.aspect = aspect
  orthographicCamera.left = -aspect * 2
  orthographicCamera.right = aspect * 2
  orthographicCamera.top = 2
  orthographicCamera.bottom = -2
  orthographicCamera.updateProjectionMatrix()
  perspectiveCamera.updateProjectionMatrix()
  renderer.setSize(nowSize.width, nowSize.height)
  orbitOrthoControls.update()
  orbitPerspectiveControls.update()
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
    class="do-not-remount-this"
    ref="renderTarget"
    :style="{
      height: '50vh',
      width: 'max(60%, 50vh)',
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: '.5rem',
      marginBottom: '0.5em',
    }"
  >
    <label for="color-picker">{{ t('blockStructureRenderer.backgroundColor') }}</label>
    <input
      type="color"
      v-model="backgroundColor"
      id="color-picker"
      @change="changeBackgroundColor"
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
