<script setup lang="ts">
import type { Vec3 } from '../model/types'
import type { RadialAttackerSide } from '../presentation/radialPlane'
import type {
  PlanePoint,
  RadialProjection,
  WorldBounds,
  WorldToSvgTransform,
} from '../presentation/types'
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import type { RadialSceneDisplayOptions, SceneAttackSummary } from './types'
import { CdxButton } from '@wikimedia/codex'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  pointOnProjectedAimAxis,
  rotateAimInRadialProjection,
} from '../presentation/aimInteraction'
import { createTopDownScenePresentation } from '../presentation/topDown'
import {
  createRadialScenePresentation,
  maximumRenderedTrajectoryTicks,
} from '../presentation/verticalScene'
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
  readonly startPointer: { readonly x: number; readonly y: number }
  readonly startTarget: { readonly x: number; readonly y: number }
  readonly startBounds: WorldBounds
  readonly attackerEyePosition: Vec3
  readonly normalizedLookDirection: Vec3
  readonly projection: RadialProjection
  readonly transform: WorldToSvgTransform
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
    initialZoomSteps?: number
    showAimQLabel?: boolean
    showComparisonHelp?: boolean
    showHeadingTitle?: boolean
    showSizeControl?: boolean
    selectedBlockLabel: string
    selectedArchetypeLabel: string
    selectedBlockSpriteUrl: string | null
    attackSummary?: SceneAttackSummary | null
    floorSurfaceLabel: string
    floorSurfaceSpriteUrl: string
    displayOptions: RadialSceneDisplayOptions
    trajectoryTickLimit?: number
    inputsInvalid?: boolean
    otherSceneLabel?: string
  }>(),
  {
    initialZoomSteps: 0,
    compactEmbed: false,
    showAimQLabel: true,
    showComparisonHelp: true,
    showHeadingTitle: true,
    showSizeControl: true,
    trajectoryTickLimit: maximumRenderedTrajectoryTicks,
    inputsInvalid: false,
    otherSceneLabel: undefined,
  },
)

const emit = defineEmits<{
  translateAttacker: [delta: Vec3]
  translateCube: [delta: Vec3]
  'update:sceneSize': [size: SceneSize]
  updateAimPoint: [point: Vec3]
  showOtherScene: []
}>()

const { t } = useI18n()
const floorPatternId = `sulfur-cube-floor-${useId().replace(/:/g, '-')}`
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
  padding: { top: 36, right: 44, bottom: 46, left: 48 },
} as const
const initialScene = createRadialScenePresentation(props.evaluation, undefined, {
  trajectoryTickLimit: props.trajectoryTickLimit,
})
const aimHandleDistance = ref(
  Math.hypot(
    initialScene.aimArrowEnd.x - initialScene.attackerEyes.x,
    initialScene.aimArrowEnd.y - initialScene.attackerEyes.y,
  ),
)
const aimInputDistance = computed(() => {
  const { attacker } = props.evaluation.callResult.input.context
  const { aimPoint } = props.evaluation.inputs

  return Math.hypot(
    aimPoint.x - attacker.eyePosition.x,
    aimPoint.y - attacker.eyePosition.y,
    aimPoint.z - attacker.eyePosition.z,
  )
})
const attackerSide = ref<RadialAttackerSide>(-1)
const fallbackHorizontalAxis = shallowRef(initialScene.projection.horizontalAxis)
const initialTransformScale = createWorldToSvgTransform(initialScene.bounds, viewport).scale
const initialCameraWidth = initialScene.bounds.maxX - initialScene.bounds.minX
const minimumCameraWidth = initialCameraWidth / 4
const maximumCameraWidth = initialCameraWidth * 8
const initialCameraCenter = {
  x: (initialScene.bounds.minX + initialScene.bounds.maxX) / 2,
  y: (initialScene.bounds.minY + initialScene.bounds.maxY) / 2,
}
const initialZoomFactor = 0.74 ** props.initialZoomSteps
const cameraBounds = shallowRef<WorldBounds>(
  scaleWorldBoundsAroundPoint(initialScene.bounds, initialCameraCenter, initialZoomFactor),
)
const nextSceneSize = computed(() => (props.sceneSize === 'regular' ? 'compact' : 'regular'))
const sceneSizeButtonLabel = computed(() =>
  props.sceneSize === 'regular'
    ? t('sulfurCube.scene.switchToCompact')
    : t('sulfurCube.scene.switchToRegular'),
)
const compactHorizontalDeviationRadians = computed(() =>
  props.compactEmbed ? createTopDownScenePresentation(props.evaluation).launchOffsetRadians : 0,
)
const compactHorizontalDeviationDegrees = computed(
  () => (compactHorizontalDeviationRadians.value * 180) / Math.PI,
)
const showCompactHorizontalDeviation = computed(
  () => Math.abs(compactHorizontalDeviationDegrees.value) >= 0.05,
)
const sceneTitle = computed(() =>
  props.compactEmbed ? t('sulfurCube.scene.compactTitle') : t('sulfurCube.scene.title'),
)
const metricsPanelHeight = computed(() => {
  const horizontalDeviationOffset = showCompactHorizontalDeviation.value ? 21 : 0
  const compactDistanceGap = props.compactEmbed ? 21 : 0

  if (props.attackSummary !== null && props.attackSummary !== undefined) {
    return props.compactEmbed ? 278 + horizontalDeviationOffset + compactDistanceGap : 375
  }
  return props.compactEmbed ? 235 + horizontalDeviationOffset + compactDistanceGap : 235
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

const view = computed(() => {
  const scene = createRadialScenePresentation(props.evaluation, undefined, {
    attackerSide: attackerSide.value,
    fallbackHorizontalAxis: fallbackHorizontalAxis.value,
    trajectoryTickLimit: props.trajectoryTickLimit,
  })
  const transform = createWorldToSvgTransform(cameraBounds.value, viewport)
  const toSvg = transform.toSvg
  const halfCubeWidth = scene.cube.width / 2
  const cubeTopLeft = toSvg({ x: scene.cube.feet.x - halfCubeWidth, y: scene.cube.top.y })
  const attackerHitboxTopLeft = toSvg({
    x: scene.attackerHitbox.bottomLeft.x,
    y: scene.attackerHitbox.topRight.y,
  })
  const launchStart = toSvg(scene.cube.feet)
  const launchEnd = toSvg(scene.launchEnd)
  const launchBodyEnd = {
    x: launchStart.x + (launchEnd.x - launchStart.x) * 0.94,
    y: launchStart.y + (launchEnd.y - launchStart.y) * 0.94,
  }
  const attackerFeet = toSvg(scene.attackerFeet)
  const attackerEyes = toSvg(scene.attackerEyes)
  const aimHandlePoint = pointOnProjectedAimAxis(
    scene.attackerEyes,
    scene.aimArrowEnd,
    aimHandleDistance.value,
  )
  const unclampedAimPoint = toSvg(aimHandlePoint)
  const aimArrowEnd = toSvg(scene.aimArrowEnd)
  const cubeFeet = toSvg(scene.cube.feet)
  const cubeCenter = toSvg(scene.cube.center)
  const cubeTop = toSvg(scene.cube.top)
  const cubeBottom = toSvg(scene.cube.bottom)
  const horizontalFeetReference = toSvg(scene.horizontalFeetReference)
  const floorWorldMinimumX =
    Math.floor(Math.min(scene.cubeFeetLineStart.x, scene.cubeFeetLineEnd.x)) - 1
  const floorWorldMaximumX =
    Math.ceil(Math.max(scene.cubeFeetLineStart.x, scene.cubeFeetLineEnd.x)) + 1
  const floorStart = toSvg({ x: floorWorldMinimumX, y: scene.cubeFeetLineStart.y })
  const floorEnd = toSvg({ x: floorWorldMaximumX, y: scene.cubeFeetLineEnd.y })
  const trajectory = scene.trajectory.map((sample) => ({
    tick: sample.tick,
    point: toSvg(sample.point),
    floorCollision: sample.floorCollision,
    arcNumber: sample.arcNumber,
  }))
  const finalTrajectoryTick = trajectory.length === 0 ? 0 : trajectory[trajectory.length - 1]!.tick
  const trajectoryTicks = trajectory.filter(
    (sample) => sample.tick > 0 && sample.tick !== finalTrajectoryTick,
  )
  const thetaLabel = toSvg(scene.thetaLabelPoint)
  const thetaArcPoints = scene.thetaArc.map((point) => toSvg(point))
  const launchElevationLabel =
    scene.launchElevationLabelPoint === null ? null : toSvg(scene.launchElevationLabelPoint)
  const launchElevationArcPoints = scene.launchElevationArc.map((point) => toSvg(point))
  const trajectoryEndMarker =
    scene.trajectoryEndMarker === null ? null : toSvg(scene.trajectoryEndMarker)
  const zoomFactor = transform.scale / initialTransformScale
  const visual = {
    handleRadius: 3 * zoomFactor,
    aimPointRadius: 3 * zoomFactor,
    cubeCornerRadius: 0,
    cubeCenterRadius: 3 * zoomFactor,
    cubeEndpointRadius: 1.6 * zoomFactor,
    eyePointRadius: 2.5 * zoomFactor,
    feetPointRadius: 3 * zoomFactor,
    hitAreaRadius: Math.max(18, 18 * zoomFactor),
    labelOffset: 10 * zoomFactor,
    aimLabelOffsetX: 10 * zoomFactor,
    aimLabelOffsetY: 27 * zoomFactor,
    aimQLabelOffsetY: 13 * zoomFactor,
    eyesLabelOffset: 11 * zoomFactor,
    feetLabelOffset: 18 * zoomFactor,
    launchLabelOffset: 18 * zoomFactor,
    trajectoryPointRadius: 2.25,
    trajectoryEndArm: 5,
    floorTileSize: transform.scale,
    thetaSquareSize: 10 * zoomFactor,
    launchArrowWidth: Math.max(0.001, scene.launchDisplayLength * transform.scale * 0.18),
    launchArrowHeight: Math.max(0.001, scene.launchDisplayLength * transform.scale * 0.135),
    launchStrokeWidth: Math.max(0.001, scene.launchDisplayLength * transform.scale * 0.04),
  }
  const aimPoint = clampPointToBoundsFromOrigin(attackerEyes, unclampedAimPoint, {
    minX: visual.aimPointRadius,
    maxX: viewport.width - visual.aimPointRadius,
    minY: visual.aimPointRadius,
    maxY: viewport.height - visual.aimPointRadius,
  })
  const aimQLabel = {
    x: aimPoint.x,
    y: aimPoint.y - visual.aimQLabelOffsetY,
  }
  const launchLabel = {
    x: launchEnd.x + (launchEnd.x >= launchStart.x ? 18 : -18) * zoomFactor,
    y: launchEnd.y - visual.launchLabelOffset,
  }
  const launchValueLabel =
    scene.launchDisplayLength <= 0
      ? null
      : {
          x: launchLabel.x,
          y: launchLabel.y + 13 * zoomFactor,
          value: (props.evaluation.launchSummary.totalSpeed * 20).toFixed(2),
        }
  const horizontalDeviationOffset = showCompactHorizontalDeviation.value ? 21 : 0
  const compactDistanceGap = props.compactEmbed ? 21 : 0
  const compactFollowingMetricsOffset = horizontalDeviationOffset + compactDistanceGap
  const sceneMetrics = {
    x: 18,
    valueX: 168,
    speedY: 26,
    launchElevationY: 47,
    horizontalDeviationY: 68,
    distanceY: 68 + compactFollowingMetricsOffset,
    firstBounceY: 89 + compactFollowingMetricsOffset,
    qY: 110 + compactFollowingMetricsOffset,
    thetaY: 131 + compactFollowingMetricsOffset,
    blockY: 166 + compactFollowingMetricsOffset,
    archetypeY: 187 + compactFollowingMetricsOffset,
    floorY: 222 + compactFollowingMetricsOffset,
    weaponY: 257 + compactFollowingMetricsOffset,
    attackStrengthY: 278 + compactFollowingMetricsOffset,
    sharpnessY: 299 + compactFollowingMetricsOffset,
    knockbackY: 320 + compactFollowingMetricsOffset,
    sprintingY: 341 + compactFollowingMetricsOffset,
    criticalHitY: 362 + compactFollowingMetricsOffset,
    speed: (props.evaluation.launchSummary.totalSpeed * 20).toFixed(2),
    distance: props.evaluation.trajectory.horizontalDisplacement.toFixed(2),
    firstBounce:
      scene.firstBounce.status === 'reached'
        ? scene.firstBounce.horizontalDistance.toFixed(2)
        : t(`sulfurCube.scene.firstBounceStatus.${scene.firstBounce.status}`),
    firstBounceReached: scene.firstBounce.status === 'reached',
    q: props.evaluation.callResult.diagnostics.q.toFixed(2),
    theta: ((props.evaluation.callResult.diagnostics.theta * 180) / Math.PI).toFixed(1),
    launchElevation: ((scene.launchElevationRadians * 180) / Math.PI).toFixed(1),
    horizontalDeviation: compactHorizontalDeviationDegrees.value.toFixed(1),
    horizontalDeviationVisible: showCompactHorizontalDeviation.value,
    attackGroupEndY: 362 + compactFollowingMetricsOffset,
    attackDetailX: 32,
    attackDetailValueX: 190,
  }
  const sceneWallBounds = {
    minX: visual.aimPointRadius,
    maxX: viewport.width - visual.aimPointRadius,
    minY: visual.aimPointRadius,
    maxY: viewport.height - visual.aimPointRadius,
  }
  const createGroundLabel = (
    point: PlanePoint,
    nameKey: 'sulfurCube.scene.firstBounceGroundMetric' | 'sulfurCube.scene.distanceGroundMetric',
    value: string,
    verticalOffset: number,
  ) => {
    const actualMarker = toSvg(point)
    const boundedOnLeft = actualMarker.x < sceneWallBounds.minX
    const boundedOnRight = actualMarker.x > sceneWallBounds.maxX
    const boundedOnTop = actualMarker.y < sceneWallBounds.minY
    const boundedOnBottom = actualMarker.y > sceneWallBounds.maxY
    const marker = {
      x: Math.min(sceneWallBounds.maxX, Math.max(sceneWallBounds.minX, actualMarker.x)),
      y: Math.min(sceneWallBounds.maxY, Math.max(sceneWallBounds.minY, actualMarker.y)),
    }

    if (boundedOnLeft || boundedOnRight) {
      const x = boundedOnLeft ? 66 : viewport.width - 66
      const labelY = Math.min(viewport.height - 16, Math.max(18, marker.y + verticalOffset))

      return {
        marker,
        x,
        y: labelY,
        anchor: boundedOnLeft ? ('start' as const) : ('end' as const),
        arrow: boundedOnLeft
          ? { x1: x - 7, y1: labelY - 4, x2: 7, y2: labelY - 4 }
          : { x1: x + 7, y1: labelY - 4, x2: viewport.width - 7, y2: labelY - 4 },
        value: t(nameKey, { value }),
      }
    }

    const labelY = boundedOnTop
      ? Math.min(viewport.height - 16, marker.y + verticalOffset)
      : boundedOnBottom
        ? Math.max(18, marker.y - verticalOffset / 2)
        : Math.min(viewport.height - 16, marker.y + verticalOffset)

    const anchor =
      marker.x < 72
        ? ('start' as const)
        : marker.x > viewport.width - 72
          ? ('end' as const)
          : ('middle' as const)

    return {
      marker,
      x: marker.x,
      y: labelY,
      anchor,
      arrow: {
        x1: marker.x,
        y1: boundedOnBottom ? labelY + 7 : labelY - 10,
        x2: marker.x,
        y2: boundedOnBottom ? marker.y - 7 : marker.y + 7,
      },
      value: t('sulfurCube.scene.groundDistanceValue', { value }),
    }
  }
  const firstBounceGroundLabel =
    scene.firstBounce.status === 'reached'
      ? createGroundLabel(
          scene.firstBounce.point,
          'sulfurCube.scene.firstBounceGroundMetric',
          scene.firstBounce.horizontalDistance.toFixed(2),
          34,
        )
      : null
  const distanceGroundLabel = createGroundLabel(
    scene.trajectoryDistance.point,
    'sulfurCube.scene.distanceGroundMetric',
    scene.trajectoryDistance.horizontalDistance.toFixed(2),
    firstBounceGroundLabel === null ? 34 : 64,
  )
  const thetaSquareHorizontalSign = Math.sign(attackerFeet.x - horizontalFeetReference.x) || -1
  const thetaSquareVerticalSign = Math.sign(cubeFeet.y - horizontalFeetReference.y) || -1
  const thetaSquareCorner = {
    x: horizontalFeetReference.x + thetaSquareHorizontalSign * visual.thetaSquareSize,
    y: horizontalFeetReference.y,
  }
  const thetaSquarePath = `M ${thetaSquareCorner.x} ${thetaSquareCorner.y} V ${
    horizontalFeetReference.y + thetaSquareVerticalSign * visual.thetaSquareSize
  } H ${horizontalFeetReference.x}`
  const visualStyle = {
    '--scene-font-size': `${14 * zoomFactor}px`,
    '--scene-mobile-font-size': `${16 * zoomFactor}px`,
    '--scene-minor-font-size': `${12 * zoomFactor}px`,
    '--scene-small-label-font-size': `${10 * zoomFactor}px`,
    '--scene-stroke-thinnest': `${1.25 * zoomFactor}px`,
    '--scene-stroke-thin': `${1.5 * zoomFactor}px`,
    '--scene-stroke-regular': `${2 * zoomFactor}px`,
    '--scene-stroke-medium': `${3 * zoomFactor}px`,
    '--scene-stroke-bold': `${4 * zoomFactor}px`,
    '--scene-dash-theta': `${6 * zoomFactor}px ${5 * zoomFactor}px`,
    '--scene-dash-aim': `${5 * zoomFactor}px ${5 * zoomFactor}px`,
    '--scene-dash-trajectory': `${7 * zoomFactor}px ${5 * zoomFactor}px`,
  }

  return {
    scene,
    transform,
    cubeRect: {
      x: cubeTopLeft.x,
      y: cubeTopLeft.y,
      width: scene.cube.width * transform.scale,
      height: scene.cube.height * transform.scale,
    },
    cubeSprite: {
      x: cubeCenter.x - (scene.cube.minimumWidth * transform.scale) / 4,
      y: cubeCenter.y - (scene.cube.height * transform.scale) / 4,
      width: (scene.cube.minimumWidth * transform.scale) / 2,
      height: (scene.cube.height * transform.scale) / 2,
    },
    cubeMinimumEdges: {
      left: cubeCenter.x - (scene.cube.minimumWidth * transform.scale) / 2,
      right: cubeCenter.x + (scene.cube.minimumWidth * transform.scale) / 2,
    },
    attackerRect: {
      x: attackerHitboxTopLeft.x,
      y: attackerHitboxTopLeft.y,
      width: scene.attackerHitbox.width * transform.scale,
      height: scene.attackerHitbox.height * transform.scale,
    },
    cubeFeet,
    cubeCenter,
    cubeTop,
    cubeBottom,
    attackerFeet,
    attackerEyes,
    aimPoint,
    aimHandlePoint,
    aimArrowEnd,
    aimQLabel,
    horizontalFeetReference,
    launchStart,
    launchBodyEnd,
    launchEnd,
    launchLabel,
    launchValueLabel,
    sceneMetrics,
    firstBounceGroundLabel,
    distanceGroundLabel,
    reachWarning: {
      x: viewport.width - 18,
      y: viewport.height - 34,
    },
    thetaLabel,
    thetaSquarePath,
    thetaArcPoints: thetaArcPoints.map((point) => `${point.x},${point.y}`).join(' '),
    launchElevationLabel,
    launchElevationArcPoints: launchElevationArcPoints
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
    groundStart: toSvg(scene.cubeFeetLineStart),
    groundEnd: toSvg(scene.cubeFeetLineEnd),
    floorStart,
    floorEnd,
    trajectory,
    trajectoryTicks,
    trajectoryEndMarker,
    trajectoryPoints: trajectory.map((sample) => `${sample.point.x},${sample.point.y}`).join(' '),
    visual,
    visualStyle,
    zoomFactor,
  }
})

function pointerToSvg(event: MouseEvent): { x: number; y: number } | null {
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
  const currentView = view.value
  const currentWidth = cameraBounds.value.maxX - cameraBounds.value.minX
  const targetWidth = Math.min(
    maximumCameraWidth,
    Math.max(minimumCameraWidth, currentWidth * requestedFactor),
  )
  const factor = targetWidth / currentWidth

  cameraBounds.value = scaleWorldBoundsAroundPoint(
    cameraBounds.value,
    currentView.transform.toWorld(anchorSvg),
    factor,
  )
}

function zoomCamera(requestedFactor: number): void {
  zoomAtSvgPoint({ x: viewport.width / 2, y: viewport.height / 2 }, requestedFactor)
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
      target = currentView.scene.attackerFeet
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
    attackerEyePosition: { ...props.evaluation.callResult.input.context.attacker.eyePosition },
    normalizedLookDirection: {
      ...props.evaluation.callResult.diagnostics.normalizedLookDirection,
    },
    projection: currentView.scene.projection,
    transform: currentView.transform,
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
  const deltaX = pointerWorld.x - drag.startPointer.x
  const deltaY = pointerWorld.y - drag.startPointer.y

  switch (drag.kind) {
    case 'aim': {
      const target = clampPointToBoundsFromOrigin(
        view.value.scene.attackerEyes,
        { x: drag.startTarget.x + deltaX, y: drag.startTarget.y + deltaY },
        createViewportWorldBounds(drag.transform, view.value.visual.aimPointRadius),
      )
      aimHandleDistance.value = Math.hypot(
        target.x - view.value.scene.attackerEyes.x,
        target.y - view.value.scene.attackerEyes.y,
      )
      emit(
        'updateAimPoint',
        rotateAimInRadialProjection(
          drag.attackerEyePosition,
          drag.normalizedLookDirection,
          drag.projection,
          target,
          aimInputDistance.value,
        ),
      )
      break
    }
    case 'attacker':
    case 'cube': {
      const currentAttackerX = view.value.scene.attackerFeet.x
      const nextAttackerX =
        drag.kind === 'attacker' ? currentAttackerX + deltaX : currentAttackerX - deltaX

      if (Math.abs(nextAttackerX) >= 1e-5) {
        attackerSide.value = nextAttackerX < 0 ? -1 : 1
      }
      fallbackHorizontalAxis.value = drag.projection.horizontalAxis

      const delta = {
        x: drag.projection.horizontalAxis.x * deltaX,
        y: deltaY,
        z: drag.projection.horizontalAxis.y * deltaX,
      }

      if (drag.kind === 'attacker') {
        emit('translateAttacker', delta)
      } else {
        emit('translateCube', delta)
        cameraBounds.value = translateWorldBounds(cameraBounds.value, {
          x: -deltaX,
          y: -deltaY,
        })
      }
      dragState.value = { ...drag, startPointer: pointerWorld }
      break
    }
    case 'camera':
      cameraBounds.value = translateWorldBounds(drag.startBounds, {
        x: -deltaX,
        y: -deltaY,
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

  const drag = dragState.value

  if (drag?.pointerId === event.pointerId) {
    event.preventDefault()
    event.stopPropagation()
  }

  if (drag?.pointerId === event.pointerId) {
    dragState.value = null
  }
}

function preventPageMotionWhileDragging(event: Event): void {
  if (dragState.value !== null || metricsResizeState.value !== null) {
    event.preventDefault()
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', clearHandleFocus)
  document.removeEventListener('pointermove', preventPageMotionWhileDragging, true)
  document.removeEventListener('wheel', preventPageMotionWhileDragging, true)
})

function clearHandleFocus(event: PointerEvent): void {
  const target = event.target

  if (target instanceof Element && target.closest('.interactive-handle') !== null) {
    return
  }

  const activeElement = document.activeElement

  if (
    activeElement instanceof SVGElement &&
    activeElement.classList.contains('interactive-handle')
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

function keyboardDelta(event: KeyboardEvent): { x: number; y: number } | null {
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

  const scene = view.value.scene

  if (kind === 'aim') {
    const visibleAimPoint = view.value.aimHandlePoint
    const target = clampPointToBoundsFromOrigin(
      scene.attackerEyes,
      { x: visibleAimPoint.x + delta.x, y: visibleAimPoint.y + delta.y },
      createViewportWorldBounds(view.value.transform, view.value.visual.aimPointRadius),
    )
    aimHandleDistance.value = Math.hypot(
      target.x - scene.attackerEyes.x,
      target.y - scene.attackerEyes.y,
    )
    emit(
      'updateAimPoint',
      rotateAimInRadialProjection(
        props.evaluation.callResult.input.context.attacker.eyePosition,
        props.evaluation.callResult.diagnostics.normalizedLookDirection,
        scene.projection,
        target,
        aimInputDistance.value,
      ),
    )
  } else {
    const nextAttackerX =
      kind === 'attacker' ? scene.attackerFeet.x + delta.x : scene.attackerFeet.x - delta.x

    if (Math.abs(nextAttackerX) >= 1e-5) {
      attackerSide.value = nextAttackerX < 0 ? -1 : 1
    }
    fallbackHorizontalAxis.value = scene.projection.horizontalAxis

    const translation = {
      x: scene.projection.horizontalAxis.x * delta.x,
      y: delta.y,
      z: scene.projection.horizontalAxis.y * delta.x,
    }

    if (kind === 'attacker') {
      emit('translateAttacker', translation)
    } else {
      emit('translateCube', translation)
      cameraBounds.value = translateWorldBounds(cameraBounds.value, {
        x: -delta.x,
        y: -delta.y,
      })
    }
  }

  event.preventDefault()
}

function formatCoordinate(value: number): string {
  return value.toFixed(2)
}
</script>

<template>
  <figure
    class="scene-figure"
    :class="[`scene-figure--${sceneSize}`, { 'scene-figure--compact-embed': compactEmbed }]"
    :aria-labelledby="showHeadingTitle ? 'sulfur-cube-scene-heading' : undefined"
    :aria-label="showHeadingTitle ? undefined : sceneTitle"
  >
    <div class="scene-heading">
      <div v-if="showHeadingTitle" class="scene-heading__title">
        <h3 id="sulfur-cube-scene-heading">{{ sceneTitle }}</h3>
        <InfoTooltip
          :text="t('sulfurCube.scene.projectionHelp')"
          :label="t('sulfurCube.scene.projectionHelpLabel')"
          placement="right"
        />
      </div>
      <p>{{ t('sulfurCube.scene.subtitle') }}</p>
    </div>

    <div class="scene-frame">
      <div class="scene-frame__overlay scene-frame__overlay--right">
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
          v-if="showSizeControl !== false"
          size="small"
          weight="quiet"
          :aria-label="sceneSizeButtonLabel"
          :title="sceneSizeButtonLabel"
          @click="emit('update:sceneSize', nextSceneSize)"
        >
          {{ sceneSizeButtonLabel }}
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
        class="scene-metrics-summary-control"
        size="small"
        weight="quiet"
        @click="toggleMetricsCollapsed"
      >
        {{ t('sulfurCube.scene.showInformation') }}
      </CdxButton>
      <svg
        ref="svgElement"
        class="scene-svg"
        :class="{
          'scene-svg--panning': dragState?.kind === 'camera',
          'scene-svg--dragging-object': dragState !== null && dragState.kind !== 'camera',
          'scene-svg--resizing-metrics': metricsResizeState !== null,
        }"
        :style="view.visualStyle"
        :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
        role="group"
        aria-labelledby="sulfur-cube-scene-svg-title"
        aria-describedby="sulfur-cube-scene-svg-description"
        @pointermove.prevent="continueDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @wheel.prevent="zoomWithWheel"
        @dragstart.prevent
      >
        <title id="sulfur-cube-scene-svg-title">{{ t('sulfurCube.scene.svgTitle') }}</title>
        <desc id="sulfur-cube-scene-svg-description">
          {{ t('sulfurCube.scene.svgDescription') }}
        </desc>

        <defs>
          <marker
            id="sulfur-cube-look-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="look-arrow" d="M 0 0 L 8 3 L 0 6 L 1.6 3 z" />
          </marker>
          <marker
            id="sulfur-cube-launch-arrow"
            :markerWidth="view.visual.launchArrowWidth"
            :markerHeight="view.visual.launchArrowHeight"
            refX="8"
            refY="3"
            orient="auto"
            markerUnits="userSpaceOnUse"
            viewBox="0 0 8 6"
            preserveAspectRatio="xMidYMid meet"
          >
            <path class="launch-arrow" d="M 0 0 L 8 3 L 0 6 L 1.6 3 z" />
          </marker>
          <marker
            id="sulfur-cube-ground-arrow"
            markerWidth="7"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="ground-arrow" d="M 0 0 L 7 3 L 0 6 z" />
          </marker>
          <pattern
            :id="floorPatternId"
            patternUnits="userSpaceOnUse"
            :x="Math.min(view.floorStart.x, view.floorEnd.x)"
            :y="view.floorStart.y"
            :width="view.visual.floorTileSize"
            :height="view.visual.floorTileSize"
          >
            <image
              :href="floorSurfaceSpriteUrl"
              :width="view.visual.floorTileSize"
              :height="view.visual.floorTileSize"
              preserveAspectRatio="none"
              opacity="0.5"
            />
          </pattern>
        </defs>

        <rect
          class="scene-background"
          width="100%"
          height="100%"
          rx="8"
          @pointerdown.prevent="startDrag('camera', $event)"
        />

        <rect
          v-if="displayOptions.floor"
          class="floor-surface-icons"
          :x="Math.min(view.floorStart.x, view.floorEnd.x)"
          :y="view.floorStart.y"
          :width="Math.abs(view.floorEnd.x - view.floorStart.x)"
          :height="view.visual.floorTileSize"
          :fill="`url(#${floorPatternId})`"
        />

        <g
          v-if="displayOptions.trajectory && !compactEmbed"
          class="ground-metrics"
          aria-hidden="true"
        >
          <g v-if="view.firstBounceGroundLabel">
            <line
              :x1="view.firstBounceGroundLabel.arrow.x1"
              :y1="view.firstBounceGroundLabel.arrow.y1"
              :x2="view.firstBounceGroundLabel.arrow.x2"
              :y2="view.firstBounceGroundLabel.arrow.y2"
              marker-end="url(#sulfur-cube-ground-arrow)"
            />
            <text
              :x="view.firstBounceGroundLabel.x"
              :y="view.firstBounceGroundLabel.y"
              :text-anchor="view.firstBounceGroundLabel.anchor"
            >
              {{ view.firstBounceGroundLabel.value }}
            </text>
          </g>
          <line
            :x1="view.distanceGroundLabel.arrow.x1"
            :y1="view.distanceGroundLabel.arrow.y1"
            :x2="view.distanceGroundLabel.arrow.x2"
            :y2="view.distanceGroundLabel.arrow.y2"
            marker-end="url(#sulfur-cube-ground-arrow)"
          />
          <text
            :x="view.distanceGroundLabel.x"
            :y="view.distanceGroundLabel.y"
            :text-anchor="view.distanceGroundLabel.anchor"
          >
            {{ view.distanceGroundLabel.value }}
          </text>
        </g>

        <text
          v-if="view.scene.reach.status !== 'within_reach'"
          class="scene-reach-warning-svg"
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
                  scene: t('sulfurCube.scene.otherTopDown'),
                })
              }}
            </tspan>
          </template>
        </text>

        <g class="reference-geometry">
          <line
            class="ground-line"
            :x1="view.groundStart.x"
            :y1="view.groundStart.y"
            :x2="view.groundEnd.x"
            :y2="view.groundEnd.y"
          />
        </g>

        <polyline
          v-if="displayOptions.trajectoryLine && view.trajectoryPoints"
          class="trajectory-line"
          :points="view.trajectoryPoints"
        />
        <g v-if="displayOptions.trajectory">
          <template v-for="sample in view.trajectoryTicks" :key="sample.tick">
            <rect
              v-if="sample.floorCollision"
              class="trajectory-tick trajectory-tick--contact"
              :x="sample.point.x - view.visual.trajectoryPointRadius"
              :y="sample.point.y - view.visual.trajectoryPointRadius"
              :width="view.visual.trajectoryPointRadius * 2"
              :height="view.visual.trajectoryPointRadius * 2"
              :transform="`rotate(45 ${sample.point.x} ${sample.point.y})`"
            />
            <circle
              v-else
              class="trajectory-tick"
              :cx="sample.point.x"
              :cy="sample.point.y"
              :r="view.visual.trajectoryPointRadius"
            />
          </template>
          <path
            v-if="view.trajectoryEndMarker"
            class="trajectory-end-marker"
            :class="{
              'trajectory-end-marker--truncated': view.scene.trajectoryStatus === 'truncated',
            }"
            :d="`M ${view.trajectoryEndMarker.x - view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y - view.visual.trajectoryEndArm} L ${view.trajectoryEndMarker.x + view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y + view.visual.trajectoryEndArm} M ${view.trajectoryEndMarker.x - view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y + view.visual.trajectoryEndArm} L ${view.trajectoryEndMarker.x + view.visual.trajectoryEndArm} ${view.trajectoryEndMarker.y - view.visual.trajectoryEndArm}`"
          />
        </g>

        <g v-if="displayOptions.heightAngle" class="theta-geometry">
          <line
            :x1="view.attackerFeet.x"
            :y1="view.attackerFeet.y"
            :x2="view.horizontalFeetReference.x"
            :y2="view.horizontalFeetReference.y"
          />
          <line
            :x1="view.attackerFeet.x"
            :y1="view.attackerFeet.y"
            :x2="view.cubeFeet.x"
            :y2="view.cubeFeet.y"
          />
          <line
            :x1="view.horizontalFeetReference.x"
            :y1="view.horizontalFeetReference.y"
            :x2="view.cubeFeet.x"
            :y2="view.cubeFeet.y"
          />
          <path class="theta-square" :d="view.thetaSquarePath" />
          <polyline v-if="view.thetaArcPoints" class="theta-arc" :points="view.thetaArcPoints" />
          <text :x="view.thetaLabel.x" :y="view.thetaLabel.y">θ</text>
        </g>

        <g v-if="displayOptions.velocity" class="launch-elevation-geometry">
          <polyline v-if="view.launchElevationArcPoints" :points="view.launchElevationArcPoints" />
          <text
            v-if="view.launchElevationLabel"
            :x="view.launchElevationLabel.x"
            :y="view.launchElevationLabel.y"
            text-anchor="middle"
            dominant-baseline="middle"
          >
            {{ view.sceneMetrics.launchElevation }}°
          </text>
        </g>

        <g v-if="displayOptions.aim" class="aim-geometry">
          <g class="aim-limits">
            <line
              :x1="view.attackerEyes.x"
              :y1="view.attackerEyes.y"
              :x2="view.cubeTop.x"
              :y2="view.cubeTop.y"
            />
            <line
              :x1="view.attackerEyes.x"
              :y1="view.attackerEyes.y"
              :x2="view.cubeBottom.x"
              :y2="view.cubeBottom.y"
            />
          </g>

          <line
            class="look-line"
            :x1="view.attackerEyes.x"
            :y1="view.attackerEyes.y"
            :x2="view.aimArrowEnd.x"
            :y2="view.aimArrowEnd.y"
            marker-end="url(#sulfur-cube-look-arrow)"
          />
          <text
            v-if="showAimQLabel !== false"
            class="aim-q-label"
            :x="view.aimQLabel.x"
            :y="view.aimQLabel.y"
            text-anchor="middle"
          >
            {{ evaluation.callResult.diagnostics.q.toFixed(2) }}
          </text>
        </g>

        <g class="cube-shape">
          <template v-if="displayOptions.cube">
            <rect
              :x="view.cubeRect.x"
              :y="view.cubeRect.y"
              :width="view.cubeRect.width"
              :height="view.cubeRect.height"
              :rx="view.visual.cubeCornerRadius"
            />
            <line
              class="cube-minimum-edge"
              :x1="view.cubeMinimumEdges.left"
              :y1="view.cubeRect.y"
              :x2="view.cubeMinimumEdges.left"
              :y2="view.cubeRect.y + view.cubeRect.height"
            />
            <line
              class="cube-minimum-edge"
              :x1="view.cubeMinimumEdges.right"
              :y1="view.cubeRect.y"
              :x2="view.cubeMinimumEdges.right"
              :y2="view.cubeRect.y + view.cubeRect.height"
            />
            <circle :cx="view.cubeTop.x" :cy="view.cubeTop.y" :r="view.visual.cubeEndpointRadius" />
            <circle
              :cx="view.cubeBottom.x"
              :cy="view.cubeBottom.y"
              :r="view.visual.cubeEndpointRadius"
            />
          </template>
          <image
            v-if="selectedBlockSpriteUrl"
            class="cube-block-sprite"
            :href="selectedBlockSpriteUrl"
            :x="view.cubeSprite.x"
            :y="view.cubeSprite.y"
            :width="view.cubeSprite.width"
            :height="view.cubeSprite.height"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        <g class="attacker-shape">
          <rect
            v-if="displayOptions.player"
            :x="view.attackerRect.x"
            :y="view.attackerRect.y"
            :width="view.attackerRect.width"
            :height="view.attackerRect.height"
          />
          <circle
            class="eye-dot"
            :cx="view.attackerEyes.x"
            :cy="view.attackerEyes.y"
            :r="view.visual.eyePointRadius"
          />
          <text
            v-if="displayOptions.player"
            class="eyes-label"
            :x="view.attackerEyes.x"
            :y="view.attackerEyes.y + view.visual.eyesLabelOffset"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.eyes') }}
          </text>
          <text
            v-if="displayOptions.player"
            class="feet-label"
            :x="view.attackerFeet.x"
            :y="view.attackerFeet.y + view.visual.feetLabelOffset"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.feet') }}
          </text>
        </g>

        <g v-if="displayOptions.velocity" class="launch-geometry">
          <line
            class="launch-vector"
            :x1="view.launchStart.x"
            :y1="view.launchStart.y"
            :x2="view.launchBodyEnd.x"
            :y2="view.launchBodyEnd.y"
            :stroke-width="view.visual.launchStrokeWidth"
          />
          <line
            class="launch-vector-marker-carrier"
            :x1="view.launchStart.x"
            :y1="view.launchStart.y"
            :x2="view.launchEnd.x"
            :y2="view.launchEnd.y"
            marker-end="url(#sulfur-cube-launch-arrow)"
          />
          <text
            class="launch-label"
            :x="view.launchLabel.x"
            :y="view.launchLabel.y"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.launchVector') }}
          </text>
          <text
            v-if="view.launchValueLabel"
            class="launch-value-label"
            :x="view.launchValueLabel.x"
            :y="view.launchValueLabel.y"
            text-anchor="middle"
          >
            {{ view.launchValueLabel.value }}
          </text>
        </g>

        <g
          class="interactive-handle cube-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="t('sulfurCube.scene.cubeHandleAria')"
          @pointerdown="startDrag('cube', $event)"
          @keydown="moveHandle('cube', $event)"
        >
          <circle
            class="handle-hit-area"
            :cx="view.cubeCenter.x"
            :cy="view.cubeCenter.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="handle-marker"
            :cx="view.cubeCenter.x"
            :cy="view.cubeCenter.y"
            :r="view.visual.cubeCenterRadius"
          />
        </g>

        <g
          class="interactive-handle aim-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="
            t('sulfurCube.scene.aimHandleAria', {
              x: formatCoordinate(evaluation.inputs.aimPoint.x),
              y: formatCoordinate(evaluation.inputs.aimPoint.y),
              z: formatCoordinate(evaluation.inputs.aimPoint.z),
            })
          "
          @pointerdown="startDrag('aim', $event)"
          @keydown="moveHandle('aim', $event)"
        >
          <circle
            class="handle-hit-area"
            :cx="view.aimPoint.x"
            :cy="view.aimPoint.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="handle-marker"
            :cx="view.aimPoint.x"
            :cy="view.aimPoint.y"
            :r="view.visual.aimPointRadius"
          />
          <text
            v-if="displayOptions.aim"
            :x="view.aimPoint.x"
            :y="view.aimPoint.y - view.visual.aimLabelOffsetY"
            text-anchor="middle"
          >
            {{ t('sulfurCube.scene.aim') }}
          </text>
        </g>

        <g
          class="interactive-handle attacker-handle"
          tabindex="0"
          role="button"
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
          :aria-label="t('sulfurCube.scene.attackerHandleAria')"
          @pointerdown="startDrag('attacker', $event)"
          @keydown="moveHandle('attacker', $event)"
        >
          <circle
            class="handle-hit-area"
            :cx="view.attackerFeet.x"
            :cy="view.attackerFeet.y"
            :r="view.visual.hitAreaRadius"
          />
          <circle
            class="handle-marker"
            :cx="view.attackerFeet.x"
            :cy="view.attackerFeet.y"
            :r="view.visual.feetPointRadius"
          />
        </g>

        <g
          v-if="displayOptions.information && !metricsCollapsed"
          class="scene-metrics-panel"
          :transform="`translate(${metricsPanel.x} ${metricsPanel.y}) scale(${effectiveMetricsScale}) translate(${-metricsPanel.x} ${-metricsPanel.y})`"
        >
          <rect
            class="scene-metrics-panel__background"
            :x="metricsPanel.x"
            :y="metricsPanel.y"
            :width="metricsPanel.width"
            :height="metricsPanelHeight"
            rx="3"
            @pointerdown.stop
            @pointermove.stop
            @wheel.stop
          />
          <g class="scene-metrics" aria-hidden="true">
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.speedY">
              <tspan>{{ t('sulfurCube.scene.speedLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--velocity"
              >
                {{ view.sceneMetrics.speed }}
              </tspan>
              <tspan class="scene-metric-unit">
                &#160;{{ t('sulfurCube.scene.blocksPerSecond') }}
              </tspan>
            </text>
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.launchElevationY">
              <tspan>{{ t('sulfurCube.scene.radialLaunchAngleLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--velocity"
              >
                {{ view.sceneMetrics.launchElevation }}
              </tspan>
              <tspan class="scene-metric-unit">&#160;°</tspan>
            </text>
            <text
              v-if="compactEmbed && view.sceneMetrics.horizontalDeviationVisible"
              class="scene-metrics__horizontal-offset"
              :x="view.sceneMetrics.x"
              :y="view.sceneMetrics.horizontalDeviationY"
            >
              <tspan>
                (&#160;{{ t('sulfurCube.scene.horizontalDeviationLabel') }}&#160;=&#160;
              </tspan>
              <tspan class="scene-metric-value scene-metric-value--velocity">
                {{ view.sceneMetrics.horizontalDeviation }}
              </tspan>
              <tspan class="scene-metric-unit">&#160;°</tspan>
              <tspan>&#160;)</tspan>
            </text>
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.distanceY">
              <tspan>{{ t('sulfurCube.scene.distanceLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--trajectory"
              >
                {{ view.sceneMetrics.distance }}
              </tspan>
              <tspan class="scene-metric-unit">&#160;{{ t('sulfurCube.scene.blocks') }}</tspan>
            </text>
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.firstBounceY">
              <tspan>{{ t('sulfurCube.scene.firstBounceLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--trajectory"
              >
                {{ view.sceneMetrics.firstBounce }}
              </tspan>
              <tspan v-if="view.sceneMetrics.firstBounceReached" class="scene-metric-unit">
                &#160;{{ t('sulfurCube.scene.blocks') }}
              </tspan>
            </text>
            <text v-if="showAimQLabel !== false" :x="view.sceneMetrics.x" :y="view.sceneMetrics.qY">
              <tspan>{{ t('sulfurCube.scene.aimFactorLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--aim"
              >
                {{ view.sceneMetrics.q }}
              </tspan>
            </text>
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.thetaY">
              <tspan>{{ t('sulfurCube.scene.heightAngleLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--theta"
              >
                {{ view.sceneMetrics.theta }}
              </tspan>
              <tspan class="scene-metric-unit">&#160;°</tspan>
            </text>
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.blockY">
              <tspan>{{ t('sulfurCube.scene.selectedBlockLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--cube"
              >
                {{ selectedBlockLabel }}
              </tspan>
            </text>
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.archetypeY">
              <tspan>{{ t('sulfurCube.scene.archetypeLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--cube"
              >
                {{ selectedArchetypeLabel }}
              </tspan>
            </text>
            <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.floorY">
              <tspan>{{ t('sulfurCube.scene.floorSurfaceLabel') }}&#160;=&#160;</tspan>
              <tspan
                :x="view.sceneMetrics.valueX"
                class="scene-metric-value scene-metric-value--neutral"
              >
                {{ floorSurfaceLabel }}
              </tspan>
            </text>
            <g v-if="attackSummary" class="scene-attack-metrics">
              <line
                :x1="view.sceneMetrics.x - 6"
                :y1="view.sceneMetrics.weaponY - 15"
                :x2="view.sceneMetrics.x - 6"
                :y2="
                  compactEmbed
                    ? view.sceneMetrics.weaponY + 5
                    : view.sceneMetrics.attackGroupEndY + 5
                "
              />
              <text :x="view.sceneMetrics.x" :y="view.sceneMetrics.weaponY">
                <tspan>{{ t('sulfurCube.attack.weapon') }}&#160;=&#160;</tspan>
                <tspan
                  :x="view.sceneMetrics.valueX"
                  class="scene-metric-value scene-metric-value--neutral"
                >
                  {{ attackSummary.weaponLabel }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.sceneMetrics.attackDetailX"
                :y="view.sceneMetrics.attackStrengthY"
              >
                <tspan>{{ t('sulfurCube.scene.attackStrengthLabel') }}&#160;</tspan>
                <tspan
                  :x="view.sceneMetrics.attackDetailValueX"
                  class="scene-metric-value scene-metric-value--neutral"
                >
                  {{ attackSummary.attackStrengthPercent.toFixed(1) }}%
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.sceneMetrics.attackDetailX"
                :y="view.sceneMetrics.sharpnessY"
              >
                <tspan>{{ t('sulfurCube.attack.sharpness') }}&#160;</tspan>
                <tspan
                  :x="view.sceneMetrics.attackDetailValueX"
                  class="scene-metric-value scene-metric-value--neutral"
                >
                  {{ attackSummary.sharpnessLevel ?? 0 }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.sceneMetrics.attackDetailX"
                :y="view.sceneMetrics.knockbackY"
              >
                <tspan>{{ t('sulfurCube.attack.knockback') }}&#160;</tspan>
                <tspan
                  :x="view.sceneMetrics.attackDetailValueX"
                  class="scene-metric-value scene-metric-value--neutral"
                >
                  {{ attackSummary.knockbackLevel ?? 0 }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.sceneMetrics.attackDetailX"
                :y="view.sceneMetrics.sprintingY"
              >
                <tspan>{{ t('sulfurCube.attack.sprinting') }}&#160;</tspan>
                <tspan
                  :x="view.sceneMetrics.attackDetailValueX"
                  class="scene-metric-value scene-metric-value--neutral"
                >
                  {{ t(attackSummary.sprinting ? 'sulfurCube.yes' : 'sulfurCube.no') }}
                </tspan>
              </text>
              <text
                v-if="!compactEmbed"
                :x="view.sceneMetrics.attackDetailX"
                :y="view.sceneMetrics.criticalHitY"
              >
                <tspan>{{ t('sulfurCube.attack.criticalConditions') }}&#160;</tspan>
                <tspan
                  :x="view.sceneMetrics.attackDetailValueX"
                  class="scene-metric-value scene-metric-value--neutral"
                >
                  {{ t(attackSummary.criticalHit ? 'sulfurCube.yes' : 'sulfurCube.no') }}
                </tspan>
              </text>
            </g>
          </g>
          <g
            v-if="compactEmbed"
            class="scene-metrics-collapse"
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
            class="scene-metrics-resize"
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

        <g v-if="inputsInvalid" class="scene-invalid-overlay" role="status">
          <rect width="100%" height="100%" rx="8" />
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

    <div class="scene-legend" aria-hidden="true">
      <span>
        <i class="legend-swatch legend-swatch--player" />
        <span>{{ t('sulfurCube.scene.legendPlayer') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--cube" />
        <span>{{ t('sulfurCube.scene.legendSulfurCube') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--aim" />
        <span>{{ t('sulfurCube.scene.aim') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--theta" />
        <span>{{ t('sulfurCube.scene.legendTheta') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--launch" />
        <span>{{ t('sulfurCube.scene.launchLegend') }}</span>
      </span>
      <span>
        <i class="legend-swatch legend-swatch--trajectory" />
        <span>{{ t('sulfurCube.scene.legendTrajectory') }}</span>
      </span>
    </div>

    <figcaption>
      <p class="scene-interaction-help">
        <span>{{ t('sulfurCube.scene.openPointsBefore') }}</span>
        <span class="open-point-example" aria-hidden="true">(<i class="open-point-symbol" />)</span>
        {{ ' ' }}
        <span>{{ t('sulfurCube.scene.openPointsAfter') }}</span>
      </p>
      <details v-if="showComparisonHelp !== false" class="projection-details">
        <summary>{{ t('sulfurCube.scene.projectionAdvancedTitle') }}</summary>
        <p>{{ t('sulfurCube.scene.projectionAdvanced') }}</p>
      </details>
    </figcaption>
  </figure>
</template>

<style scoped>
.scene-figure {
  --scene-ink: var(--color-base, #202122);
  --scene-muted: var(--color-subtle, #54595d);
  --scene-border: var(--border-color-subtle, #c8ccd1);
  --scene-background: color-mix(
    in srgb,
    var(--color-base, #202122) 7%,
    var(--background-color-base, #fff)
  );
  --scene-cube: #f2a900;
  --scene-cube-dark: #202122;
  --scene-attacker: var(--color-base, #202122);
  --scene-aim: #00a3d7;
  --scene-aim-dark: #007aa3;
  --scene-aim-label: #202122;
  --scene-limit: #8bd5ea;
  --scene-theta: #d33682;
  --scene-theta-muted: color-mix(in srgb, var(--scene-theta) 45%, transparent);
  --scene-launch: #00a000;
  --scene-trajectory: var(--scene-launch);
  --scene-trajectory-muted: color-mix(in srgb, var(--scene-trajectory) 82%, transparent);
  --scene-move-cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.5' stroke-linejoin='round' d='M12 1l3 3h-2v6h6V8l3 3-3 3v-2h-6v6h2l-3 3-3-3h2v-6H5v2l-3-3 3-3v2h6V4H9z'/%3E%3C/svg%3E")
    12 12;
  margin: 0;
}

.scene-heading h3,
.scene-heading p,
figcaption p {
  margin: 0;
}

.scene-heading {
  width: calc(100% - 4cm);
  margin: 0 auto 0.5rem;
}

.scene-heading__title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.scene-heading p {
  color: var(--scene-muted);
}

figcaption {
  color: var(--scene-muted);
}

.scene-frame__overlay {
  position: absolute;
  z-index: 1;
  top: 0.25rem;
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--scene-border) 65%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--background-color-base, #fff) 88%, transparent);
  box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
}

.scene-frame__overlay--right {
  right: 0.25rem;
}

.scene-frame__overlay--reset {
  top: auto;
  right: auto;
  bottom: 0.5rem;
  left: 0.5rem;
}

.scene-frame__overlay :deep(.cdx-button) {
  min-width: var(--compact-scene-control-min-width, 1.75rem);
  padding: 0 var(--compact-scene-control-padding-inline, 0.35rem);
  font-size: var(--compact-scene-control-font-size, 0.875rem);
}

.scene-frame__overlay--right :deep(.cdx-button:not(:first-child)) {
  border-left-color: color-mix(in srgb, var(--scene-border) 70%, transparent);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.scene-frame__overlay--right :deep(.cdx-button:not(:last-child)) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.scene-frame {
  position: relative;
  width: calc(100% - 4cm);
  margin-inline: auto;
  overflow: hidden;
  border: 1px solid var(--scene-border);
  border-radius: 4px;
  background: var(--scene-background);
}

.scene-figure--compact .scene-frame,
.scene-figure--compact .scene-heading,
.scene-figure--compact .scene-legend,
.scene-figure--compact figcaption {
  width: 100%;
}

.scene-svg {
  display: block;
  width: 100%;
  height: auto;
  color: var(--scene-ink);
  font-family: sans-serif;
  font-size: var(--scene-font-size);
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.8' stroke-linejoin='round' d='M8.5 11V5.5a1.5 1.5 0 0 1 3 0V10 4.5a1.5 1.5 0 0 1 3 0V10 6a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v4.5c0 4-2.5 7-6.5 7h-1c-2.6 0-4.2-1.3-5.5-3.4L4.7 13a1.55 1.55 0 0 1 2.5-1.8z'/%3E%3C/svg%3E")
      8 7,
    grab;
  touch-action: none;
  overscroll-behavior: contain;
  user-select: none;
}

.scene-background {
  fill: var(--scene-background);
  cursor: inherit;
  touch-action: none;
}

.scene-svg--panning,
.scene-svg--panning * {
  cursor:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23fff' stroke='%23202122' stroke-width='1.8' stroke-linejoin='round' d='M7.5 10.5V7a1.5 1.5 0 0 1 3 0V9 5.5a1.5 1.5 0 0 1 3 0V9 6.5a1.5 1.5 0 0 1 3 0V10 8a1.5 1.5 0 0 1 3 0v5c0 4.2-2.6 7-6.5 7h-1c-2.4 0-4.3-1.4-5.4-3.4l-2-3.4a1.5 1.5 0 0 1 2.5-1.7z'/%3E%3C/svg%3E")
      8 7,
    grabbing !important;
}

.scene-svg--dragging-object,
.scene-svg--dragging-object * {
  cursor: var(--scene-move-cursor), move !important;
}

.scene-svg--resizing-metrics,
.scene-svg--resizing-metrics * {
  cursor: nwse-resize !important;
}

.reference-geometry,
.floor-surface-icons,
.trajectory-line,
.trajectory-tick,
.trajectory-end-marker,
.theta-geometry,
.launch-elevation-geometry,
.aim-limits,
.look-line,
.aim-q-label,
.cube-shape,
.attacker-shape,
.launch-vector,
.launch-vector-marker-carrier,
.launch-label,
.launch-value-label {
  pointer-events: none;
}

.trajectory-line {
  fill: none;
  stroke: var(--scene-trajectory-muted);
  stroke-width: calc(var(--scene-stroke-thinnest) * 0.7);
  opacity: 0.72;
}

.scene-metrics {
  fill: color-mix(in srgb, var(--scene-muted) 62%, var(--scene-background));
  font-size: 16px;
  font-weight: 700;
  pointer-events: none;
}

.scene-metrics-panel__background {
  fill: color-mix(in srgb, var(--scene-background) 82%, transparent);
  stroke: color-mix(in srgb, var(--scene-muted) 20%, transparent);
  stroke-width: 1px;
  pointer-events: none;
}

.scene-metrics-resize {
  cursor: nwse-resize;
  outline: none;
}

.scene-metrics-resize rect {
  fill: color-mix(in srgb, var(--scene-background) 88%, transparent);
  stroke: color-mix(in srgb, var(--scene-muted) 45%, transparent);
  stroke-width: 1px;
}

.scene-metrics-resize path {
  fill: none;
  stroke: var(--scene-muted);
  stroke-linecap: round;
  stroke-width: 1.25px;
  pointer-events: none;
}

.scene-metrics-resize:focus rect {
  stroke: var(--color-progressive, #36c);
  stroke-width: 2px;
}

.scene-metrics-collapse {
  cursor: pointer;
  outline: none;
}

.scene-metrics-collapse rect {
  fill: color-mix(in srgb, var(--scene-background) 88%, transparent);
  stroke: color-mix(in srgb, var(--scene-muted) 45%, transparent);
  stroke-width: 1px;
}

.scene-metrics-collapse path {
  fill: none;
  stroke: var(--scene-muted);
  stroke-linecap: round;
  stroke-width: 1.25px;
  pointer-events: none;
}

.scene-metrics-collapse:focus rect {
  stroke: var(--color-progressive, #36c);
  stroke-width: 2px;
}

.scene-metrics-summary-control {
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
.scene-attack-metrics > line {
  stroke: color-mix(in srgb, var(--scene-muted) 36%, transparent);
  stroke-width: 1px;
}

.scene-metric-value--velocity {
  fill: var(--scene-launch);
}

.scene-metric-value--trajectory {
  fill: var(--scene-trajectory-muted);
}

.scene-metric-value--aim {
  fill: var(--scene-aim-dark);
}

.scene-metric-value--theta {
  fill: var(--scene-theta);
}

.scene-metric-value--cube {
  fill: var(--scene-ink);
}

.scene-metric-value--neutral {
  fill: var(--scene-ink);
}

.scene-metric-unit {
  fill: var(--scene-ink);
}

.scene-invalid-overlay {
  cursor: default;
}

.scene-invalid-overlay rect {
  fill: var(--scene-background);
  pointer-events: all;
}

.scene-invalid-overlay text {
  fill: var(--color-error, #b32424);
  font-size: 20px;
  font-weight: 700;
  pointer-events: none;
}

.scene-reach-warning-svg {
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

.launch-elevation-geometry {
  fill: var(--scene-launch);
  font-size: calc(var(--scene-minor-font-size) * 0.85);
  font-weight: 700;
}

.launch-elevation-geometry polyline {
  fill: none;
  stroke: var(--scene-launch);
  stroke-width: var(--scene-stroke-thin);
}

.ground-metrics {
  fill: var(--scene-trajectory-muted);
  stroke: var(--scene-trajectory-muted);
  font-size: calc(var(--scene-minor-font-size) * 0.85);
  font-weight: 700;
  pointer-events: none;
}

.ground-metrics text {
  stroke: none;
}

.ground-metrics line {
  stroke-width: 1px;
}

.ground-arrow {
  fill: var(--scene-trajectory-muted);
}

.reference-geometry line {
  stroke: var(--scene-border);
  stroke-width: var(--scene-stroke-thin);
}

.reference-geometry .ground-line {
  stroke: var(--scene-muted);
  stroke-width: var(--scene-stroke-regular);
}

.theta-geometry line {
  fill: none;
  stroke: var(--scene-theta-muted);
  stroke-dasharray: var(--scene-dash-theta);
  stroke-width: calc(var(--scene-stroke-thinnest) * 0.72);
}

.theta-geometry .theta-arc {
  fill: none;
  stroke: var(--scene-theta);
  stroke-dasharray: none;
  stroke-width: var(--scene-stroke-regular);
}

.theta-geometry .theta-square {
  fill: none;
  stroke: var(--scene-theta);
  stroke-dasharray: none;
  stroke-width: var(--scene-stroke-thinnest);
}

.theta-geometry text {
  fill: var(--scene-theta);
  font-weight: 700;
}

.aim-limits line {
  stroke: var(--scene-limit);
  stroke-dasharray: var(--scene-dash-aim);
  stroke-width: var(--scene-stroke-thin);
}

.look-line {
  stroke: var(--scene-aim);
  stroke-width: var(--scene-stroke-regular);
}

.look-arrow {
  fill: var(--scene-aim);
}

.aim-q-label {
  fill: var(--scene-aim-dark);
  font-size: var(--scene-minor-font-size);
  font-weight: 700;
  pointer-events: none;
}

.cube-shape rect {
  fill: color-mix(in srgb, var(--scene-cube) 72%, transparent);
  stroke: var(--scene-cube-dark);
  stroke-width: var(--scene-stroke-thinnest);
}

.cube-shape circle {
  fill: var(--scene-cube-dark);
}

.cube-block-sprite {
  image-rendering: pixelated;
  pointer-events: none;
}

.cube-minimum-edge {
  stroke: color-mix(in srgb, var(--scene-ink) 34%, transparent);
  stroke-width: calc(var(--scene-stroke-thinnest) * 0.65);
  stroke-dasharray: 1.5 3;
  pointer-events: none;
}

.cube-shape text {
  fill: var(--scene-cube-dark);
  font-weight: 700;
}

.attacker-shape rect {
  fill: color-mix(in srgb, var(--scene-attacker) 9%, transparent);
  stroke: var(--scene-attacker);
  stroke-width: var(--scene-stroke-regular);
}

.attacker-shape circle {
  fill: var(--scene-attacker);
  stroke: none;
}

.attacker-shape text {
  fill: var(--scene-attacker);
  font-weight: 700;
}

.attacker-shape .eyes-label,
.attacker-shape .feet-label {
  font-size: var(--scene-small-label-font-size);
}

.launch-vector {
  stroke: var(--scene-launch);
  stroke-linecap: butt;
}

.launch-vector-marker-carrier {
  stroke: transparent;
}

.launch-arrow {
  fill: var(--scene-launch);
}

.launch-label {
  fill: var(--scene-launch);
  font-weight: 700;
}

.launch-value-label {
  fill: var(--scene-launch);
  font-size: var(--scene-minor-font-size);
  font-weight: 700;
}

.trajectory-tick {
  fill: var(--scene-trajectory-muted);
  stroke: var(--scene-ink);
  stroke-width: 0.65px;
  paint-order: stroke fill;
  opacity: 1;
}

.trajectory-tick--contact {
  fill: color-mix(in srgb, var(--scene-launch) 82%, transparent);
  opacity: 1;
}

.trajectory-end-marker {
  fill: none;
  stroke: var(--scene-trajectory);
  stroke-linecap: round;
  stroke-width: 2px;
  opacity: 0.75;
}

.trajectory-end-marker--truncated {
  stroke-dasharray: var(--scene-dash-trajectory);
}

.minor-label {
  fill: var(--scene-muted);
  font-size: var(--scene-minor-font-size);
}

.interactive-handle {
  outline: none;
  cursor: var(--scene-move-cursor), move;
  touch-action: none;
}

.interactive-handle:focus .handle-marker {
  fill: var(--background-color-error, #d33);
}

.handle-hit-area {
  fill: transparent;
  stroke: transparent;
}

.handle-marker {
  fill: var(--background-color-base, #fff);
  stroke-width: var(--scene-stroke-regular);
}

.aim-handle .handle-marker {
  stroke: var(--scene-ink);
}

.aim-handle text {
  fill: var(--scene-aim-dark);
  font-weight: 700;
  pointer-events: none;
}

.attacker-handle .handle-marker {
  stroke: var(--scene-attacker);
}

.cube-handle .handle-marker {
  stroke: var(--scene-cube-dark);
}

.scene-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  color: var(--scene-muted);
  font-size: 0.875em;
  width: calc(100% - 4cm);
  margin-top: 0.5rem;
  margin-inline: auto;
}

.scene-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.scene-interaction-help {
  display: block;
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
  border: 0.15em solid #202122;
  border-radius: 50%;
  background: #fff;
  vertical-align: -0.05em;
}

.scene-figure--compact-embed .open-point-symbol {
  width: 0.5em;
  height: 0.5em;
  border-width: 0.12em;
  vertical-align: 0.04em;
}

.scene-figure--compact-embed .scene-metrics {
  fill: var(--scene-ink);
  font-weight: 500;
  text-rendering: optimizeLegibility;
}

.scene-figure--compact-embed .scene-metrics-panel__background {
  cursor: default;
  pointer-events: all;
}

.scene-figure--compact-embed .scene-metric-value,
.scene-figure--compact-embed .scene-metric-unit {
  font-weight: 700;
}

.scene-figure--compact-embed .scene-metrics__horizontal-offset {
  font-size: 13px;
}

:global(.dark .scene-figure) {
  --scene-cube: #ffd84d;
  --scene-cube-dark: #fff;
  --scene-attacker: var(--color-base, #eaecf0);
  --scene-aim: #62d6ff;
  --scene-aim-dark: #9be6ff;
  --scene-aim-label: var(--color-base, #eaecf0);
  --scene-limit: #398aa3;
  --scene-theta: #ff6bb3;
  --scene-theta-muted: color-mix(in srgb, var(--scene-theta) 45%, transparent);
  --scene-launch: #33d13f;
}

:global(.dark .open-point-symbol) {
  border-color: #fff;
  background: #202122;
}

.legend-swatch {
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background: currentcolor;
}

.legend-swatch--cube {
  color: var(--scene-cube);
}

.legend-swatch--aim {
  color: var(--scene-aim);
}

.legend-swatch--theta {
  color: var(--scene-theta);
}

.legend-swatch--launch {
  color: var(--scene-launch);
}

.legend-swatch--trajectory {
  color: var(--scene-trajectory);
  border: 1px solid var(--scene-ink);
}

.legend-swatch--player {
  color: var(--scene-attacker);
}

figcaption {
  display: grid;
  gap: 0.25rem;
  width: calc(100% - 4cm);
  margin-top: 0.5rem;
  margin-inline: auto;
  font-size: 0.875em;
}

.projection-details summary {
  cursor: pointer;
}

.projection-details p {
  margin-top: 0.25rem;
}

@media (max-width: 32rem) {
  .scene-svg {
    font-size: var(--scene-mobile-font-size);
  }

  .minor-label {
    display: none;
  }

  .scene-frame,
  .scene-heading,
  .scene-legend,
  figcaption,
  .scene-figure--compact .scene-frame {
    width: 92%;
    width: min(92%, calc(150svh - 7.5rem));
  }

  .scene-frame__overlay {
    max-width: calc(100% - 1rem);
  }

  .scene-frame__overlay--left {
    right: 0.5rem;
  }

  .scene-frame__overlay--right {
    top: auto;
    bottom: 0.5rem;
  }

  .scene-figure--compact-embed .scene-frame__overlay--right {
    top: 0.25rem;
    bottom: auto;
  }
}

@container sulfur-cube-compact (max-width: 20rem) {
  .scene-metrics-summary-control {
    top: 2.5rem;
  }
}
</style>
