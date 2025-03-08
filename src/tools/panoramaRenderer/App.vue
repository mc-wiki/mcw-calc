<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconPause, cdxIconPlay } from '@wikimedia/codex-icons'
import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageLink } from '../interactiveMap/processJson'

const props = defineProps<{
  images: string[]
}>()

const { t } = useI18n()

const panoramaImages = ref<THREE.Texture[]>([])
const rendererAvailable = WebGL.isWebGLAvailable()
const renderTarget = ref<HTMLElement | null>(null)
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let controls: OrbitControls

const isAnimating = ref(true)
let autoRotate = true

const rotationSpeed = 0.0005
const rotationRadius = 0.1
let angle = 0

let isTransitioning = false
let transitionStartTime = 0
const transitionDuration = 500
const startPosition = new THREE.Vector3()
const targetPosition = new THREE.Vector3(rotationRadius, 0, 0)
const startTarget = new THREE.Vector3()
const endTarget = new THREE.Vector3(0, 0, 0)

function toggleAnimation() {
  isAnimating.value = !isAnimating.value
  if (controls) {
    controls.autoRotate = isAnimating.value
    autoRotate = isAnimating.value

    if (isAnimating.value) {
      startTransition()
    }
  }
}

function startTransition() {
  startPosition.copy(camera.position)

  const direction = new THREE.Vector3()
  camera.getWorldDirection(direction)

  const xzLength = Math.sqrt(direction.x * direction.x + direction.z * direction.z)
  direction.x /= xzLength
  direction.z /= xzLength

  targetPosition.set(camera.position.x, 0, camera.position.z)

  startTarget.copy(controls.target)
  endTarget.copy(controls.target)
  endTarget.y = controls.target.y

  isTransitioning = true
  transitionStartTime = Date.now()
}

function updateTransition() {
  if (!isTransitioning) return false

  const elapsed = Date.now() - transitionStartTime
  const progress = Math.min(elapsed / transitionDuration, 1)

  const easedProgress = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2

  camera.position.lerpVectors(startPosition, targetPosition, easedProgress)

  controls.target.lerpVectors(startTarget, endTarget, easedProgress)

  controls.update()

  if (progress >= 1) {
    isTransitioning = false
    return false
  }

  return true
}

function loadPanoramaImages() {
  const loader = new THREE.TextureLoader()

  let loadedImages = 0
  props.images.map(getImageLink).forEach((path, index) => {
    loader.load(path, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace

      texture.anisotropy = 16
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = false

      panoramaImages.value[index] = texture
      loadedImages++
      if (loadedImages === 6) {
        createPanoramaScene()
      }
    })
  })
}

function createPanoramaScene() {
  scene = new THREE.Scene()
  const cubeSize = 500
  const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize)

  const textureOrder = [1, 3, 4, 5, 0, 2]

  const materials = textureOrder.map(
    (index) =>
      new THREE.MeshBasicMaterial({
        map: panoramaImages.value[index],
        side: THREE.BackSide,
        toneMapped: false,
      }),
  )

  const cube = new THREE.Mesh(geometry, materials)
  cube.scale.x = -1
  scene.add(cube)
}

function setupRenderer() {
  if (!renderTarget.value) return

  const width = renderTarget.value.clientWidth
  const height = renderTarget.value.clientHeight

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  })

  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping

  renderTarget.value.appendChild(renderer.domElement)

  camera = new THREE.PerspectiveCamera(85, width / height, 0.05, 1000) // High FOV

  camera.position.set(rotationRadius, 0, 0)
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.autoRotate = autoRotate
  controls.autoRotateSpeed = 0.5

  renderTarget.value.addEventListener('mousedown', () => {
    autoRotate = false
    isAnimating.value = false
    controls.autoRotate = false
  })
}

function animate() {
  requestAnimationFrame(animate)
  if (scene && camera && renderer) {
    const isCurrentlyTransitioning = updateTransition()

    if (!isCurrentlyTransitioning) {
      if (controls) {
        controls.update()
      } else if (autoRotate) {
        angle += rotationSpeed
        camera.position.x = Math.sin(angle) * rotationRadius
        camera.position.z = Math.cos(angle) * rotationRadius
        camera.lookAt(new THREE.Vector3(0, 0, 0))
      }
    }

    renderer.render(scene, camera)
  }
}

onMounted(() => {
  if (rendererAvailable && renderTarget.value) {
    setupRenderer()
    loadPanoramaImages()
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
      ref="renderTarget"
      class="renderer-component"
      :style="{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'grab',
      }"
    />
    <div
      style="position: absolute; bottom: 10px; right: 10px; padding: 0.5em; display: flex; gap: 5px"
    >
      <CdxButton
        :icon-label="t(isAnimating ? 'panoramaRenderer.pause' : 'panoramaRenderer.play')"
        @click="toggleAnimation"
      >
        <CdxIcon :icon="isAnimating ? cdxIconPause : cdxIconPlay" />
      </CdxButton>
    </div>
  </div>
</template>
