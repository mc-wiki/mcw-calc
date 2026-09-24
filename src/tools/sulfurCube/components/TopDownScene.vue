<script setup lang="ts">
import type { Vec3 } from '../model/types'
import type { PlanePoint, WorldBounds, WorldToSvgTransform } from '../presentation/types'
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import type { SceneAttackSummary } from './types'
import { CdxButton } from '@wikimedia/codex'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  pointOnProjectedAimAxis,
  rotateAimInTopDownProjection,
} from '../presentation/aimInteraction'
import { createTopDownScenePresentation } from '../presentation/topDown'
import {
  clampPointToBoundsFromOrigin,
  createViewportWorldBounds,
  createWorldToSvgTransform,
  scaleWorldBoundsAroundPoint,
  translateWorldBounds,
} from '../presentation/worldToSvg'
import InfoTooltip from './InfoTooltip.vue'

type ObjectDragKind = 'aim' | 'attacker' | 'cube'
type DragKind = ObjectDragKind | 'camera'
type SceneSize = 'regular' | 'compact'

interface DragState {
  readonly kind: DragKind
  readonly pointerId: number
  readonly startPointer: PlanePoint
  readonly startTarget: PlanePoint
  readonly startBounds: WorldBounds
  readonly transform: WorldToSvgTransform
  readonly attackerEyePosition: Vec3
  readonly normalizedLookDirection: Vec3
}

interface MetricsResizeState {
  readonly pointerId: number
  readonly startPointer: PlanePoint
  readonly startScale: number
}

const props = withDefaults(
  defineProps<{
    evaluation: DiagnosticEvaluation
    sceneSize: SceneSize
    compactEmbed?: boolean
    selectedBlockLabel: string
    selectedArchetypeLabel: string
    selectedBlockSpriteUrl: string | null
    attackSummary?: SceneAttackSummary | null
    floorSurfaceLabel: string
    showHeadingTitle?: boolean
    otherSceneLabel?: string
    inputsInvalid?: boolean
  }>(),
  {
    showHeadingTitle: true,
    compactEmbed: false,
    otherSceneLabel: undefined,
    inputsInvalid: false,
  },
)

const emit = defineEmits<{
  translateAttackerPreservingCubeBearing: [delta: Vec3]
  translateCube: [delta: Vec3]
  updateAimPoint: [point: Vec3]
  showOtherScene: []
}>()

const { t } = useI18n()
const svgElement = ref<SVGSVGElement | null>(null)
const dragState = ref<DragState | null>(null)
const metricsResizeState = ref<MetricsResizeState | null>(null)
const metricsScale = ref(0.65)
const metricsCollapsed = ref(false)
const minimumMetricsScale = 0.4
const maximumMetricsScaleLimit = 1.55
const metricsPanel = { x: 8, y: 8, width: 350 } as const
const viewport = {
  width: 960,
  height: 480,
  padding: { top: 36, right: 44, bottom: 44, left: 48 },
} as const
const initialScene = createTopDownScenePresentation(props.evaluation)
const aimHandleDistance = ref(createInitialAimHandleDistance(initialScene))
const aimInputDistance = computed(() => {
  const { attacker } = props.evaluation.callResult.input.context
  const { aimPoint } = props.evaluation.inputs

  return Math.hypot(
    aimPoint.x - attacker.eyePosition.x,
    aimPoint.y - attacker.eyePosition.y,
    aimPoint.z - attacker.eyePosition.z,
  )
})
const initialTransformScale = createWorldToSvgTransform(initialScene.bounds, viewport).scale
const initialCameraWidth = initialScene.bounds.maxX - initialScene.bounds.minX
const minimumCameraWidth = initialCameraWidth / 4
const maximumCameraWidth = initialCameraWidth * 8
const cameraBounds = shallowRef<WorldBounds>(initialScene.bounds)
const metricsPanelHeight = computed(() => {
  if (props.attackSummary !== null && props.attackSummary !== undefined) {
    return props.compactEmbed ? 201 : 299
  }
  return 151
})
const maximumMetricsScale = computed(() =>
  Math.min(
    maximumMetricsScaleLimit,
    (viewport.height - metricsPanel.y - 6) / metricsPanelHeight.value,
  ),
)
const effectiveMetricsScale = computed(() =>
  Math.min(metricsScale.value, maximumMetricsScale.value),
)
const metricsResizeTransform = computed(() => {
  const handleSize = 16

  if (!props.compactEmbed) {
    return `translate(${metricsPanel.x + metricsPanel.width - handleSize} ${metricsPanel.y + metricsPanelHeight.value - handleSize})`
  }

  const inverseScale = 1 / effectiveMetricsScale.value

  return `translate(${metricsPanel.x + metricsPanel.width - handleSize * inverseScale} ${metricsPanel.y + metricsPanelHeight.value - handleSize * inverseScale}) scale(${inverseScale})`
})
const metricsCollapseTransform = computed(() => {
  const handleSize = 16
  const inverseScale = 1 / effectiveMetricsScale.value

  return `translate(${metricsPanel.x + metricsPanel.width - handleSize * inverseScale} ${metricsPanel.y}) scale(${inverseScale})`
})

function toggleMetricsCollapsed(event: Event): void {
  if (!props.compactEmbed) return

  event.preventDefault()
  event.stopPropagation()
  metricsCollapsed.value = !metricsCollapsed.value
}

function toggleMetricsCollapsedWithKeyboard(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    toggleMetricsCollapsed(event)
  }
}

function createInitialAimHandleDistance(
  scene: ReturnType<typeof createTopDownScenePresentation>,
): number {
  const axis = {
    x: scene.aimArrowEnd.x - scene.attacker.center.x,
    y: scene.aimArrowEnd.y - scene.attacker.center.y,
  }
  const axisLength = Math.hypot(axis.x, axis.y)

  if (axisLength < 1e-9) {
    return 0
  }

  const unitAxis = { x: axis.x / axisLength, y: axis.y / axisLength }
  const projectionFromAttacker = (point: PlanePoint): number =>
    (point.x - scene.attacker.center.x) * unitAxis.x +
    (point.y - scene.attacker.center.y) * unitAxis.y
  const cubeExtentAlongAxis = (scene.cube.width / 2) * (Math.abs(unitAxis.x) + Math.abs(unitAxis.y))
  const clearance = 0.25

  return Math.max(
    axisLength,
    projectionFromAttacker(scene.cube.center) + cubeExtentAlongAxis + clearance,
    projectionFromAttacker(scene.launchEnd) + clearance,
  )
}

const view = computed(() => {
  const scene = createTopDownScenePresentation(props.evaluation)
  const transform = createWorldToSvgTransform(cameraBounds.value, viewport)
  const toSvg = transform.toSvg
  const cubeCenter = toSvg(scene.cube.center)
  const attackerCenter = toSvg(scene.attacker.center)
  const halfCubeWidth = scene.cube.width / 2
  const halfAttackerWidth = scene.attacker.width / 2
  const cubeTopLeft = toSvg({
    x: scene.cube.center.x - halfCubeWidth,
    y: scene.cube.center.y + halfCubeWidth,
  })
  const attackerTopLeft = toSvg({
    x: scene.attacker.center.x - halfAttackerWidth,
    y: scene.attacker.center.y + halfAttackerWidth,
  })
  const zoomFactor = transform.scale / initialTransformScale
  const visual = {
    handleRadius: 3 * zoomFactor,
    hitAreaRadius: Math.max(18, 18 * zoomFactor),
    labelOffset: 12 * zoomFactor,
  }
  const aimHandlePoint = pointOnProjectedAimAxis(
    scene.attacker.center,
    scene.aimArrowEnd,
    aimHandleDistance.value,
  )
  const aimPoint = clampPointToBoundsFromOrigin(attackerCenter, toSvg(aimHandlePoint), {
    minX: visual.handleRadius,
    maxX: viewport.width - visual.handleRadius,
    minY: visual.handleRadius,
    maxY: viewport.height - visual.handleRadius,
  })
  const aimArrowEnd = toSvg(scene.aimArrowEnd)
  const launchEnd = toSvg(scene.launchEnd)
  const launchBodyEnd = {
    x: cubeCenter.x + (launchEnd.x - cubeCenter.x) * 0.9,
    y: cubeCenter.y + (launchEnd.y - cubeCenter.y) * 0.9,
  }
  const feetAxisBeyondCubeEnd = toSvg(scene.feetAxisBeyondCubeEnd)
  const launchOffsetLabelPoint =
    scene.launchOffsetLabelPoint === null ? null : toSvg(scene.launchOffsetLabelPoint)
  const aimErrorLabelPoint =
    scene.aimErrorLabelPoint === null ? null : toSvg(scene.aimErrorLabelPoint)
  const axisXStart = toSvg({ x: cameraBounds.value.minX, y: scene.cube.center.y })
  const axisXEnd = toSvg({ x: cameraBounds.value.maxX, y: scene.cube.center.y })
  const axisZStart = toSvg({ x: scene.cube.center.x, y: cameraBounds.value.minY })
  const axisZEnd = toSvg({ x: scene.cube.center.x, y: cameraBounds.value.maxY })
  const launchLabel = {
    x: launchEnd.x + (launchEnd.x >= cubeCenter.x ? 12 : -12) * zoomFactor,
    y: launchEnd.y - 10 * zoomFactor,
    anchor: launchEnd.x >= cubeCenter.x ? 'start' : 'end',
  }
  const visualStyle = {
    '--topdown-font-size': `${13 * zoomFactor}px`,
    '--topdown-small-font-size': `${11 * zoomFactor}px`,
    '--topdown-stroke-thin': `${1.35 * zoomFactor}px`,
    '--topdown-stroke-regular': `${2 * zoomFactor}px`,
    '--topdown-stroke-bold': `${3.2 * zoomFactor}px`,
    '--topdown-dash': `${6 * zoomFactor}px ${5 * zoomFactor}px`,
  }
  const metrics = {
    x: 18,
    valueX: 198,
    aimErrorY: 26,
    launchOffsetY: 47,
    blockY: 82,
    archetypeY: 103,
    floorY: 138,
    weaponY: 180,
    attackStrengthY: 201,
    sharpnessY: 222,
    knockbackY: 243,
    sprintingY: 264,
    criticalHitY: 285,
    aimErrorDegrees: ((scene.aimErrorRadians * 180) / Math.PI).toFixed(1),
    launchOffsetDegrees: ((scene.launchOffsetRadians * 180) / Math.PI).toFixed(1),
    attackGroupEndY: 285,
    attackDetailX: 32,
    attackDetailValueX: 218,
  }

  return {
    scene,
    transform,
    visual,
    visualStyle,
    cubeCenter,
    attackerCenter,
    aimPoint,
    aimHandlePoint,
    aimArrowEnd,
    launchEnd,
    launchBodyEnd,
    launchLabel,
    feetAxisBeyondCubeEnd,
    aimErrorLabelPoint,
    aimErrorArc: scene.aimErrorArc
      .map(toSvg)
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
    launchOffsetLabelPoint,
    launchOffsetArc: scene.launchOffsetArc
      .map(toSvg)
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
    metrics,
    reachWarning: { x: viewport.width - 18, y: viewport.height - 34 },
    axisXStart,
    axisXEnd,
    axisZStart,
    axisZEnd,
    cubeRect: {
      x: cubeTopLeft.x,
      y: cubeTopLeft.y,
      width: scene.cube.width * transform.scale,
      height: scene.cube.width * transform.scale,
    },
    cubeSprite: {
      x: cubeCenter.x - (scene.cube.width * transform.scale) / 4,
      y: cubeCenter.y - (scene.cube.width * transform.scale) / 4,
      width: (scene.cube.width * transform.scale) / 2,
      height: (scene.cube.width * transform.scale) / 2,
    },
    attackerRect: {
      x: attackerTopLeft.x,
      y: attackerTopLeft.y,
      width: scene.attacker.width * transform.scale,
      height: scene.attacker.width * transform.scale,
    },
  }
})

function keepCentersSeparate(
  candidate: PlanePoint,
  obstacle: PlanePoint,
  minimumDistance: number,
  fallbackDirection: PlanePoint,
): PlanePoint {
  const delta = { x: candidate.x - obstacle.x, y: candidate.y - obstacle.y }
  const distance = Math.hypot(delta.x, delta.y)

  if (distance >= minimumDistance) {
    return candidate
  }

  const fallbackLength = Math.hypot(fallbackDirection.x, fallbackDirection.y)
  const direction =
    distance > 1e-9
      ? { x: delta.x / distance, y: delta.y / distance }
      : fallbackLength > 1e-9
        ? {
            x: fallbackDirection.x / fallbackLength,
            y: fallbackDirection.y / fallbackLength,
          }
        : { x: 0, y: -1 }

  return {
    x: obstacle.x + direction.x * minimumDistance,
    y: obstacle.y + direction.y * minimumDistance,
  }
}

function pointerToSvg(event: MouseEvent): PlanePoint | null {
  const element = svgElement.value

  if (element === null) {
    return null
  }

  const rectangle = element.getBoundingClientRect()

  if (rectangle.width === 0 || rectangle.height === 0) {
    return null
  }

  return {
    x: ((event.clientX - rectangle.left) / rectangle.width) * viewport.width,
    y: ((event.clientY - rectangle.top) / rectangle.height) * viewport.height,
  }
}

function zoomAtSvgPoint(anchorSvg: PlanePoint, requestedFactor: number): void {
  const currentWidth = cameraBounds.value.maxX - cameraBounds.value.minX
  const targetWidth = Math.min(
    maximumCameraWidth,
    Math.max(minimumCameraWidth, currentWidth * requestedFactor),
  )
  const factor = targetWidth / currentWidth

  cameraBounds.value = scaleWorldBoundsAroundPoint(
    cameraBounds.value,
    view.value.transform.toWorld(anchorSvg),
    factor,
  )
}

function zoomCamera(factor: number): void {
  zoomAtSvgPoint({ x: viewport.width / 2, y: viewport.height / 2 }, factor)
}

function zoomWithWheel(event: WheelEvent): void {
  const pointer = pointerToSvg(event)

  if (pointer === null) {
    return
  }

  const deltaUnit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : viewport.height
  const deltaPixels =
    event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? event.deltaY : event.deltaY * deltaUnit
  const exponent = Math.min(0.35, Math.max(-0.35, deltaPixels * 0.0012))

  zoomAtSvgPoint(pointer, Math.exp(exponent))
}

function startDrag(kind: DragKind, event: PointerEvent): void {
  event.preventDefault()
  event.stopPropagation()

  if (event.button !== 0) {
    return
  }

  const pointer = pointerToSvg(event)

  if (pointer === null) {
    return
  }

  const currentView = view.value
  const pointerWorld = currentView.transform.toWorld(pointer)
  let target: PlanePoint

  switch (kind) {
    case 'aim':
      target = currentView.aimHandlePoint
      break
    case 'attacker':
      target = currentView.scene.attacker.center
      break
    case 'cube':
      target = currentView.scene.cube.center
      break
    case 'camera':
      target = pointerWorld
      break
  }

  const targetElement = event.currentTarget as SVGGraphicsElement

  if (kind !== 'camera') {
    targetElement.focus()
  }

  targetElement.setPointerCapture(event.pointerId)
  dragState.value = {
    kind,
    pointerId: event.pointerId,
    startPointer: pointerWorld,
    startTarget: target,
    startBounds: cameraBounds.value,
    transform: currentView.transform,
    attackerEyePosition: { ...props.evaluation.callResult.input.context.attacker.eyePosition },
    normalizedLookDirection: {
      ...props.evaluation.callResult.diagnostics.normalizedLookDirection,
    },
  }
}

function startMetricsResize(event: PointerEvent): void {
  event.preventDefault()
  event.stopPropagation()

  if (event.button !== 0) return

  const pointer = pointerToSvg(event)

  if (pointer === null) return
  ;(event.currentTarget as SVGGraphicsElement).setPointerCapture(event.pointerId)
  metricsResizeState.value = {
    pointerId: event.pointerId,
    startPointer: pointer,
    startScale: effectiveMetricsScale.value,
  }
}

function resizeMetricsWithKeyboard(event: KeyboardEvent): void {
  const direction =
    event.key === 'ArrowUp' || event.key === 'ArrowRight'
      ? 1
      : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
        ? -1
        : 0

  if (direction === 0) return

  metricsScale.value = Math.min(
    maximumMetricsScale.value,
    Math.max(minimumMetricsScale, metricsScale.value + direction * 0.05),
  )
  event.preventDefault()
  event.stopPropagation()
}

function continueDrag(event: PointerEvent): void {
  const resize = metricsResizeState.value

  if (resize?.pointerId === event.pointerId) {
    event.preventDefault()
    event.stopPropagation()
    const pointer = pointerToSvg(event)

    if (pointer !== null) {
      const diagonalDelta =
        (pointer.x - resize.startPointer.x + pointer.y - resize.startPointer.y) /
        (metricsPanel.width + metricsPanelHeight.value)
      metricsScale.value = Math.min(
        maximumMetricsScale.value,
        Math.max(minimumMetricsScale, resize.startScale + diagonalDelta * 2),
      )
    }
    return
  }

  const drag = dragState.value

  if (drag === null || drag.pointerId !== event.pointerId) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  const pointer = pointerToSvg(event)

  if (pointer === null) {
    return
  }

  const pointerWorld = drag.transform.toWorld(pointer)
  const delta = {
    x: pointerWorld.x - drag.startPointer.x,
    y: pointerWorld.y - drag.startPointer.y,
  }

  switch (drag.kind) {
    case 'aim': {
      const target = clampPointToBoundsFromOrigin(
        view.value.scene.attacker.center,
        { x: drag.startTarget.x + delta.x, y: drag.startTarget.y + delta.y },
        createViewportWorldBounds(drag.transform, view.value.visual.handleRadius),
      )
      aimHandleDistance.value = Math.hypot(
        target.x - view.value.scene.attacker.center.x,
        target.y - view.value.scene.attacker.center.y,
      )
      emit(
        'updateAimPoint',
        rotateAimInTopDownProjection(
          drag.attackerEyePosition,
          drag.normalizedLookDirection,
          target,
          aimInputDistance.value,
        ),
      )
      break
    }
    case 'attacker':
    case 'cube': {
      const currentScene = view.value.scene
      const minimumDistance = (currentScene.cube.width + currentScene.attacker.width) / 2
      const movingCenter =
        drag.kind === 'attacker' ? currentScene.attacker.center : currentScene.cube.center
      const obstacleCenter =
        drag.kind === 'attacker' ? currentScene.cube.center : currentScene.attacker.center
      const candidate = { x: movingCenter.x + delta.x, y: movingCenter.y + delta.y }
      const target = keepCentersSeparate(candidate, obstacleCenter, minimumDistance, {
        x: movingCenter.x - obstacleCenter.x,
        y: movingCenter.y - obstacleCenter.y,
      })
      const translation = {
        x: target.x - movingCenter.x,
        y: 0,
        z: target.y - movingCenter.y,
      }

      if (drag.kind === 'attacker') {
        emit('translateAttackerPreservingCubeBearing', translation)
      } else {
        emit('translateCube', translation)
      }
      dragState.value = { ...drag, startPointer: pointerWorld }
      break
    }
    case 'camera':
      cameraBounds.value = translateWorldBounds(drag.startBounds, {
        x: -delta.x,
        y: -delta.y,
      })
      break
  }
}

function endDrag(event: PointerEvent): void {
  if (metricsResizeState.value?.pointerId === event.pointerId) {
    event.preventDefault()
    event.stopPropagation()
    metricsResizeState.value = null
    return
  }

  if (dragState.value?.pointerId === event.pointerId) {
    event.preventDefault()
    event.stopPropagation()
    dragState.value = null
  }
}

function preventPageMotionWhileDragging(event: Event): void {
  if (dragState.value !== null || metricsResizeState.value !== null) {
    event.preventDefault()
  }
}

function keyboardDelta(event: KeyboardEvent): PlanePoint | null {
  const step = event.shiftKey ? 0.05 : 0.25

  switch (event.key) {
    case 'ArrowLeft':
      return { x: -step, y: 0 }
    case 'ArrowRight':
      return { x: step, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: step }
    case 'ArrowDown':
      return { x: 0, y: -step }
    default:
      return null
  }
}

function moveHandle(kind: ObjectDragKind, event: KeyboardEvent): void {
  const delta = keyboardDelta(event)

  if (delta === null) {
    return
  }

  if (kind === 'aim') {
    const scene = view.value.scene
    const visibleAimPoint = view.value.aimHandlePoint
    const target = clampPointToBoundsFromOrigin(
      scene.attacker.center,
      { x: visibleAimPoint.x + delta.x, y: visibleAimPoint.y + delta.y },
      createViewportWorldBounds(view.value.transform, view.value.visual.handleRadius),
    )
    aimHandleDistance.value = Math.hypot(
      target.x - scene.attacker.center.x,
      target.y - scene.attacker.center.y,
    )
    emit(
      'updateAimPoint',
      rotateAimInTopDownProjection(
        props.evaluation.callResult.input.context.attacker.eyePosition,
        props.evaluation.callResult.diagnostics.normalizedLookDirection,
        target,
        aimInputDistance.value,
      ),
    )
  } else {
    const scene = view.value.scene
    const minimumDistance = (scene.cube.width + scene.attacker.width) / 2
    const movingCenter = kind === 'attacker' ? scene.attacker.center : scene.cube.center
    const obstacleCenter = kind === 'attacker' ? scene.cube.center : scene.attacker.center
    const candidate = { x: movingCenter.x + delta.x, y: movingCenter.y + delta.y }
    const target = keepCentersSeparate(candidate, obstacleCenter, minimumDistance, {
      x: movingCenter.x - obstacleCenter.x,
      y: movingCenter.y - obstacleCenter.y,
    })
    const translation = {
      x: target.x - movingCenter.x,
      y: 0,
      z: target.y - movingCenter.y,
    }

    if (kind === 'attacker') {
      emit('translateAttackerPreservingCubeBearing', translation)
    } else {
      emit('translateCube', translation)
    }
  }

  event.preventDefault()
}

function clearHandleFocus(event: PointerEvent): void {
  const target = event.target

  if (target instanceof Element && target.closest('.topdown-interactive-handle') !== null) {
    return
  }

  const activeElement = document.activeElement

  if (
    activeElement instanceof SVGElement &&
    activeElement.classList.contains('topdown-interactive-handle')
  ) {
    activeElement.blur()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', clearHandleFocus)
  document.addEventListener('pointermove', preventPageMotionWhileDragging, {
    capture: true,
    passive: false,
  })
  document.addEventListener('wheel', preventPageMotionWhileDragging, {
    capture: true,
    passive: false,
  })
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', clearHandleFocus)
  document.removeEventListener('pointermove', preventPageMotionWhileDragging, true)
  document.removeEventListener('wheel', preventPageMotionWhileDragging, true)
})
</script>

<template>
  <figure
    class="topdown-figure"
    :class="[`topdown-figure--${sceneSize}`, { 'topdown-figure--compact-embed': compactEmbed }]"
    :aria-labelledby="showHeadingTitle ? 'sulfur-cube-topdown-heading' : undefined"
    :aria-label="showHeadingTitle ? undefined : t('sulfurCube.topDown.title')"
  >
    <div class="topdown-heading">
      <div v-if="showHeadingTitle" class="topdown-heading__title">
        <h3 id="sulfur-cube-topdown-heading">{{ t('sulfurCube.topDown.title') }}</h3>
        <InfoTooltip
          :text="t('sulfurCube.topDown.help')"
          :label="t('sulfurCube.topDown.helpLabel')"
          placement="right"
        />
      </div>
      <p>{{ t('sulfurCube.topDown.subtitle') }}</p>
    </div>

    <div class="topdown-frame">
      <div class="topdown-overlay">
        <CdxButton
          v-if="otherSceneLabel"
          class="compact-scene-switch"
          size="small"
          weight="quiet"
          @click="emit('showOtherScene')"
        >
          {{ otherSceneLabel }}
        </CdxButton>
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="t('sulfurCube.scene.zoomOut')"
          :title="t('sulfurCube.scene.zoomOut')"
          @click="zoomCamera(1.35)"
        >
          −
        </CdxButton>
        <CdxButton
          size="small"
          weight="quiet"
          :aria-label="t('sulfurCube.scene.zoomIn')"
          :title="t('sulfurCube.scene.zoomIn')"
          @click="zoomCamera(0.74)"
        >
          +
        </CdxButton>
      </div>
      <CdxButton
        v-if="compactEmbed && metricsCollapsed"
        class="topdown-metrics-summary-control"
        size="small"
        weight="quiet"
        @click="toggleMetricsCollapsed"
      >
        {{ t('sulfurCube.scene.showInformation') }}
      </CdxButton>
      <svg
        ref="svgElement"
        class="topdown-svg"
        :class="{
          'topdown-svg--panning': dragState?.kind === 'camera',
          'topdown-svg--dragging-object': dragState !== null && dragState.kind !== 'camera',
          'topdown-svg--resizing-metrics': metricsResizeState !== null,
        }"
        :style="view.visualStyle"
        :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
        role="group"
        aria-labelledby="sulfur-cube-topdown-svg-title"
        aria-describedby="sulfur-cube-topdown-svg-description"
        @pointermove.prevent="continueDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @wheel.prevent="zoomWithWheel"
        @dragstart.prevent
      >
        <title id="sulfur-cube-topdown-svg-title">{{ t('sulfurCube.topDown.svgTitle') }}</title>
        <desc id="sulfur-cube-topdown-svg-description">
          {{ t('sulfurCube.topDown.svgDescription') }}
        </desc>

        <defs>
          <marker
            id="topdown-blue-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="marker-blue" d="M 0 0 L 8 3 L 0 6 L 1.6 3 z" />
          </marker>
          <marker
            id="topdown-green-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="marker-green" d="M 0 0 L 8 3 L 0 6 L 1.6 3 z" />
          </marker>
        </defs>

        <rect
          class="topdown-background"
          width="100%"
          height="100%"
          rx="4"
          @pointerdown.prevent="startDrag('camera', $event)"
        />

        <text
          v-if="view.scene.reach.status !== 'within_reach'"
          class="topdown-reach-warning"
          :x="view.reachWarning.x"
          :y="view.reachWarning.y"
          text-anchor="end"
          role="status"
        >
          <template v-if="view.scene.reach.status === 'inside_unpickable_aabb'">
            {{ t('sulfurCube.scene.reachInsideWarning') }}
          </template>
          <template v-else>
            <tspan class="reach-warning-main" :x="view.reachWarning.x">
              {{ t('sulfurCube.scene.reachMissWarningMain') }}
            </tspan>
            <tspan class="reach-warning-detail" :x="view.reachWarning.x" dy="1.25em">
              {{
                t('sulfurCube.scene.reachMissWarningDetail', {
                  scene: t('sulfurCube.scene.otherRadial'),
                })
              }}
            </tspan>
          </template>
        </text>

        <g class="topdown-axes" aria-hidden="true">
          <line
            :x1="view.axisXStart.x"
            :y1="view.axisXStart.y"
            :x2="view.axisXEnd.x"
            :y2="view.axisXEnd.y"
          />
          <line
            :x1="view.axisZStart.x"
            :y1="view.axisZStart.y"
            :x2="view.axisZEnd.x"
            :y2="view.axisZEnd.y"
          />
          <text :x="viewport.width - 12" :y="view.axisXEnd.y - 7" text-anchor="end">+X</text>
          <text :x="view.axisZEnd.x + 8" :y="24">+Z</text>
        </g>

        <line
          class="topdown-feet-axis"
          :x1="view.attackerCenter.x"
          :y1="view.attackerCenter.y"
          :x2="view.feetAxisBeyondCubeEnd.x"
          :y2="view.feetAxisBeyondCubeEnd.y"
        />
        <line
          class="topdown-aim"
          :x1="view.attackerCenter.x"
          :y1="view.attackerCenter.y"
          :x2="view.aimArrowEnd.x"
          :y2="view.aimArrowEnd.y"
          marker-end="url(#topdown-blue-arrow)"
        />
        <polyline v-if="view.aimErrorArc" class="topdown-aim-error" :points="view.aimErrorArc" />
        <text
          v-if="view.aimErrorLabelPoint"
          class="topdown-aim-error-label"
          :x="view.aimErrorLabelPoint.x"
          :y="view.aimErrorLabelPoint.y"
          text-anchor="middle"
        >
          {{ view.metrics.aimErrorDegrees }}°
        </text>
        <polyline
          v-if="view.launchOffsetArc"
          class="topdown-launch-offset"
          :points="view.launchOffsetArc"
        />
        <text
          v-if="view.launchOffsetLabelPoint"
          class="topdown-launch-offset-label"
          :x="view.launchOffsetLabelPoint.x"
          :y="view.launchOffsetLabelPoint.y"
          text-anchor="middle"
        >
          {{ view.metrics.launchOffsetDegrees }}°
        </text>

        <rect
          class="topdown-cube"
          :x="view.cubeRect.x"
          :y="view.cubeRect.y"
          :width="view.cubeRect.width"
          :height="view.cubeRect.height"
        />
        <image
          v-if="selectedBlockSpriteUrl"
          class="topdown-cube-sprite"
          :href="selectedBlockSpriteUrl"
          :x="view.cubeSprite.x"
          :y="view.cubeSprite.y"
          :width="view.cubeSprite.width"
          :height="view.cubeSprite.height"
          preserveAspectRatio="xMidYMid meet"
        />
        <rect
          class="topdown-attacker"
          :x="view.attackerRect.x"
          :y="view.attackerRect.y"
          :width="view.attackerRect.width"
          :height="view.attackerRect.height"
        />

        <line
          class="topdown-launch"
          :x1="view.cubeCenter.x"
          :y1="view.cubeCenter.y"
          :x2="view.launchBodyEnd.x"
          :y2="view.launchBodyEnd.y"
          marker-end="url(#topdown-green-arrow)"
        />
        <text
          class="topdown-launch-label"
          :x="view.launchLabel.x"
          :y="view.launchLabel.y"
          :text-anchor="view.launchLabel.anchor"
        >
          {{ t('sulfurCube.topDown.launchDirection') }}
        </text>

        <g
          class="topdown-interactive-handle topdown-cube-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="t('sulfurCube.topDown.cubeHandleAria')"
          @pointerdown="startDrag('cube', $event)"
          @keydown="moveHandle('cube', $event)"
        >
          <circle
            class="topdown-handle-hit-area"
            :cx="view.cubeCenter.x"
            :cy="view.cubeCenter.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="topdown-handle-marker"
            :cx="view.cubeCenter.x"
            :cy="view.cubeCenter.y"
            :r="view.visual.handleRadius"
          />
        </g>
        <g
          class="topdown-interactive-handle topdown-attacker-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="t('sulfurCube.topDown.attackerHandleAria')"
          @pointerdown="startDrag('attacker', $event)"
          @keydown="moveHandle('attacker', $event)"
        >
          <circle
            class="topdown-handle-hit-area"
            :cx="view.attackerCenter.x"
            :cy="view.attackerCenter.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="topdown-handle-marker"
            :cx="view.attackerCenter.x"
            :cy="view.attackerCenter.y"
            :r="view.visual.handleRadius"
          />
        </g>
        <g
          class="topdown-interactive-handle topdown-aim-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="t('sulfurCube.topDown.aimHandleAria')"
          @pointerdown="startDrag('aim', $event)"
          @keydown="moveHandle('aim', $event)"
        >
          <circle
            class="topdown-handle-hit-area"
            :cx="view.aimPoint.x"
            :cy="view.aimPoint.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="topdown-handle-marker"
            :cx="view.aimPoint.x"
            :cy="view.aimPoint.y"
            :r="view.visual.handleRadius"
          />
          <text
            :x="view.aimPoint.x"
            :y="view.aimPoint.y - view.visual.labelOffset"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.aim') }}
          </text>
        </g>

        <g
          v-if="!metricsCollapsed"
          class="topdown-metrics-panel"
          :transform="`translate(${metricsPanel.x} ${metricsPanel.y}) scale(${effectiveMetricsScale}) translate(${-metricsPanel.x} ${-metricsPanel.y})`"
        >
          <rect
            class="topdown-metrics-panel__background"
            :x="metricsPanel.x"
            :y="metricsPanel.y"
            :width="metricsPanel.width"
            :height="metricsPanelHeight"
            rx="3"
            @pointerdown.stop
            @pointermove.stop
            @wheel.stop
          />
          <g class="topdown-metrics" aria-hidden="true">
            <text :x="view.metrics.x" :y="view.metrics.aimErrorY">
              <tspan>{{ t('sulfurCube.topDown.aimErrorLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.metrics.valueX"
                class="topdown-metric-value topdown-metric-value--aim"
              >
                {{ view.metrics.aimErrorDegrees }}
              </tspan>
              <tspan class="topdown-metric-unit">&#160;°</tspan>
            </text>
            <text :x="view.metrics.x" :y="view.metrics.launchOffsetY">
              <template v-if="view.scene.calls.length === 1">
                <tspan>{{ t('sulfurCube.topDown.launchOffsetSingleCallBeforeMultiply') }}</tspan>
                <tspan class="topdown-multiplication-mark">×</tspan>
                <tspan>
                  {{ t('sulfurCube.topDown.launchOffsetSingleCallAfterMultiply') }}&#160;=&#160;
                </tspan>
              </template>
              <tspan v-else>{{ t('sulfurCube.topDown.launchOffsetLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.metrics.valueX"
                class="topdown-metric-value topdown-metric-value--launch"
              >
                {{ view.metrics.launchOffsetDegrees }}
              </tspan>
              <tspan class="topdown-metric-unit">&#160;°</tspan>
            </text>
            <text :x="view.metrics.x" :y="view.metrics.blockY">
              <tspan>{{ t('sulfurCube.scene.selectedBlockLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.metrics.valueX"
                class="topdown-metric-value topdown-metric-value--cube"
              >
                {{ selectedBlockLabel }}
              </tspan>
            </text>
            <text :x="view.metrics.x" :y="view.metrics.archetypeY">
              <tspan>{{ t('sulfurCube.scene.archetypeLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.metrics.valueX"
                class="topdown-metric-value topdown-metric-value--cube"
              >
                {{ selectedArchetypeLabel }}
              </tspan>
            </text>
            <text :x="view.metrics.x" :y="view.metrics.floorY">
              <tspan>{{ t('sulfurCube.scene.floorSurfaceLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.metrics.valueX"
                class="topdown-metric-value topdown-metric-value--neutral"
              >
                {{ floorSurfaceLabel }}
              </tspan>
            </text>
            <g v-if="attackSummary" class="topdown-attack-metrics">
              <line
                :x1="view.metrics.x - 6"
                :y1="view.metrics.weaponY - 15"
                :x2="view.metrics.x - 6"
                :y2="compactEmbed ? view.metrics.weaponY + 5 : view.metrics.attackGroupEndY + 5"
              />
              <text :x="view.metrics.x" :y="view.metrics.weaponY">
                <tspan>{{ t('sulfurCube.attack.weapon') }}&#160;=&#160;</tspan>
                <tspan
                  :x="view.metrics.valueX"
                  class="topdown-metric-value topdown-metric-value--neutral"
                >
                  {{ attackSummary.weaponLabel }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.metrics.attackDetailX"
                :y="view.metrics.attackStrengthY"
              >
                <tspan>{{ t('sulfurCube.scene.attackStrengthLabel') }}&#160;</tspan>
                <tspan
                  :x="view.metrics.attackDetailValueX"
                  class="topdown-metric-value topdown-metric-value--neutral"
                >
                  {{ attackSummary.attackStrengthPercent.toFixed(1) }}%
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.metrics.attackDetailX"
                :y="view.metrics.sharpnessY"
              >
                <tspan>{{ t('sulfurCube.attack.sharpness') }}&#160;</tspan>
                <tspan
                  :x="view.metrics.attackDetailValueX"
                  class="topdown-metric-value topdown-metric-value--neutral"
                >
                  {{ attackSummary.sharpnessLevel ?? 0 }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.metrics.attackDetailX"
                :y="view.metrics.knockbackY"
              >
                <tspan>{{ t('sulfurCube.attack.knockback') }}&#160;</tspan>
                <tspan
                  :x="view.metrics.attackDetailValueX"
                  class="topdown-metric-value topdown-metric-value--neutral"
                >
                  {{ attackSummary.knockbackLevel ?? 0 }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.metrics.attackDetailX"
                :y="view.metrics.sprintingY"
              >
                <tspan>{{ t('sulfurCube.attack.sprinting') }}&#160;</tspan>
                <tspan
                  :x="view.metrics.attackDetailValueX"
                  class="topdown-metric-value topdown-metric-value--neutral"
                >
                  {{ t(attackSummary.sprinting ? 'sulfurCube.yes' : 'sulfurCube.no') }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.metrics.attackDetailX"
                :y="view.metrics.criticalHitY"
              >
                <tspan>{{ t('sulfurCube.attack.criticalConditions') }}&#160;</tspan>
                <tspan
                  :x="view.metrics.attackDetailValueX"
                  class="topdown-metric-value topdown-metric-value--neutral"
                >
                  {{ t(attackSummary.criticalHit ? 'sulfurCube.yes' : 'sulfurCube.no') }}
                </tspan>
              </text>
            </g>
          </g>
          <g
            v-if="compactEmbed"
            class="topdown-metrics-collapse"
            tabindex="0"
            role="button"
            :aria-label="t('sulfurCube.scene.hideInformation')"
            :transform="metricsCollapseTransform"
            @click="toggleMetricsCollapsed"
            @keydown="toggleMetricsCollapsedWithKeyboard"
          >
            <rect width="16" height="16" rx="2" />
            <path d="M 4 8 H 12" />
          </g>
          <g
            class="topdown-metrics-resize"
            tabindex="0"
            role="slider"
            :aria-label="t('sulfurCube.scene.resizeInformation')"
            :aria-valuemin="minimumMetricsScale"
            :aria-valuemax="maximumMetricsScale"
            :aria-valuenow="effectiveMetricsScale"
            :transform="metricsResizeTransform"
            @pointerdown="startMetricsResize"
            @keydown="resizeMetricsWithKeyboard"
          >
            <rect width="16" height="16" rx="2" />
            <path d="M 5 13 L 13 5 M 9 13 L 13 9 M 13 13 L 13 13" />
          </g>
        </g>

        <g v-if="inputsInvalid" class="topdown-invalid-overlay" role="status">
          <rect width="100%" height="100%" rx="4" />
          <text
            :x="viewport.width / 2"
            :y="viewport.height / 2"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ t('sulfurCube.scene.invalidInputs') }}
          </text>
        </g>
      </svg>
    </div>

    <div class="topdown-legend" aria-hidden="true">
      <span>
        <i class="topdown-swatch topdown-swatch--player" />
        {{ t('sulfurCube.scene.legendPlayer') }}
      </span>
      <span>
        <i class="topdown-swatch topdown-swatch--axis" />
        {{ t('sulfurCube.topDown.playerCubeAxis') }}
      </span>
      <span>
        <i class="topdown-swatch topdown-swatch--cube" />
        {{ t('sulfurCube.scene.legendSulfurCube') }}
      </span>
      <span><i class="topdown-swatch topdown-swatch--aim" />{{ t('sulfurCube.scene.aim') }}</span>
      <span>
        <i class="topdown-swatch topdown-swatch--launch" />
        {{ t('sulfurCube.topDown.launchDirection') }}
      </span>
    </div>

    <figcaption>
      <p class="scene-interaction-help">
        <span>{{ t('sulfurCube.scene.openPointsBefore') }}</span>
        <span class="open-point-example" aria-hidden="true">(<i class="open-point-symbol" />)</span>
        {{ ' ' }}
        <span>{{ t('sulfurCube.scene.openPointsAfter') }}</span>
      </p>
      <details v-if="!compactEmbed" class="projection-details">
        <summary>{{ t('sulfurCube.scene.projectionAdvancedTitle') }}</summary>
        <p>{{ t('sulfurCube.topDown.projectionAdvanced') }}</p>
      </details>
    </figcaption>
  </figure>
</template>

<style scoped>
.topdown-figure {
  --topdown-ink: var(--color-base, #202122);
  --topdown-muted: var(--color-subtle, #54595d);
  --topdown-border: var(--border-color-subtle, #c8ccd1);
  --topdown-background: color-mix(
    in srgb,
    var(--color-base, #202122) 7%,
    var(--background-color-base, #fff)
  );
  --topdown-cube: #f2a900;
  --topdown-aim: #00a3d7;
  --topdown-aim-dark: #007aa3;
  --topdown-launch: #00a000;
  --topdown-adjustment: #d33682;
  --topdown-grab-cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.8' stroke-linejoin='round' d='M8.5 11V5.5a1.5 1.5 0 0 1 3 0V10 4.5a1.5 1.5 0 0 1 3 0V10 6a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v4.5c0 4-2.5 7-6.5 7h-1c-2.6 0-4.2-1.3-5.5-3.4L4.7 13a1.55 1.55 0 0 1 2.5-1.8z'/%3E%3C/svg%3E")
    8 7;
  --topdown-grabbing-cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.8' stroke-linejoin='round' d='M7.5 10.5V7a1.5 1.5 0 0 1 3 0V9 5.5a1.5 1.5 0 0 1 3 0V9 6.5a1.5 1.5 0 0 1 3 0V10 8a1.5 1.5 0 0 1 3 0v5c0 4.2-2.6 7-6.5 7h-1c-2.4 0-4.3-1.4-5.4-3.4l-2-3.4a1.5 1.5 0 0 1 2.5-1.7z'/%3E%3C/svg%3E")
    8 7;
  --topdown-move-cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.5' stroke-linejoin='round' d='M12 1l3 3h-2v6h6V8l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V4H9z'/%3E%3C/svg%3E")
    12 12;
  margin: 0;
}

.topdown-heading {
  width: 100%;
  margin: 0 auto 0.5rem;
}
.topdown-heading h3,
.topdown-heading p,
figcaption p {
  margin: 0;
}
.topdown-heading__title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.topdown-heading p,
figcaption {
  color: var(--topdown-muted);
}
.topdown-frame {
  position: relative;
  width: 100%;
  max-width: 86rem;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--topdown-border);
  border-radius: 4px;
  background: var(--topdown-background);
}
.topdown-figure--compact .topdown-frame,
.topdown-figure--compact .topdown-heading,
.topdown-figure--compact .topdown-legend,
.topdown-figure--compact figcaption {
  width: 100%;
}
.topdown-overlay {
  position: absolute;
  z-index: 1;
  top: 0.25rem;
  right: 0.25rem;
  display: flex;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--topdown-border) 65%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--background-color-base, #fff) 88%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
}
.topdown-overlay :deep(.cdx-button) {
  min-width: var(--compact-scene-control-min-width, 1.75rem);
  padding: 0 var(--compact-scene-control-padding-inline, 0.35rem);
  font-size: var(--compact-scene-control-font-size, 0.875rem);
}
.topdown-overlay :deep(.cdx-button:not(:first-child)) {
  border-left-color: color-mix(in srgb, var(--topdown-border) 70%, transparent);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.topdown-overlay :deep(.cdx-button:not(:last-child)) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.topdown-overlay--reset {
  top: auto;
  right: auto;
  bottom: 0.5rem;
  left: 0.5rem;
}
.topdown-svg {
  display: block;
  width: 100%;
  height: auto;
  border: 0;
  background: var(--topdown-background);
  cursor: var(--topdown-grab-cursor), grab;
  touch-action: none;
  overscroll-behavior: contain;
  user-select: none;
}
.topdown-svg--panning,
.topdown-svg--panning * {
  cursor: var(--topdown-grabbing-cursor), grabbing !important;
}
.topdown-svg--dragging-object,
.topdown-svg--dragging-object * {
  cursor: var(--topdown-move-cursor), move !important;
}

.topdown-svg--resizing-metrics,
.topdown-svg--resizing-metrics * {
  cursor: nwse-resize !important;
}
.topdown-background {
  fill: var(--topdown-background);
}
.topdown-axes {
  pointer-events: none;
}
.topdown-axes line {
  stroke: color-mix(in srgb, var(--topdown-ink) 22%, transparent);
  stroke-width: var(--topdown-stroke-thin);
}
.topdown-axes text {
  fill: var(--topdown-muted);
  font-size: var(--topdown-small-font-size);
}
.topdown-metrics {
  fill: color-mix(in srgb, var(--topdown-muted) 62%, var(--topdown-background));
  font-size: 16px;
  font-weight: 700;
  pointer-events: none;
}

.topdown-metrics-panel__background {
  fill: color-mix(in srgb, var(--topdown-background) 82%, transparent);
  stroke: color-mix(in srgb, var(--topdown-muted) 20%, transparent);
  stroke-width: 1px;
  pointer-events: none;
}

.topdown-metrics-resize {
  cursor: nwse-resize;
  outline: none;
}

.topdown-metrics-resize rect {
  fill: color-mix(in srgb, var(--topdown-background) 88%, transparent);
  stroke: color-mix(in srgb, var(--topdown-muted) 45%, transparent);
  stroke-width: 1px;
}

.topdown-metrics-resize path {
  fill: none;
  stroke: var(--topdown-muted);
  stroke-linecap: round;
  stroke-width: 1.25px;
  pointer-events: none;
}

.topdown-metrics-resize:focus rect {
  stroke: var(--color-progressive, #36c);
  stroke-width: 2px;
}
.topdown-metrics-collapse {
  cursor: pointer;
  outline: none;
}
.topdown-metrics-collapse rect {
  fill: color-mix(in srgb, var(--topdown-background) 88%, transparent);
  stroke: color-mix(in srgb, var(--topdown-muted) 45%, transparent);
  stroke-width: 1px;
}
.topdown-metrics-collapse path {
  fill: none;
  stroke: var(--topdown-muted);
  stroke-linecap: round;
  stroke-width: 1.25px;
  pointer-events: none;
}
.topdown-metrics-collapse:focus rect {
  stroke: var(--color-progressive, #36c);
  stroke-width: 2px;
}
.topdown-metrics-summary-control {
  position: absolute;
  z-index: 2;
  top: 0.5rem;
  left: 0.5rem;
  min-width: var(--compact-scene-summary-min-width, 11rem);
  padding-inline: var(--compact-scene-summary-padding-inline, 0.75rem);
  cursor: pointer;
  font-size: var(--compact-scene-control-font-size, 0.875rem);
  white-space: nowrap;
}
.topdown-attack-metrics > line {
  stroke: color-mix(in srgb, var(--topdown-muted) 36%, transparent);
  stroke-width: 1px;
}
.topdown-metric-value--aim {
  fill: var(--topdown-aim-dark);
}
.topdown-metric-value--launch {
  fill: var(--topdown-launch);
}
.topdown-metric-value--cube {
  fill: var(--topdown-ink);
}
.topdown-metric-value--neutral {
  fill: var(--topdown-ink);
}

.topdown-metric-unit {
  fill: var(--topdown-ink);
}

.topdown-multiplication-mark {
  font-weight: 400;
}

.topdown-invalid-overlay {
  cursor: default;
}

.topdown-invalid-overlay rect {
  fill: var(--topdown-background);
  pointer-events: all;
}

.topdown-invalid-overlay text {
  fill: var(--color-error, #b32424);
  font-size: 20px;
  font-weight: 700;
  pointer-events: none;
}
.topdown-reach-warning {
  fill: var(--color-error, #b32424);
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
}
.reach-warning-main {
  font-weight: 700;
}
.reach-warning-detail {
  font-style: italic;
  font-weight: 400;
}
.topdown-feet-axis {
  stroke: color-mix(in srgb, var(--topdown-ink) 48%, transparent);
  stroke-width: var(--topdown-stroke-thin);
  stroke-dasharray: var(--topdown-dash);
  pointer-events: none;
}
.topdown-aim {
  stroke: var(--topdown-aim);
}
.topdown-aim {
  stroke-width: var(--topdown-stroke-regular);
}
.topdown-aim-error {
  fill: none;
  stroke: var(--topdown-aim);
  stroke-width: var(--topdown-stroke-thin);
  pointer-events: none;
}
.topdown-aim-error-label {
  fill: var(--topdown-aim);
  font-size: var(--topdown-small-font-size);
  pointer-events: none;
}
.topdown-launch-offset {
  fill: none;
  stroke: var(--topdown-launch);
  stroke-width: var(--topdown-stroke-thin);
  pointer-events: none;
}
.topdown-launch-offset-label {
  fill: var(--topdown-launch);
  font-size: var(--topdown-small-font-size);
  pointer-events: none;
}
.topdown-cube {
  fill: var(--topdown-cube);
  stroke: var(--topdown-ink);
  stroke-width: var(--topdown-stroke-thin);
  pointer-events: none;
}
.topdown-attacker {
  fill: color-mix(in srgb, var(--topdown-ink) 9%, transparent);
  stroke: var(--topdown-ink);
  stroke-width: var(--topdown-stroke-regular);
  pointer-events: none;
}
.topdown-cube-sprite {
  image-rendering: pixelated;
  pointer-events: none;
}
.topdown-launch {
  stroke: var(--topdown-launch);
  stroke-width: var(--topdown-stroke-bold);
  pointer-events: none;
}
.topdown-launch-label {
  fill: var(--topdown-launch);
  font-size: var(--topdown-font-size);
  font-weight: 700;
  pointer-events: none;
}
.marker-blue {
  fill: var(--topdown-aim);
}
.marker-green {
  fill: var(--topdown-launch);
}
.topdown-interactive-handle {
  color: var(--topdown-ink);
  cursor: var(--topdown-move-cursor), move;
  outline: none;
}
.topdown-handle-hit-area {
  fill: transparent;
}
.topdown-handle-marker {
  fill: var(--background-color-base, #fff);
  stroke: var(--topdown-ink);
  stroke-width: var(--topdown-stroke-regular);
}
.topdown-cube-handle {
  color: var(--topdown-cube);
}
.topdown-aim-handle {
  color: var(--topdown-aim);
}
.topdown-interactive-handle:focus .topdown-handle-marker {
  fill: #d33;
}
.topdown-interactive-handle text {
  fill: currentColor;
  font-size: var(--topdown-small-font-size);
  font-weight: 700;
  pointer-events: none;
}
.topdown-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  color: var(--topdown-muted);
  font-size: 0.875rem;
  margin: 0.5rem auto 0;
}
.topdown-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.topdown-swatch {
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border: 0;
  border-radius: 50%;
  background: currentcolor;
}
.topdown-swatch--player {
  color: var(--topdown-ink);
}
.topdown-swatch--cube {
  color: var(--topdown-cube);
}
.topdown-swatch--aim {
  color: var(--topdown-aim);
}
.topdown-swatch--axis {
  color: color-mix(in srgb, var(--topdown-ink) 48%, transparent);
}
.topdown-swatch--launch {
  color: var(--topdown-launch);
}
.topdown-figure figcaption {
  width: 100%;
  margin: 0.4rem auto 0;
  color: var(--topdown-muted);
  font-size: 0.875em;
}
.scene-interaction-help {
  display: block;
}
.projection-details summary {
  cursor: pointer;
}
.projection-details p {
  margin-top: 0.25rem;
}
.open-point-example {
  margin-inline: 0.2rem;
  white-space: nowrap;
}
.open-point-symbol {
  display: inline-block;
  box-sizing: border-box;
  width: 0.62em;
  height: 0.62em;
  border: 0.15em solid var(--topdown-ink);
  border-radius: 50%;
  background: var(--background-color-base, #fff);
  vertical-align: -0.05em;
}

.topdown-figure--compact-embed .open-point-symbol {
  width: 0.5em;
  height: 0.5em;
  border-width: 0.12em;
  vertical-align: 0.04em;
}

.topdown-figure--compact-embed .topdown-metrics {
  fill: var(--topdown-ink);
  font-weight: 500;
  text-rendering: optimizeLegibility;
}

.topdown-figure--compact-embed .topdown-metrics-panel__background {
  cursor: default;
  pointer-events: all;
}

.topdown-figure--compact-embed .topdown-metric-value,
.topdown-figure--compact-embed .topdown-metric-unit {
  font-weight: 700;
}

:global(.dark .topdown-figure) {
  --topdown-cube: #ffd84d;
  --topdown-aim: #62d6ff;
  --topdown-aim-dark: #9be6ff;
  --topdown-launch: #33d13f;
  --topdown-adjustment: #ff6bb3;
}

@media (max-width: 40rem) {
  .topdown-frame,
  .topdown-heading,
  .topdown-legend,
  .topdown-figure figcaption {
    width: 100%;
  }
}

@container sulfur-cube-compact (max-width: 20rem) {
  .topdown-metrics-summary-control {
    top: 2.5rem;
  }
}
</style>
