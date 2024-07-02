<script setup lang="ts">
import { computed, onMounted, onUpdated, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import {
  CdxCheckbox,
  CdxTextInput,
  CdxSelect,
  CdxButton,
  CdxIcon,
  CdxField,
} from '@wikimedia/codex'
import { cdxIconImage, cdxIconCamera, cdxIconShare, cdxIconCut } from '@wikimedia/codex-icons'
import { BlockStateModelManager } from '@/tools/blockStructureRenderer/model.ts'
import {
  bakeBlockMarkers,
  bakeBlockModelRenderLayer,
  bakeFluidRenderLayer,
  bakeInvisibleBlocks,
  BlockStructure,
  NameMapping,
} from '@/tools/blockStructureRenderer/renderer.ts'
import { MaterialPicker } from '@/tools/blockStructureRenderer/texture.ts'
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { saveAsLitematic, saveAsStructureFile } from '@/tools/blockStructureRenderer/structure.ts'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { type VirtualElement, flip, offset, shift, useFloating } from '@floating-ui/vue'
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
const renderTarget = ref()
const loaded = ref(false)
const locked = ref(false)

const lockTooltip = ref()
const virtualEl = ref<VirtualElement>({
  getBoundingClientRect() {
    return {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }
  },
  contextElement: renderTarget.value,
})

const tooltipOpen = ref(false)
const { floatingStyles, update } = useFloating(virtualEl, lockTooltip, {
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

document.addEventListener('mousemove', (event) => {
  if (!locked.value) {
    virtualEl.value.getBoundingClientRect = () => {
      const x = Math.min(
        Math.max(event.clientX, renderTarget.value.getBoundingClientRect().left),
        renderTarget.value.getBoundingClientRect().right,
      )
      const y = Math.min(
        Math.max(event.clientY, renderTarget.value.getBoundingClientRect().top),
        renderTarget.value.getBoundingClientRect().bottom,
      )
      return {
        width: 0,
        height: 0,
        x,
        y,
        top: y,
        left: x,
        right: x,
        bottom: y,
      }
    }
    update()
  }
})

const showHelp = ref(false)

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
  t('blockStructureRenderer.cameraSetting.wasd'),
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
const cameraFOV = ref(70)
const cameraZoom = ref(1)

const requireReBake = ref(false)

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

controls.addEventListener('lock', () => {
  locked.value = true
  tooltipOpen.value = false
  showHelp.value = true

  setTimeout(() => {
    showHelp.value = false
  }, 4000)
})
controls.addEventListener('unlock', () => {
  locked.value = false
  tooltipOpen.value = true
  showHelp.value = false
})

renderer.domElement.addEventListener('click', () => {
  if (isCameraPointerLockControl()) controls.lock()
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
  event.preventDefault()
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

renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault()
  if (orthographic.value) cameraZoom.value -= event.deltaY * 0.0001
  else cameraFOV.value += event.deltaY * 0.01
  updateFOVAndZoom()
})

// Material and model setup ------------------------------------------------------------------------

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
  requireReBake.value = true
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
const defaultCameraAngles = parseAngles(props.cameraPosData[1]) ?? [-45, 0]

if (rendererAvailable) {
  yRangeMax.value = blockStructure.y - 1
  resetCamera()
  updateFOVAndZoom()
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

function isCameraPointerLockControl() {
  return cameraSettingModeStr.findIndex((str) => str === cameraSettingMode.value) === 0
}

function onCameraSettingModeChanged() {
  if (!isCameraPointerLockControl()) {
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

function updateFOVAndZoom() {
  if (orthographic.value) {
    cameraZoom.value = Math.max(0.1, cameraZoom.value)
    orthographicCamera.zoom = cameraZoom.value
    orthographicCamera.updateProjectionMatrix()
  } else {
    cameraFOV.value = Math.min(110, Math.max(30, cameraFOV.value))
    perspectiveCamera.fov = cameraFOV.value
    perspectiveCamera.updateProjectionMatrix()
  }
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

async function saveStructureFile() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.nbt')
  const blob = new Blob([await saveAsStructureFile(blockStructure, nameMapping)])
  let url = URL.createObjectURL(blob)
  downloadLink.setAttribute('href', url)
  downloadLink.click()
}

async function saveLitematic() {
  const downloadLink = document.createElement('a')
  downloadLink.setAttribute('download', 'block_structure.litematic')
  const blob = new Blob([await saveAsLitematic(blockStructure, nameMapping)])
  let url = URL.createObjectURL(blob)
  downloadLink.setAttribute('href', url)
  downloadLink.click()
}

// Main render loop --------------------------------------------------------------------------------
const lastTime = ref(Date.now())

function animate() {
  requestAnimationFrame(animate)

  // Check if the render target is visible
  if (renderTarget.value.offsetParent === null) {
    if (requireReBake.value) return
    requireReBake.value = true
    clearScene()
    return
  }
  if (requireReBake.value) {
    reBakeRenderLayers()
    requireReBake.value = false
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
    :style="{
      height: '60vw',
      width: 'max(60%, 60vw)',
      position: 'relative',
    }"
  >
    <div
      class="renderer-component"
      :style="{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: locked ? 'none' : isCameraPointerLockControl() ? 'pointer' : 'auto',
      }"
      ref="renderTarget"
      @mouseenter="tooltipOpen = isCameraPointerLockControl()"
      @mouseleave="tooltipOpen = false"
    />
    <div
      v-if="loaded"
      style="position: absolute; bottom: 0; right: 0; padding: 0.5em; display: flex; gap: 5px"
    >
      <BsrPopup :name="t('blockStructureRenderer.optionsScene')" :icon="cdxIconImage">
        <cdx-checkbox v-model="animatedTexture">
          {{ t('blockStructureRenderer.animatedTexture') }}
        </cdx-checkbox>
        <cdx-checkbox v-model="invisibleBlocks" @change="requireReBake = true">
          {{ t('blockStructureRenderer.renderInvisibleBlocks') }}
        </cdx-checkbox>
        <cdx-checkbox
          v-if="blockStructure.hasMarks()"
          v-model="displayMarks"
          @change="requireReBake = true"
        >
          {{ t('blockStructureRenderer.renderMarks') }}
        </cdx-checkbox>

        <cdx-field>
          <input
            type="color"
            v-model="backgroundColor"
            id="colorPicker"
            @change="changeBackgroundColor"
          />
          <template #label>{{ t('blockStructureRenderer.backgroundColor') }}</template>
        </cdx-field>
        <cdx-field>
          <cdx-text-input
            id="backgroundAlpha"
            v-model="backgroundAlpha"
            inputType="number"
            :min="0"
            :max="255"
            step="1"
            @input="changeBackgroundColor"
          />

          <template #label>{{ t('blockStructureRenderer.backgroundAlpha') }}</template>
        </cdx-field>

        <cdx-field>
          <cdx-select
            id="displayMode"
            v-model:selected="displayMode"
            :menu-items="displayModes"
            :style="{
              width: 'fit-content',
            }"
            @update:selected="onDisplayModeChanged"
          />

          <template #label>{{ t('blockStructureRenderer.displayMode') }}</template>
        </cdx-field>
        <cdx-field v-if="displayMode !== displayModeStr[0]">
          <template #label>{{ t('blockStructureRenderer.renderRange') }}</template>
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
            <cdx-text-input
              v-if="displayMode === displayModeStr[1]"
              v-model="yRangeMin"
              style="min-width: 100px"
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
              style="min-width: 100px"
              inputType="number"
              :min="Math.min(yRangeMin, blockStructure.y - 1)"
              :max="blockStructure.y - 1"
              step="1"
              @input="onDisplayModeChanged"
            />
            <cdx-text-input
              v-if="displayMode === displayModeStr[2]"
              v-model="ySelected"
              style="min-width: 100px"
              inputType="number"
              min="0"
              :max="blockStructure.y - 1"
              step="1"
              @input="onDisplayModeChanged"
            />
          </div>
        </cdx-field>
      </BsrPopup>
      <BsrPopup :name="t('blockStructureRenderer.optionsCamera')" :icon="cdxIconCamera">
        <cdx-checkbox v-model="orthographic" @change="onCameraChanged">
          {{ t('blockStructureRenderer.orthographic') }}
        </cdx-checkbox>
        <div
          :style="{
            display: 'flex',
            flexDirection: 'column',
            flexWrap: 'wrap',
            gap: '.5rem',
            width: 'max-content',
          }"
        >
          <cdx-field>
            <div style="display: flex; gap: 5px">
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

            <template #label>{{ t('blockStructureRenderer.cameraSetting') }}</template>
          </cdx-field>
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
              <cdx-text-input
                v-model="cameraX"
                inputType="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>, </span>
              <cdx-text-input
                v-model="cameraY"
                inputType="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>, </span>
              <cdx-text-input
                v-model="cameraZ"
                inputType="number"
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
              <span>{{ t('blockStructureRenderer.cameraSetting.pose') }} (</span>
              <cdx-text-input
                v-model="cameraPitch"
                inputType="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>, </span>
              <cdx-text-input
                v-model="cameraYaw"
                inputType="number"
                step="0.1"
                style="min-width: 100px"
              />
              <span>)</span>
            </div>
          </div>
        </div>
        <cdx-field v-if="orthographic" style="margin-bottom: 0.5em">
          <cdx-text-input
            id="cameraZoom"
            v-model="cameraZoom"
            inputType="number"
            :min="0.1"
            :max="100"
            step="0.1"
            @input="updateFOVAndZoom"
          />
          <template #label>{{ t('blockStructureRenderer.cameraZoom') }}</template>
        </cdx-field>
        <cdx-field v-else style="margin-bottom: 0.5em">
          <cdx-text-input
            id="cameraFOV"
            v-model="cameraFOV"
            inputType="number"
            :min="10"
            :max="120"
            step="1"
            @input="updateFOVAndZoom"
          />
          <template #label>{{ t('blockStructureRenderer.cameraFOV') }}</template>
        </cdx-field>
        <cdx-button @click="resetCamera">{{ t('blockStructureRenderer.resetCamera') }}</cdx-button>
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
          <cdx-button @click="saveRenderedImage">
            <cdx-icon :icon="cdxIconCut" />
            {{ t('blockStructureRenderer.saveImage') }}
          </cdx-button>
          <cdx-button @click="saveStructureFile">
            {{ t('blockStructureRenderer.saveStructureFile') }}
          </cdx-button>
          <cdx-button @click="saveLitematic">
            {{ t('blockStructureRenderer.saveLitematic') }}
          </cdx-button>
        </div>
      </BsrPopup>
    </div>
    <div
      v-if="loaded"
      class="dark"
      style="
        background-color: var(--background-color-base, #fff);
        border: 1px solid var(--border-color-base, #a2a9b1);
        border-radius: 4px;
        padding: 6px;
      "
      ref="lockTooltip"
      :style="{ ...floatingStyles, display: tooltipOpen ? 'block' : 'none' }"
    >
      {{ t('blockStructureRenderer.lockTooltip') }}
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
