<script setup lang="ts">
import type { PowerStageId } from '../presentation/powerSpace'
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import { computed } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'
import { createPowerSpacePresentation } from '../presentation/powerSpace'
import { createWorldToSvgTransform } from '../presentation/worldToSvg'
import InfoTooltip from './InfoTooltip.vue'

const props = withDefaults(
  defineProps<{
    evaluation: DiagnosticEvaluation
    showHeadingTitle?: boolean
  }>(),
  {
    showHeadingTitle: true,
  },
)

const { t } = useI18n()
const viewport = {
  width: 560,
  height: 340,
  padding: { top: 34, right: 42, bottom: 44, left: 46 },
} as const
const stageNumbers: Record<PowerStageId, string> = {
  base: '0',
  aim: '1',
  elevation: '2',
  capped: '3',
}

interface SvgPowerStage {
  readonly id: PowerStageId
  readonly point: { readonly x: number; readonly y: number }
  readonly number: string
  readonly svg: { readonly x: number; readonly y: number }
}

const fixedNumberFormatters: Record<2 | 4, Intl.NumberFormat> = {
  2: new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }),
  4: new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
    useGrouping: false,
  }),
}

function formatFixedNumber(value: number, fractionDigits: 2 | 4): string {
  const roundsToZero = Math.abs(value) < 0.5 / 10 ** fractionDigits

  return fixedNumberFormatters[fractionDigits].format(roundsToZero ? 0 : value)
}

const powerCoordinateFormatters = computed(() => {
  return {
    horizontal: new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
      useGrouping: false,
    }),
    vertical: new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
      useGrouping: false,
    }),
  }
})

function formatPowerCoordinate(value: number, axis: 'horizontal' | 'vertical'): string {
  const normalized = Object.is(value, -0) ? 0 : value

  return powerCoordinateFormatters.value[axis].format(normalized)
}

function formatPowerPair(horizontal: number, vertical: number): string {
  return `(${formatPowerCoordinate(horizontal, 'horizontal')}, ${formatPowerCoordinate(vertical, 'vertical')})`
}

function stageLabelX(stage: SvgPowerStage): number {
  switch (stage.id) {
    case 'base':
      return stage.svg.x + 6
    case 'elevation':
      return stage.svg.x + 7
    case 'capped':
      return stage.svg.x - 14
    default:
      return stage.svg.x + 12
  }
}

function stageLabelY(stage: SvgPowerStage): number {
  return stage.id === 'base' ? stage.svg.y + 14 : stage.svg.y - 11
}

const currentTransformation = computed(() => {
  const ratio = props.evaluation.callResult.diagnostics.transferredPowerRatio
  const angle = props.evaluation.callResult.diagnostics.powerRotationAngle
  const presentation = createPowerSpacePresentation(props.evaluation.callResult)

  return {
    percentage: formatFixedNumber(ratio * 100, 2),
    horizontalFactor: formatFixedNumber(1 - ratio, 2),
    verticalFactor: formatFixedNumber(1 + ratio, 2),
    degrees: formatFixedNumber((angle * 180) / Math.PI, 2),
    capFactor: formatFixedNumber(presentation.capFactor, 4),
  }
})

const view = computed(() => {
  const presentation = createPowerSpacePresentation(props.evaluation.callResult)
  const transform = createWorldToSvgTransform(presentation.bounds, viewport)
  const stages: SvgPowerStage[] = presentation.stages.map((stage) => ({
    ...stage,
    number: stageNumbers[stage.id],
    svg: transform.toSvg(stage.point),
  }))
  const stageById = Object.fromEntries(stages.map((stage) => [stage.id, stage])) as Record<
    PowerStageId,
    SvgPowerStage
  >
  const origin = transform.toSvg({ x: 0, y: 0 })
  const limitTopLeft = transform.toSvg({
    x: presentation.limitBounds.minX,
    y: presentation.limitBounds.maxY,
  })
  const limitBottomRight = transform.toSvg({
    x: presentation.limitBounds.maxX,
    y: presentation.limitBounds.minY,
  })

  return {
    presentation,
    stages,
    stageById,
    origin,
    aimRange: {
      start: transform.toSvg(presentation.aimRange.start),
      end: transform.toSvg(presentation.aimRange.end),
    },
    aimArrowEnd: transform.toSvg(presentation.aimArrowEnd),
    elevationArcPoints: presentation.elevationArc
      .map((point) => transform.toSvg(point))
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
    elevationArrowStart: transform.toSvg(presentation.elevationArrowStart),
    elevationArrowEnd: transform.toSvg(presentation.elevationArrowEnd),
    horizontalAxisStart: transform.toSvg({ x: presentation.bounds.minX, y: 0 }),
    horizontalAxisEnd: transform.toSvg({ x: presentation.bounds.maxX, y: 0 }),
    verticalAxisStart: transform.toSvg({ x: 0, y: presentation.bounds.minY }),
    verticalAxisEnd: transform.toSvg({ x: 0, y: presentation.bounds.maxY }),
    limitRect: {
      x: limitTopLeft.x,
      y: limitTopLeft.y,
      width: limitBottomRight.x - limitTopLeft.x,
      height: limitBottomRight.y - limitTopLeft.y,
    },
  }
})
</script>

<template>
  <figure
    class="power-space"
    :aria-labelledby="showHeadingTitle ? 'sulfur-cube-power-heading' : undefined"
    :aria-label="showHeadingTitle ? undefined : t('sulfurCube.power.title')"
  >
    <div class="power-space__heading">
      <div v-if="showHeadingTitle" class="power-space__title">
        <h3 id="sulfur-cube-power-heading">{{ t('sulfurCube.power.title') }}</h3>
        <InfoTooltip
          :text="t('sulfurCube.power.caveat')"
          :label="t('sulfurCube.power.caveatLabel')"
          placement="right"
        />
      </div>
      <p>{{ t('sulfurCube.power.subtitle') }}</p>
    </div>

    <div class="power-space__frame">
      <span class="power-space__static-badge">{{ t('sulfurCube.power.nonInteractive') }}</span>
      <svg
        class="power-space__svg"
        :viewBox="`0 0 ${viewport.width} ${viewport.height}`"
        role="img"
      >
        <title>{{ t('sulfurCube.power.svgTitle') }}</title>
        <desc>{{ t('sulfurCube.power.svgDescription') }}</desc>

        <defs>
          <marker
            id="sulfur-cube-power-aim-arrow"
            markerWidth="7"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="power-arrow power-arrow--aim" d="M 0 0 L 7 3 L 0 6 L 1.4 3 z" />
          </marker>
          <marker
            id="sulfur-cube-power-elevation-arrow"
            markerWidth="7"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="power-arrow power-arrow--elevation" d="M 0 0 L 7 3 L 0 6 L 1.4 3 z" />
          </marker>
          <marker
            id="sulfur-cube-power-cap-arrow"
            markerWidth="7"
            markerHeight="6"
            refX="6"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path class="power-arrow power-arrow--cap" d="M 0 0 L 7 3 L 0 6 L 1.4 3 z" />
          </marker>
        </defs>

        <rect class="power-background" width="100%" height="100%" rx="8" />
        <rect
          class="limit-rectangle"
          :x="view.limitRect.x"
          :y="view.limitRect.y"
          :width="view.limitRect.width"
          :height="view.limitRect.height"
        />
        <text
          class="limit-label"
          :x="view.limitRect.x + view.limitRect.width - 6"
          :y="view.limitRect.y + view.limitRect.height - 8"
          text-anchor="end"
        >
          {{ t('sulfurCube.power.componentLimits') }}
        </text>

        <g class="power-axes">
          <line
            :x1="view.horizontalAxisStart.x"
            :y1="view.horizontalAxisStart.y"
            :x2="view.horizontalAxisEnd.x"
            :y2="view.horizontalAxisEnd.y"
          />
          <line
            :x1="view.verticalAxisStart.x"
            :y1="view.verticalAxisStart.y"
            :x2="view.verticalAxisEnd.x"
            :y2="view.verticalAxisEnd.y"
          />
          <text
            :x="view.horizontalAxisEnd.x - 4"
            :y="view.horizontalAxisEnd.y - 9"
            text-anchor="end"
          >
            {{ t('sulfurCube.power.horizontalAxis') }}
          </text>
          <text :x="view.verticalAxisEnd.x + 9" :y="view.verticalAxisEnd.y + 17">
            {{ t('sulfurCube.power.verticalAxis') }}
          </text>
        </g>

        <line
          class="aim-range-line"
          :x1="view.aimRange.start.x"
          :y1="view.aimRange.start.y"
          :x2="view.aimRange.end.x"
          :y2="view.aimRange.end.y"
        />
        <line
          class="stage-segment stage-segment--aim"
          :x1="view.stageById.base.svg.x"
          :y1="view.stageById.base.svg.y"
          :x2="view.aimArrowEnd.x"
          :y2="view.aimArrowEnd.y"
          marker-end="url(#sulfur-cube-power-aim-arrow)"
        />
        <polyline
          class="stage-segment stage-segment--elevation"
          :points="view.elevationArcPoints"
        />
        <line
          class="stage-segment stage-segment--elevation-arrow-tip"
          :x1="view.elevationArrowStart.x"
          :y1="view.elevationArrowStart.y"
          :x2="view.elevationArrowEnd.x"
          :y2="view.elevationArrowEnd.y"
          marker-end="url(#sulfur-cube-power-elevation-arrow)"
        />
        <line
          class="cap-vector"
          :x1="view.origin.x"
          :y1="view.origin.y"
          :x2="view.stageById.capped.svg.x"
          :y2="view.stageById.capped.svg.y"
          marker-end="url(#sulfur-cube-power-cap-arrow)"
        />
        <line
          class="stage-segment stage-segment--capped"
          :x1="view.stageById.capped.svg.x"
          :y1="view.stageById.capped.svg.y"
          :x2="view.stageById.elevation.svg.x"
          :y2="view.stageById.elevation.svg.y"
        />

        <g
          v-for="stage in view.stages"
          :key="stage.id"
          :class="`power-stage power-stage--${stage.id}`"
        >
          <circle v-if="stage.id !== 'capped'" :cx="stage.svg.x" :cy="stage.svg.y" r="3.5" />
          <template v-else />
          <text :x="stageLabelX(stage)" :y="stageLabelY(stage)">{{ stage.number }}</text>
        </g>
      </svg>
    </div>

    <ol class="power-stages">
      <li v-for="stage in view.presentation.stages" :key="stage.id">
        <span :class="`stage-key stage-key--${stage.id}`">{{ stageNumbers[stage.id] }}</span>
        <span class="stage-description">
          <strong>{{ t(`sulfurCube.power.stages.${stage.id}`) }}</strong>
          <small v-if="stage.id === 'base'">
            {{ t('sulfurCube.power.stages.baseHelp') }}
          </small>
          <small v-else-if="stage.id === 'aim'">
            {{ t('sulfurCube.power.stages.aimHelpBefore') }}<span class="aim-symbol">q</span>.
          </small>
          <small v-else-if="stage.id === 'elevation'">
            {{ t('sulfurCube.power.stages.elevationHelpBefore') }}−0.8<span class="theta">θ</span>.
          </small>
          <small v-else>
            {{ t('sulfurCube.power.stages.cappedHelp') }}
          </small>
          <I18nT
            v-if="stage.id === 'aim'"
            keypath="sulfurCube.power.inlineAimTransformation"
            scope="global"
            tag="small"
            class="stage-transformation stage-transformation--aim"
          >
            <template #percentage>
              <span class="stage-transformation__value">
                {{ currentTransformation.percentage }}
              </span>
            </template>
            <template #horizontalFactor>
              <span class="stage-transformation__value">
                {{ currentTransformation.horizontalFactor }}
              </span>
            </template>
            <template #verticalFactor>
              <span class="stage-transformation__value">
                {{ currentTransformation.verticalFactor }}
              </span>
            </template>
          </I18nT>
          <I18nT
            v-else-if="stage.id === 'elevation'"
            keypath="sulfurCube.power.inlineHeightTransformation"
            scope="global"
            tag="small"
            class="stage-transformation stage-transformation--elevation"
          >
            <template #degrees>
              <span class="stage-transformation__value">
                {{ currentTransformation.degrees }}
              </span>
            </template>
          </I18nT>
          <I18nT
            v-else-if="stage.id === 'capped'"
            keypath="sulfurCube.power.inlineCapTransformation"
            scope="global"
            tag="small"
            class="stage-transformation stage-transformation--cap"
          >
            <template #factor>
              <span class="stage-transformation__value">
                {{ currentTransformation.capFactor }}
              </span>
            </template>
          </I18nT>
        </span>
        <code>{{ formatPowerPair(stage.point.x, stage.point.y) }}</code>
      </li>
    </ol>
  </figure>
</template>

<style scoped>
.power-space {
  --power-ink: var(--color-base, #202122);
  --power-muted: var(--color-subtle, #54595d);
  --power-border: var(--border-color-subtle, #c8ccd1);
  --power-background: #e2e4e7;
  --power-base: #f2a900;
  --power-aim: #00a3d7;
  --power-elevation: #d33682;
  --power-cap: #00a000;
  margin: 0;
  min-width: 0;
}

.power-space__heading {
  margin-bottom: 0.5rem;
}

.power-space__title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.power-space__static-badge {
  position: absolute;
  z-index: 1;
  top: 0.4rem;
  right: 0.4rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  background: var(--background-color-neutral-subtle, #f8f9fa);
  color: var(--color-subtle, #54595d);
  font-size: 0.75rem;
  font-weight: 400;
  white-space: nowrap;
}

.power-space__heading h3,
.power-space__heading p,
figcaption p {
  margin: 0;
}

.power-space__heading p,
figcaption {
  color: var(--power-muted);
}

.power-space__frame {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--power-border);
  border-radius: 4px;
  background: var(--power-background);
}

.power-space__svg {
  display: block;
  width: 100%;
  height: auto;
  color: var(--power-ink);
  font-family: sans-serif;
  font-size: 14px;
}

.power-background {
  fill: var(--power-background);
}

.limit-rectangle {
  fill: color-mix(in srgb, var(--power-base) 7%, transparent);
  stroke: var(--power-base);
  stroke-dasharray: 10 7;
  stroke-width: 0.8;
}

.limit-label {
  fill: var(--power-base);
  font-size: 12px;
  font-weight: 700;
}

.power-axes line {
  stroke: var(--power-ink);
  stroke-width: 1.5;
}

.power-axes text {
  fill: var(--power-ink);
  font-size: 10px;
  font-weight: 700;
}

.aim-range-line {
  stroke: var(--power-ink);
  stroke-width: 1.25;
  stroke-dasharray: 1 5;
  stroke-linecap: round;
  opacity: 0.45;
}

.stage-segment {
  fill: none;
  stroke-width: 1.75;
}

.stage-segment--aim {
  stroke: var(--power-aim);
}

.stage-segment--elevation,
.stage-segment--elevation-arrow-tip {
  stroke: var(--power-elevation);
}

.stage-segment--capped {
  stroke: var(--power-cap);
  stroke-dasharray: 5 4;
  stroke-linecap: round;
  stroke-width: 1.1;
}

.cap-vector {
  stroke: var(--power-cap);
  stroke-linecap: round;
  stroke-width: 2.5;
}

.power-arrow--aim {
  fill: var(--power-aim);
}

.power-arrow--elevation {
  fill: var(--power-elevation);
}

.power-arrow--cap {
  fill: var(--power-cap);
}

.power-stage text {
  fill: var(--power-ink);
  font-weight: 700;
}

.power-stage circle {
  stroke: none;
}

.power-stage--base circle {
  fill: var(--power-base);
}

.power-stage--aim circle {
  fill: var(--power-aim);
}

.power-stage--elevation circle {
  fill: var(--power-elevation);
}

.power-stages {
  display: grid;
  gap: 0.4rem;
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
}

.power-stages li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
}

.stage-key {
  display: inline-grid;
  width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--background-color-base, #fff);
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
}

.stage-key--base {
  background: var(--power-base);
}

.stage-key--aim {
  background: var(--power-aim);
}

.stage-key--elevation {
  background: var(--power-elevation);
}

.stage-key--capped {
  background: var(--power-cap);
}

.stage-description {
  display: grid;
  min-width: 0;
}

.stage-description small {
  color: var(--power-muted);
}

.aim-symbol {
  color: var(--power-aim);
  font-weight: 700;
}

.theta {
  color: var(--power-elevation);
  font-weight: 700;
}

.stage-transformation {
  color: var(--power-muted);
  font-size: 0.78em;
  font-weight: 400;
  white-space: nowrap;
}

.stage-transformation__value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stage-transformation--aim .stage-transformation__value {
  color: var(--power-aim);
}

.stage-transformation--elevation .stage-transformation__value {
  color: var(--power-elevation);
}

.stage-transformation--cap .stage-transformation__value {
  color: var(--power-cap);
}

:global(.dark .power-space) {
  --power-background: #2a2d30;
  --power-base: #ffd84d;
  --power-aim: #62d6ff;
  --power-elevation: #ff6bb3;
  --power-cap: #33d13f;
}

.power-stages code {
  width: 16ch;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

@media (max-width: 32rem) {
  .power-space__svg {
    font-size: 16px;
  }

  .power-stages li {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .power-stages code {
    grid-column: 2;
  }
}
</style>
