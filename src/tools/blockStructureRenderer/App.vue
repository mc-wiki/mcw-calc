<script setup lang="ts">
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import {
  bakeBlockMarkers,
  bakeBlockModelRenderLayer,
  bakeFluidRenderLayer,
  bakeInvisibleBlocks,
  BlockStructure,
  NameMapping,
} from '@/tools/blockStructureRenderer/renderer.ts'
import { saveAsLitematic, saveAsStructureFile } from '@/tools/blockStructureRenderer/structure.ts'
import { MaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'
import { flip, offset, shift, useFloating, type VirtualElement } from '@floating-ui/vue'
import {
  CdxButton,
  CdxCheckbox,
  CdxField,
  CdxIcon,
  CdxSelect,
  CdxTextInput,
} from '@wikimedia/codex'
import { cdxIconCamera, cdxIconCut, cdxIconImage, cdxIconShare } from '@wikimedia/codex-icons'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { computed, onMounted, ref, useTemplateRef, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import BsrPopup from './BsrPopup.vue'

const props = defineProps<{
  blocks: string[]
  structure: string
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

const renderTarget = useTemplateRef('render-target')
const loaded = ref(false)
const orthographic = ref(props.orthographicDefault)
const animatedTexture = ref(props.animatedTextureDefault)
const invisibleBlocks = ref(props.showInvisibleBlocksDefault)
const displayMarks = ref(props.displayMarksDefault)
const backgroundColor = ref(props.backgroundColorDefault)
const backgroundAlpha = ref(props.backgroundAlphaDefault)

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

// Three.js Renderer Setup -------------------------------------------------------------------------

const rendererAvailable = WebGL.isWebGLAvailable()
const renderer = new THREE.WebGLRenderer({
  preserveDrawingBuffer: true,
  alpha: true,
  antialias: false,
}) // Do not enable antialiasing: it makes block edges black
renderer.setPixelRatio(window.devicePixelRatio)
renderer.domElement.tabIndex = 0

const scene = new THREE.Scene()
const orthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000)
const perspectiveCamera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000)
const orthoControl = new OrbitControls(orthographicCamera, renderer.domElement)
const persControl = new OrbitControls(perspectiveCamera, renderer.domElement)
const camera = computed(() => (orthographic.value ? orthographicCamera : perspectiveCamera))
const control = computed(() => (orthographic.value ? orthoControl : persControl))
const nonCamera = computed(() => (orthographic.value ? perspectiveCamera : orthographicCamera))
const nonControl = computed(() => (orthographic.value ? persControl : orthoControl))
const cameras = [orthographicCamera, perspectiveCamera]
const controls = [orthoControl, persControl]
orthoControl.enableZoom = false
persControl.enableZoom = false

// Material and model setup ------------------------------------------------------------------------

const requireReBake = ref(false)
const lineMaterialList = ref([] as LineMaterial[])

const blockStructure = new BlockStructure(props.structure, props.marks)
const nameMapping = new NameMapping(props.blocks)
const modelManager = new BlockStateModelManager(nameMapping)
const materialPicker = new MaterialPicker(
  modelManager,
  () => {
    loaded.value = true
    requireReBake.value = true
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

// Camera Settings ---------------------------------------------------------------------------------

const cameraX = ref(0)
const cameraY = ref(0)
const cameraZ = ref(0)
const cameraCenterX = ref(0)
const cameraCenterY = ref(0)
const cameraCenterZ = ref(0)
const cameraFOV = ref(70)
const cameraZoom = ref(1)

const isLeftMoving = ref(false)
const isRightMoving = ref(false)
const isForwardMoving = ref(false)
const isBackwardMoving = ref(false)
const isUpMoving = ref(false)
const isDownMoving = ref(false)
const moving = [
  isLeftMoving,
  isRightMoving,
  isForwardMoving,
  isBackwardMoving,
  isUpMoving,
  isDownMoving,
]
const MOVING_KEYS = ['a', 'd', 'w', 's', ' ', 'shift']

function parsePosition(value?: string) {
  if (value) {
    const pos = value.split(',')
    const x = Number.parseFloat(pos[0].trim())
    const y = Number.parseFloat(pos[1].trim())
    const z = Number.parseFloat(pos[2].trim())
    if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) return [x, y, z]
  }
}

const CAMERA_DEFAULT_POS = [blockStructure.x / 2, blockStructure.y * 1.5, blockStructure.z * 1.5]
const LOOK_DEFAULT_POS = [blockStructure.x / 2, blockStructure.y / 2, blockStructure.z / 2]
const defaultCameraPos = parsePosition(props.cameraPosData[0]) ?? CAMERA_DEFAULT_POS
const defaultCameraLookingPos = parsePosition(props.cameraPosData[1]) ?? LOOK_DEFAULT_POS

function resetCamera() {
  cameraX.value = defaultCameraPos[0]
  cameraY.value = defaultCameraPos[1]
  cameraZ.value = defaultCameraPos[2]
  cameraCenterX.value = defaultCameraLookingPos[0]
  cameraCenterY.value = defaultCameraLookingPos[1]
  cameraCenterZ.value = defaultCameraLookingPos[2]
}

// Tooltip & Help ----------------------------------------------------------------------------------

const dragTooltip = useTemplateRef('drag-tooltip')
const showHelp = ref(false)
const tooltipOpen = ref(false)
const focused = ref(false)

const virtualEl = ref<VirtualElement>({
  getBoundingClientRect() {
    return new DOMRect()
  },
})
const { floatingStyles, update } = useFloating(virtualEl, dragTooltip, {
  open: tooltipOpen,
  placement: 'right-start',
  middleware: [
    offset({
      alignmentAxis: 20,
    }),
    flip(),
    shift(),
  ],
})

// Event listeners & Watch Effect ------------------------------------------------------------------

renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault()
  if (orthographic.value) cameraZoom.value = Math.max(0.1, cameraZoom.value - event.deltaY * 0.0001)
  else cameraFOV.value = Math.min(110, Math.max(30, cameraFOV.value + event.deltaY * 0.01))
})

renderer.domElement.addEventListener('keydown', (event) => {
  event.preventDefault()
  const index = MOVING_KEYS.indexOf(event.key.toLowerCase())
  if (index === -1) return
  moving[index].value = true
})

renderer.domElement.addEventListener('keyup', (event) => {
  event.preventDefault()
  const index = MOVING_KEYS.indexOf(event.key.toLowerCase())
  if (index === -1) return
  moving[index].value = false
})

renderer.domElement.addEventListener('focusin', () => {
  focused.value = true
  showHelp.value = true
  tooltipOpen.value = false
  setTimeout(() => {
    showHelp.value = false
  }, 4000)
})

renderer.domElement.addEventListener('focusout', () => {
  focused.value = false
  showHelp.value = false
  moving.forEach((ref) => (ref.value = false))
})

renderer.domElement.addEventListener('mouseenter', () => {
  if (!focused.value) tooltipOpen.value = true
})

renderer.domElement.addEventListener('mouseleave', () => {
  tooltipOpen.value = false
})

renderer.domElement.addEventListener('mousemove', (event) => {
  if (!focused.value) {
    virtualEl.value.getBoundingClientRect = () => {
      if (!renderTarget.value) return new DOMRect()
      const x = Math.min(
        Math.max(event.clientX, renderTarget.value.getBoundingClientRect().left),
        renderTarget.value.getBoundingClientRect().right,
      )
      const y = Math.min(
        Math.max(event.clientY, renderTarget.value.getBoundingClientRect().top),
        renderTarget.value.getBoundingClientRect().bottom,
      )
      return new DOMRect(x, y, 0, 0)
    }
    update()
  }
})

watch([displayMode, yRangeMin, yRangeMax, ySelected], () => {
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
  requireReBake.value = true
})

const syncing = ref(false)
const listener = () => {
  if (syncing.value) return
  syncing.value = true
  ;[cameraCenterX.value, cameraCenterY.value, cameraCenterZ.value] = control.value.target
  ;[cameraX.value, cameraY.value, cameraZ.value] = camera.value.position
  nonControl.value.target = control.value.target
  nonCamera.value.position.copy(camera.value.position)
  syncing.value = false
  cameras.forEach((c) => c.updateProjectionMatrix())
  renderer.render(scene, camera.value)
}
watch(
  [control],
  ([value], [oldValue]) => {
    oldValue?.removeEventListener('change', listener)
    value.addEventListener('change', listener)
  },
  { immediate: true },
)

watch([cameraX, cameraY, cameraZ, cameraCenterX, cameraCenterY, cameraCenterZ], () => {
  if (syncing.value) return
  syncing.value = true
  const center = new THREE.Vector3(cameraCenterX.value, cameraCenterY.value, cameraCenterZ.value)
  controls.forEach((control) => (control.target = center))
  cameras.forEach((camera) => {
    camera.position.set(cameraX.value, cameraY.value, cameraZ.value)
    camera.lookAt(center)
    camera.updateProjectionMatrix()
  })
  syncing.value = false
})

watchEffect(() => {
  orthographicCamera.zoom = cameraZoom.value
  orthographicCamera.updateProjectionMatrix()
})

watchEffect(() => {
  perspectiveCamera.fov = cameraFOV.value
  perspectiveCamera.updateProjectionMatrix()
})

watchEffect(() => {
  renderer.setClearColor(backgroundColor.value, backgroundAlpha.value / 255)
})

watch([displayMarks, invisibleBlocks], () => {
  requireReBake.value = true
})

watch([cameraSettingMode], () => {
  const enabled = cameraSettingMode.value === cameraSettingModeStr[0]
  controls.forEach((control) => (control.enabled = enabled))
})

// Save as file ------------------------------------------------------------------------------------

function saveRenderedImage() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.png')
  renderer.domElement.toBlob((blob) => {
    const url = URL.createObjectURL(blob!)
    downloadLink.setAttribute('href', url)
    downloadLink.click()
  })
}

async function saveStructureFile() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.nbt')
  const blob = new Blob([await saveAsStructureFile(blockStructure, nameMapping)])
  const url = URL.createObjectURL(blob)
  downloadLink.setAttribute('href', url)
  downloadLink.click()
}

async function saveLitematic() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.litematic')
  const blob = new Blob([await saveAsLitematic(blockStructure, nameMapping)])
  const url = URL.createObjectURL(blob)
  downloadLink.setAttribute('href', url)
  downloadLink.click()
}

// Main render loop --------------------------------------------------------------------------------
const lastTime = ref(Date.now())

function animate() {
  requestAnimationFrame(animate)

  // Check if the render target is visible
  if (renderTarget.value?.offsetParent === null) {
    if (requireReBake.value) return
    requireReBake.value = true
    clearScene()
    return
  }
  if (requireReBake.value) {
    reBakeRenderLayers()
    requireReBake.value = false
  }

  const bounds = renderTarget.value?.getBoundingClientRect() ?? new DOMRect()
  if (
    (bounds.top <= 0 && bounds.bottom <= 0) ||
    (bounds.top >= document.documentElement.clientHeight &&
      bounds.bottom >= document.documentElement.clientHeight) ||
    (bounds.left <= 0 && bounds.right <= 0) ||
    (bounds.left >= document.documentElement.clientWidth &&
      bounds.right >= document.documentElement.clientWidth)
  ) {
    return
  }

  // Move Control
  const delta = (Date.now() - lastTime.value) / 1000
  lastTime.value = Date.now()
  const moveSpeed = 5 * delta
  let x = 0
  let y = 0
  let z = 0
  if (isForwardMoving.value) z += moveSpeed
  if (isBackwardMoving.value) z -= moveSpeed
  if (isLeftMoving.value) x -= moveSpeed
  if (isRightMoving.value) x += moveSpeed
  if (isUpMoving.value) y += moveSpeed
  if (isDownMoving.value) y -= moveSpeed
  if (x || z) {
    const forward = new THREE.Vector3()
    camera.value.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
    cameraX.value += x * right.x + z * forward.x
    cameraCenterX.value += x * right.x + z * forward.x
    cameraZ.value += x * right.z + z * forward.z
    cameraCenterZ.value += x * right.z + z * forward.z
  }
  if (y) {
    cameraY.value += y
    cameraCenterY.value += y
  }

  renderer.render(scene, camera.value)
}

function updateDisplay() {
  const rect = renderTarget.value?.getBoundingClientRect() ?? new DOMRect()
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
  if (rendererAvailable && renderTarget.value) {
    virtualEl.value.contextElement = renderTarget.value
    yRangeMax.value = blockStructure.y - 1
    updateDisplay()
    resetCamera()
    renderTarget.value.appendChild(renderer.domElement)
    new ResizeObserver(updateDisplay).observe(renderTarget.value)
    animate()
  } else {
    renderTarget.value?.appendChild(WebGL.getWebGLErrorMessage())
  }
})
</script>

<template>
  <div
    :style="{
      height: '60vw',
      width: 'max(60%, 60vw)',
      position: 'relative',
    }"
  >
    <div
      ref="render-target"
      class="renderer-component"
      :style="{
        width: '100%',
        height: '100%',
        position: 'relative',
      }"
    />
    <div
      v-if="loaded"
      style="position: absolute; bottom: 0; right: 0; padding: 0.5em; display: flex; gap: 5px"
    >
      <BsrPopup :name="t('blockStructureRenderer.optionsScene')" :icon="cdxIconImage">
        <CdxCheckbox v-model="animatedTexture">
          {{ t('blockStructureRenderer.animatedTexture') }}
        </CdxCheckbox>
        <CdxCheckbox v-model="invisibleBlocks">
          {{ t('blockStructureRenderer.renderInvisibleBlocks') }}
        </CdxCheckbox>
        <CdxCheckbox v-if="blockStructure.hasMarks()" v-model="displayMarks">
          {{ t('blockStructureRenderer.renderMarks') }}
        </CdxCheckbox>

        <CdxField>
          <input id="colorPicker" v-model="backgroundColor" type="color" />
          <template #label>
            {{ t('blockStructureRenderer.backgroundColor') }}
          </template>
        </CdxField>
        <CdxField>
          <CdxTextInput
            id="backgroundAlpha"
            v-model="backgroundAlpha"
            input-type="number"
            :min="0"
            :max="255"
            step="1"
          />

          <template #label>
            {{ t('blockStructureRenderer.backgroundAlpha') }}
          </template>
        </CdxField>

        <CdxField>
          <CdxSelect
            id="displayMode"
            v-model:selected="displayMode"
            :menu-items="displayModes"
            :style="{
              width: 'fit-content',
            }"
          />

          <template #label>
            {{ t('blockStructureRenderer.displayMode') }}
          </template>
        </CdxField>
        <CdxField v-if="displayMode !== displayModeStr[0]">
          <template #label>
            {{ t('blockStructureRenderer.renderRange') }}
          </template>
          <div
            :style="{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '.5rem',
              width: 'max-content',
            }"
          >
            <CdxTextInput
              v-if="displayMode === displayModeStr[1]"
              v-model="yRangeMin"
              style="min-width: 100px"
              input-type="number"
              min="0"
              :max="Math.max(yRangeMax, 0)"
              step="1"
            />
            <span v-if="displayMode === displayModeStr[1]"> - </span>
            <CdxTextInput
              v-if="displayMode === displayModeStr[1]"
              v-model="yRangeMax"
              style="min-width: 100px"
              input-type="number"
              :min="Math.min(yRangeMin, blockStructure.y - 1)"
              :max="blockStructure.y - 1"
              step="1"
            />
            <CdxTextInput
              v-if="displayMode === displayModeStr[2]"
              v-model="ySelected"
              style="min-width: 100px"
              input-type="number"
              min="0"
              :max="blockStructure.y - 1"
              step="1"
            />
          </div>
        </CdxField>
      </BsrPopup>
      <BsrPopup :name="t('blockStructureRenderer.optionsCamera')" :icon="cdxIconCamera">
        <CdxCheckbox v-model="orthographic">
          {{ t('blockStructureRenderer.orthographic') }}
        </CdxCheckbox>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'wrap',
            gap: '.5rem',
            width: 'max-content',
          }"
        >
          <CdxField>
            <CdxSelect
              id="cameraSetting"
              v-model:selected="cameraSettingMode"
              :menu-items="cameraSettingModes"
              :style="{
                width: 'fit-content',
              }"
            />

            <template #label>
              {{ t('blockStructureRenderer.cameraSetting') }}
            </template>
          </CdxField>
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
              <CdxTextInput
                v-model="cameraX"
                input-type="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>, </span>
              <CdxTextInput
                v-model="cameraY"
                input-type="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>, </span>
              <CdxTextInput
                v-model="cameraZ"
                input-type="number"
                step="0.1"
                style="min-width: 100px"
              />
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
              <span>{{ t('blockStructureRenderer.cameraSetting.origin') }} (</span>
              <CdxTextInput
                v-model="cameraCenterX"
                input-type="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>, </span>
              <CdxTextInput
                v-model="cameraCenterY"
                input-type="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>, </span>
              <CdxTextInput
                v-model="cameraCenterZ"
                input-type="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>)</span>
            </div>
          </div>
        </div>
        <CdxField v-if="orthographic" style="margin-bottom: 0.5em">
          <CdxTextInput
            id="cameraZoom"
            v-model="cameraZoom"
            input-type="number"
            :min="0.1"
            :max="100"
            step="0.1"
          />
          <template #label>
            {{ t('blockStructureRenderer.cameraZoom') }}
          </template>
        </CdxField>
        <CdxField v-else style="margin-bottom: 0.5em">
          <CdxTextInput
            id="cameraFOV"
            v-model="cameraFOV"
            input-type="number"
            :min="30"
            :max="110"
            step="1"
          />
          <template #label>
            {{ t('blockStructureRenderer.cameraFOV') }}
          </template>
        </CdxField>
        <CdxButton @click="resetCamera">
          {{ t('blockStructureRenderer.resetCamera') }}
        </CdxButton>
      </BsrPopup>
      <BsrPopup :name="t('blockStructureRenderer.optionsExport')" :icon="cdxIconShare">
        <div
          :style="{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '.5rem',
          }"
        >
          <CdxButton @click="saveRenderedImage">
            <CdxIcon :icon="cdxIconCut" />
            {{ t('blockStructureRenderer.saveImage') }}
          </CdxButton>
          <CdxButton @click="saveStructureFile">
            {{ t('blockStructureRenderer.saveStructureFile') }}
          </CdxButton>
          <CdxButton @click="saveLitematic">
            {{ t('blockStructureRenderer.saveLitematic') }}
          </CdxButton>
        </div>
      </BsrPopup>
    </div>
    <div
      v-if="loaded"
      ref="drag-tooltip"
      class="dark"
      style="
        background-color: var(--background-color-base, #fff);
        border: 1px solid var(--border-color-base, #a2a9b1);
        border-radius: 4px;
        padding: 6px;
      "
      :style="{ ...floatingStyles, display: tooltipOpen ? 'block' : 'none' }"
    >
      {{ t('blockStructureRenderer.dragTooltip') }}
    </div>
    <Transition>
      <div
        v-if="loaded && showHelp"
        style="
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          background-color: #000000aa;
          color: white;
          text-align: center;
          padding: 0.5em;
        "
      >
        {{ t('blockStructureRenderer.controlHelp') }}
      </div>
    </Transition>
  </div>
</template>

<style>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
