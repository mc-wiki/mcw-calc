<script setup lang="ts">
import type { DiagnosticEvaluation } from '../presets/diagnostic'
import { CdxAccordion } from '@wikimedia/codex'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface ReadoutRow {
  readonly label: string
  readonly symbol?: string
  readonly value: string
  readonly warning?: boolean
}

const props = withDefaults(
  defineProps<{
    evaluation: DiagnosticEvaluation
    showDetails?: boolean
    showDetailsTitle?: boolean
    showSummary?: boolean
    showTitle?: boolean
    summaryLayout?: 'grid' | 'single'
  }>(),
  {
    showDetails: true,
    showDetailsTitle: true,
    showSummary: true,
    showTitle: true,
    summaryLayout: 'grid',
  },
)

const { t } = useI18n()

const numberFormatter = computed(
  () =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 3,
      minimumFractionDigits: 0,
      useGrouping: false,
    }),
)

const endpointCoordinateFormatter = computed(
  () =>
    new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 6,
      minimumFractionDigits: 6,
      useGrouping: false,
    }),
)

function formatNumber(value: number): string {
  const normalized = Object.is(value, -0) ? 0 : value

  if (normalized !== 0 && (Math.abs(normalized) < 0.000001 || Math.abs(normalized) >= 1000000)) {
    return normalized.toExponential(3)
  }

  return numberFormatter.value.format(normalized)
}

function formatRadians(value: number): string {
  return t('sulfurCube.readout.angleValue', {
    radians: formatNumber(value),
    degrees: formatNumber((value * 180) / Math.PI),
  })
}

function formatLaunchAngle(value: number): string {
  return t('sulfurCube.readout.launchAngleValue', {
    degrees: formatNumber((value * 180) / Math.PI),
    radians: formatNumber(value),
  })
}

function formatBlocksPerSecond(valueInBlocksPerTick: number): string {
  return t('sulfurCube.readout.blocksPerSecond', {
    value: formatNumber(valueInBlocksPerTick * 20),
  })
}

function formatPair(first: number, second: number): string {
  return `(${formatNumber(first)}, ${formatNumber(second)})`
}

function formatVector(x: number, y: number, z: number): string {
  return `(${formatNumber(x)}, ${formatNumber(y)}, ${formatNumber(z)})`
}

function formatEndpointCoordinateVector(x: number, y: number, z: number): string {
  const format = (value: number) =>
    endpointCoordinateFormatter.value.format(Object.is(value, -0) ? 0 : value)

  return `(${format(x)}, ${format(y)}, ${format(z)})`
}

const summaryRows = computed<readonly ReadoutRow[]>(() => {
  const { launchSummary, launchVelocity, trajectory } = props.evaluation
  const firstBounceTick = trajectory.firstFloorCollision
  const firstBounceAirTimeTicks =
    firstBounceTick === null ? null : firstBounceTick.end.tick - trajectory.initialState.tick

  return [
    {
      label: t('sulfurCube.readout.totalSpeed'),
      value: formatBlocksPerSecond(launchSummary.totalSpeed),
    },
    {
      label: t('sulfurCube.readout.horizontalSpeed'),
      value: formatBlocksPerSecond(launchSummary.horizontalSpeed),
    },
    {
      label: t('sulfurCube.readout.verticalSpeed'),
      value: formatBlocksPerSecond(launchVelocity.y),
    },
    {
      label: t('sulfurCube.readout.elevation'),
      value: formatLaunchAngle(launchSummary.elevationAngle),
    },
    {
      label: t('sulfurCube.readout.distanceTravelled'),
      value: t('sulfurCube.readout.blocksValue', {
        value: formatNumber(trajectory.horizontalDisplacement),
      }),
    },
    {
      label: t('sulfurCube.readout.firstBounceAirTime'),
      value:
        firstBounceAirTimeTicks === null
          ? t('sulfurCube.readout.notReached')
          : t('sulfurCube.readout.timeValue', {
              seconds: formatNumber(firstBounceAirTimeTicks / 20),
              ticks: firstBounceAirTimeTicks,
            }),
    },
    {
      label: t('sulfurCube.readout.maximumHeightAboveFloor'),
      value: t('sulfurCube.readout.blocksValue', {
        value: formatNumber(
          trajectory.maximumDiscreteFeetY - trajectory.initialState.feetPosition.y,
        ),
      }),
    },
    {
      label: t('sulfurCube.readout.endpointCoordinates'),
      value: formatVector(
        trajectory.endpoint.feetPosition.x,
        trajectory.endpoint.feetPosition.y,
        trajectory.endpoint.feetPosition.z,
      ),
    },
    ...(trajectory.status === 'truncated'
      ? [
          {
            label: t('sulfurCube.readout.calculationStatus'),
            value: t('sulfurCube.readout.trajectoryStatus.truncated'),
            warning: true,
          },
        ]
      : []),
  ]
})

const geometryRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.normalizedLookDirection'),
      value: formatVector(
        values.normalizedLookDirection.x,
        values.normalizedLookDirection.y,
        values.normalizedLookDirection.z,
      ),
    },
    {
      label: t('sulfurCube.readout.verticalAimFactor'),
      symbol: 'q',
      value: formatNumber(values.q),
    },
    {
      label: t('sulfurCube.readout.feetElevationAngle'),
      symbol: 'θ',
      value: formatRadians(values.theta),
    },
    {
      label: t('sulfurCube.readout.horizontalAimDifference'),
      symbol: 'δ',
      value: formatRadians(values.horizontalAngleDelta),
    },
    {
      label: t('sulfurCube.readout.horizontalBaseDirection'),
      value: formatPair(
        props.evaluation.callResult.input.call.horizontalBaseDirection.x,
        props.evaluation.callResult.input.call.horizontalBaseDirection.z,
      ),
    },
    {
      label: t('sulfurCube.readout.transformedDirection'),
      symbol: 'D′',
      value: formatPair(
        values.transformedHorizontalDirection.x,
        values.transformedHorizontalDirection.z,
      ),
    },
    {
      label: t('sulfurCube.readout.normalizedDirection'),
      value: formatPair(
        values.normalizedHorizontalDirection.x,
        values.normalizedHorizontalDirection.z,
      ),
    },
  ]
})

const powerRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.basePower'),
      symbol: '(H₀, V₀)',
      value: formatPair(values.h0, values.v0),
    },
    {
      label: t('sulfurCube.readout.aimTransferredPower'),
      symbol: '(H₁, V₁)',
      value: formatPair(values.h1, values.v1),
    },
    {
      label: t('sulfurCube.readout.elevationRotatedPower'),
      symbol: '(H₂, V₂)',
      value: formatPair(values.h2, values.v2),
    },
    {
      label: t('sulfurCube.readout.cappedPower'),
      symbol: '(H₃, V₃)',
      value: formatPair(values.h3, values.v3),
    },
  ]
})

const capRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    { label: t('sulfurCube.readout.horizontalRatio'), value: formatNumber(values.horizontalRatio) },
    { label: t('sulfurCube.readout.verticalRatio'), value: formatNumber(values.verticalRatio) },
    { label: t('sulfurCube.readout.maximumRatio'), value: formatNumber(values.maxRatio) },
    { label: t('sulfurCube.readout.capFactor'), value: formatNumber(values.capFactor) },
  ]
})

const scalingRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.damageArgument'),
      value: formatNumber(props.evaluation.callResult.input.call.damageArgument),
    },
    {
      label: t('sulfurCube.readout.damageSquareRoot'),
      value: formatNumber(values.damageSquareRoot),
    },
    {
      label: t('sulfurCube.readout.effectFactor'),
      symbol: 'E',
      value: formatNumber(values.effectFactor),
    },
    {
      label: t('sulfurCube.readout.knockbackResistance'),
      symbol: 'R',
      value: formatNumber(props.evaluation.callResult.input.context.properties.knockbackResistance),
    },
    {
      label: t('sulfurCube.readout.resistanceFactor'),
      symbol: '(1 − R)',
      value: formatNumber(values.resistanceFactor),
    },
    { label: t('sulfurCube.readout.multiplier'), symbol: 'M', value: formatNumber(values.m) },
    {
      label: t('sulfurCube.readout.scaledPower'),
      symbol: '(Hᴹ, Vᴹ)',
      value: formatPair(values.hM, values.vM),
    },
  ]
})

const finalRows = computed<readonly ReadoutRow[]>(() => {
  const values = props.evaluation.callResult.diagnostics

  return [
    {
      label: t('sulfurCube.readout.horizontalBeforeClamp'),
      value: formatNumber(values.horizontalBeforeClamp),
    },
    {
      label: t('sulfurCube.readout.horizontalResult'),
      value: formatNumber(values.horizontalResult),
    },
    {
      label: t('sulfurCube.readout.verticalBeforeClamp'),
      value: formatNumber(values.verticalBeforeClamp),
    },
    { label: t('sulfurCube.readout.verticalResult'), value: formatNumber(values.verticalResult) },
    {
      label: t('sulfurCube.readout.callVelocityBefore'),
      value: formatVector(
        props.evaluation.preAttackVelocity.x,
        props.evaluation.preAttackVelocity.y,
        props.evaluation.preAttackVelocity.z,
      ),
    },
    {
      label: t('sulfurCube.readout.callVelocityAdded'),
      value: formatVector(
        props.evaluation.callResult.addedVelocity.x,
        props.evaluation.callResult.addedVelocity.y,
        props.evaluation.callResult.addedVelocity.z,
      ),
    },
    {
      label: t('sulfurCube.readout.callVelocityAfter'),
      value: formatVector(
        props.evaluation.callResult.resultingVelocity.x,
        props.evaluation.callResult.resultingVelocity.y,
        props.evaluation.callResult.resultingVelocity.z,
      ),
    },
  ]
})

const completeAttackRows = computed<readonly ReadoutRow[]>(() => [
  {
    label: t('sulfurCube.readout.preAttackVelocity'),
    value: formatVector(
      props.evaluation.preAttackVelocity.x,
      props.evaluation.preAttackVelocity.y,
      props.evaluation.preAttackVelocity.z,
    ),
  },
  {
    label: t('sulfurCube.readout.addedVelocity'),
    value: formatVector(
      props.evaluation.attackAddedVelocity.x,
      props.evaluation.attackAddedVelocity.y,
      props.evaluation.attackAddedVelocity.z,
    ),
  },
  {
    label: t('sulfurCube.readout.resultingVelocity'),
    value: formatVector(
      props.evaluation.launchVelocity.x,
      props.evaluation.launchVelocity.y,
      props.evaluation.launchVelocity.z,
    ),
  },
])

const trajectoryRows = computed<readonly ReadoutRow[]>(() => {
  const trajectory = props.evaluation.trajectory
  const firstTick = trajectory.ticks[0]
  const endpoint = trajectory.endpoint

  return [
    {
      label: t('sulfurCube.readout.requestedTickHorizon'),
      value: formatNumber(trajectory.requestedMaximumTicks),
    },
    { label: t('sulfurCube.readout.simulatedTicks'), value: formatNumber(trajectory.ticks.length) },
    {
      label: t('sulfurCube.readout.trajectoryStatus'),
      value: t(`sulfurCube.readout.trajectoryStatus.${trajectory.status}`),
    },
    {
      label: t('sulfurCube.readout.uniformFloor'),
      value: t(`sulfurCube.floor.${props.evaluation.inputs.floorProfileId}`),
    },
    { label: t('sulfurCube.readout.gravity'), value: formatNumber(trajectory.assumptions.gravity) },
    {
      label: t('sulfurCube.readout.drag'),
      value:
        firstTick === undefined
          ? t('sulfurCube.readout.notReached')
          : formatNumber(firstTick.airDrag),
    },
    {
      label: t('sulfurCube.readout.initialGroundFriction'),
      value:
        firstTick === undefined
          ? t('sulfurCube.readout.notReached')
          : formatNumber(firstTick.startGroundFriction),
    },
    {
      label: t('sulfurCube.readout.initialGroundFactor'),
      value:
        firstTick === undefined
          ? t('sulfurCube.readout.notReached')
          : formatNumber(firstTick.horizontalTravelFactor),
    },
    {
      label: t('sulfurCube.readout.cutoff'),
      value: formatNumber(trajectory.assumptions.movementCutoff),
    },
    {
      label: t('sulfurCube.readout.contactTick'),
      value:
        trajectory.firstFloorCollision === null
          ? t('sulfurCube.readout.notReached')
          : formatNumber(trajectory.firstFloorCollision.end.tick),
    },
    {
      label: t('sulfurCube.readout.airborneContacts'),
      value: formatNumber(trajectory.airborneContactCount),
    },
    {
      label: t('sulfurCube.readout.floorCollisionTicks'),
      value: formatNumber(trajectory.floorCollisionTickCount),
    },
    {
      label: t('sulfurCube.readout.bounceEvents'),
      value: formatNumber(trajectory.bounceEventCount),
    },
    { label: t('sulfurCube.readout.arcCount'), value: formatNumber(trajectory.arcCount) },
    {
      label: t('sulfurCube.readout.endpointCoordinates'),
      value: formatEndpointCoordinateVector(
        endpoint.feetPosition.x,
        endpoint.feetPosition.y,
        endpoint.feetPosition.z,
      ),
    },
    {
      label: t('sulfurCube.readout.finalVelocity'),
      value: formatVector(endpoint.velocity.x, endpoint.velocity.y, endpoint.velocity.z),
    },
  ]
})

const readoutSections = computed(() => [
  { id: 'geometry', title: t('sulfurCube.readout.geometry'), rows: geometryRows.value },
  { id: 'power', title: t('sulfurCube.readout.powerStages'), rows: powerRows.value },
  { id: 'cap', title: t('sulfurCube.readout.cap'), rows: capRows.value },
  { id: 'scaling', title: t('sulfurCube.readout.scaling'), rows: scalingRows.value },
  { id: 'final', title: t('sulfurCube.readout.finalScalars'), rows: finalRows.value },
  {
    id: 'completeAttack',
    title: t('sulfurCube.readout.completeAttack'),
    rows: completeAttackRows.value,
  },
  { id: 'trajectory', title: t('sulfurCube.readout.trajectory'), rows: trajectoryRows.value },
])
</script>

<template>
  <section
    class="mechanics-readout"
    :aria-labelledby="
      props.showSummary && props.showTitle ? 'sulfur-cube-results-title' : undefined
    "
    :aria-label="
      props.showSummary && !props.showTitle
        ? t('sulfurCube.readout.title')
        : !props.showSummary
          ? t('sulfurCube.readout.details')
          : undefined
    "
  >
    <h3
      v-if="props.showSummary && props.showTitle"
      id="sulfur-cube-results-title"
      class="mechanics-readout__title"
    >
      {{ t('sulfurCube.readout.title') }}
    </h3>

    <dl
      v-if="props.showSummary"
      class="summary-grid"
      :class="{ 'summary-grid--single': props.summaryLayout === 'single' }"
    >
      <div
        v-for="row in summaryRows"
        :key="row.label"
        class="summary-grid__item"
        :class="{ 'summary-grid__item--warning': row.warning }"
      >
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>

    <CdxAccordion
      v-if="props.showDetails"
      :class="{ 'mechanics-readout__details--untitled': !props.showDetailsTitle }"
      :open="props.showDetailsTitle ? undefined : true"
      heading-level="h4"
      separation="outline"
    >
      <template #title>
        <span v-if="props.showDetailsTitle">{{ t('sulfurCube.readout.details') }}</span>
      </template>

      <div class="readout-sections">
        <p class="readout-scope-note">{{ t('sulfurCube.readout.scopeNote') }}</p>
        <table v-for="section in readoutSections" :key="section.id" class="readout-table">
          <caption>
            {{
              section.title
            }}
          </caption>
          <tbody>
            <tr v-for="row in section.rows" :key="`${section.id}-${row.label}`">
              <th scope="row">
                {{ row.label }}
                <code v-if="row.symbol">{{ row.symbol }}</code>
              </th>
              <td>{{ row.value }}</td>
            </tr>
          </tbody>
        </table>

        <section class="provenance" aria-labelledby="sulfur-cube-provenance-title">
          <h4 id="sulfur-cube-provenance-title">
            {{ t('sulfurCube.readout.provenance') }}
          </h4>
          <ul>
            <li>{{ t('sulfurCube.readout.provenanceBehavior') }}</li>
            <li>{{ t('sulfurCube.readout.provenanceData') }}</li>
            <li>{{ t('sulfurCube.readout.standardMath') }}</li>
          </ul>
        </section>
      </div>
    </CdxAccordion>
  </section>
</template>

<style scoped>
.mechanics-readout {
  min-width: 0;
}

.mechanics-readout__title {
  margin: 0 0 0.75rem;
}

.mechanics-readout__details--untitled {
  border: 0;
}

.mechanics-readout__details--untitled :deep(summary) {
  display: none;
}

.mechanics-readout__details--untitled :deep(.cdx-accordion__content) {
  padding: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0 0 1rem;
}

.summary-grid--single {
  grid-template-columns: 1fr;
}

.summary-grid__item {
  min-width: 0;
  padding: 0.625rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 2px;
  background: var(--background-color-interactive-subtle, #f8f9fa);
}

.summary-grid__item--warning {
  border-color: var(--border-color-warning, #ac6600);
  background: var(--background-color-warning-subtle, #fef6e7);
}

.summary-grid dt {
  color: var(--color-subtle, #54595d);
  font-size: 0.875em;
}

.summary-grid dd {
  margin: 0.125rem 0 0;
  overflow-wrap: anywhere;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
}

.readout-sections {
  display: grid;
  gap: 1rem;
}

.readout-scope-note {
  margin: 0;
  color: var(--color-subtle, #54595d);
  font-size: 0.875em;
}

.readout-table {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.readout-table caption {
  padding-bottom: 0.25rem;
  font-weight: 700;
  text-align: left;
}

.readout-table th,
.readout-table td {
  padding: 0.3rem 0.4rem;
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
  text-align: left;
  vertical-align: top;
}

.readout-table th {
  width: 54%;
  font-weight: 400;
}

.readout-table td {
  overflow-wrap: anywhere;
  font-family: monospace;
}

.readout-table code {
  display: inline-block;
  margin-left: 0.25rem;
  white-space: nowrap;
}

.provenance h4 {
  margin-top: 0;
}

.provenance ul {
  margin: 0.25rem 0 0;
  padding-left: 1.5rem;
}

@media (max-width: 32rem) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .readout-table th,
  .readout-table td {
    display: block;
    width: auto;
  }

  .readout-table td {
    padding-top: 0;
    border-top: 0;
  }
}
</style>
