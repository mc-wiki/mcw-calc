<script setup lang="ts">
import type { VelocityOperationResult } from '../model/types'
import type { PlayerMeleeEvaluation } from '../presets/playerMelee'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    evaluation: PlayerMeleeEvaluation
    showTitle?: boolean
  }>(),
  {
    showTitle: true,
  },
)

const { t } = useI18n()
const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
  useGrouping: false,
})

function formatNumber(value: number): string {
  return numberFormatter.format(Object.is(value, -0) ? 0 : value)
}

function formatVector(vector: {
  readonly x: number
  readonly y: number
  readonly z: number
}): string {
  return `(${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)})`
}

function operationTitle(result: VelocityOperationResult): string {
  if (result.operation.provenance.reason === 'ordinaryAcceptedHit') {
    return t('sulfurCube.attack.trace.ordinary')
  }

  if (result.operation.provenance.reason === 'combinedKnockbackAndSprint') {
    return t('sulfurCube.attack.trace.extra')
  }

  return result.operation.provenance.reason
}

function providerLabel(result: VelocityOperationResult): string {
  if (result.operation.providerId === 'nonProjectileSourcePosition') {
    return t('sulfurCube.attack.trace.provider.position')
  }

  if (result.operation.providerId === 'callerYaw') {
    return t('sulfurCube.attack.trace.provider.yaw')
  }

  return result.operation.providerId
}

const diagnostics = computed(() => props.evaluation.attackResolution.diagnostics)

interface ResolutionRow {
  readonly id: string
  readonly label: string
  readonly value: string | number
}

const primaryResolutionRows = computed<readonly ResolutionRow[]>(() => [
  {
    id: 'damage-argument',
    label: t('sulfurCube.attack.trace.damage'),
    value: formatNumber(diagnostics.value.damageArgument),
  },
  {
    id: 'combined-knockback',
    label: t('sulfurCube.attack.trace.combinedKnockback'),
    value: formatNumber(diagnostics.value.combinedKnockback),
  },
  {
    id: 'effect-factor',
    label: t('sulfurCube.attack.trace.effectFactor'),
    value: formatNumber(diagnostics.value.effectFactor),
  },
  {
    id: 'operation-count',
    label: t('sulfurCube.attack.trace.operationCount'),
    value: props.evaluation.operationSequence.operationResults.length,
  },
  {
    id: 'pre-attack-velocity',
    label: t('sulfurCube.readout.preAttackVelocity'),
    value: formatVector(props.evaluation.preAttackVelocity),
  },
  {
    id: 'added-velocity',
    label: t('sulfurCube.readout.addedVelocity'),
    value: formatVector(props.evaluation.attackAddedVelocity),
  },
  {
    id: 'resulting-velocity',
    label: t('sulfurCube.readout.resultingVelocity'),
    value: formatVector(props.evaluation.launchVelocity),
  },
])

const detailedResolutionRows = computed<readonly ResolutionRow[]>(() => [
  {
    id: 'effective-damage',
    label: t('sulfurCube.attack.trace.effectiveDamage'),
    value: formatNumber(diagnostics.value.effectiveAttackDamage),
  },
  {
    id: 'effective-speed',
    label: t('sulfurCube.attack.trace.effectiveSpeed'),
    value: formatNumber(props.evaluation.weaponPreset.effectiveAttackSpeed.value),
  },
  {
    id: 'recovery-ticks',
    label: t('sulfurCube.attack.trace.recoveryTicks'),
    value: formatNumber(props.evaluation.weaponPreset.recoveryPeriodTicks.value),
  },
  {
    id: 'attack-strength-squared',
    label: t('sulfurCube.attack.trace.attackStrengthSquared'),
    value: formatNumber(diagnostics.value.attackStrengthSquared),
  },
  {
    id: 'base-damage-scale',
    label: t('sulfurCube.attack.trace.baseDamageScale'),
    value: formatNumber(diagnostics.value.baseDamageScale),
  },
  {
    id: 'scaled-base-damage',
    label: t('sulfurCube.attack.trace.scaledBaseDamage'),
    value: formatNumber(diagnostics.value.scaledBaseDamage),
  },
  {
    id: 'sharpness-bonus',
    label: t('sulfurCube.attack.trace.sharpnessBonus'),
    value: formatNumber(diagnostics.value.damageEnchantmentBonus),
  },
  {
    id: 'scaled-sharpness-bonus',
    label: t('sulfurCube.attack.trace.scaledSharpnessBonus'),
    value: formatNumber(diagnostics.value.magicBoost),
  },
  {
    id: 'base-before-critical',
    label: t('sulfurCube.attack.trace.baseBeforeCritical'),
    value: formatNumber(diagnostics.value.baseDamageBeforeCritical),
  },
  {
    id: 'damage-after-critical',
    label: t('sulfurCube.attack.trace.damageAfterCritical'),
    value: formatNumber(diagnostics.value.damageAfterCritical),
  },
  {
    id: 'full-strength',
    label: t('sulfurCube.attack.trace.fullStrength'),
    value: t(diagnostics.value.fullStrength ? 'sulfurCube.yes' : 'sulfurCube.no'),
  },
  {
    id: 'critical',
    label: t('sulfurCube.attack.trace.critical'),
    value: t(diagnostics.value.critical ? 'sulfurCube.yes' : 'sulfurCube.no'),
  },
  {
    id: 'health-damage-applied',
    label: t('sulfurCube.attack.trace.healthDamageApplied'),
    value: t(diagnostics.value.healthDamageApplied ? 'sulfurCube.yes' : 'sulfurCube.no'),
  },
  {
    id: 'enchantment-knockback-addition',
    label: t('sulfurCube.attack.trace.enchantmentKnockbackAddition'),
    value: formatNumber(diagnostics.value.enchantmentKnockbackAddition),
  },
  {
    id: 'knockback-before-halving',
    label: t('sulfurCube.attack.trace.knockbackBeforeHalving'),
    value: formatNumber(diagnostics.value.knockbackBeforeHalving),
  },
  {
    id: 'knockback-after-halving',
    label: t('sulfurCube.attack.trace.knockbackAfterHalving'),
    value: formatNumber(diagnostics.value.knockbackAfterHalving),
  },
  {
    id: 'sprint-knockback-bonus',
    label: t('sulfurCube.attack.trace.sprintKnockbackBonus'),
    value: formatNumber(diagnostics.value.sprintKnockbackBonus),
  },
  {
    id: 'yaw',
    label: t('sulfurCube.attack.trace.yaw'),
    value: `${formatNumber(props.evaluation.attackerYawDegrees)}°`,
  },
])
</script>

<template>
  <section
    class="attack-trace"
    :aria-labelledby="showTitle ? 'sulfur-cube-attack-trace-title' : undefined"
    :aria-label="showTitle ? undefined : t('sulfurCube.attack.trace.title')"
  >
    <h3 v-if="showTitle" id="sulfur-cube-attack-trace-title">
      {{ t('sulfurCube.attack.trace.title') }}
    </h3>
    <p class="attack-trace__intro">{{ t('sulfurCube.attack.trace.intro') }}</p>

    <h4 class="attack-trace__group-title">
      {{ t('sulfurCube.attack.trace.resolutionValues') }}
    </h4>
    <dl class="attack-trace__summary">
      <div v-for="row in primaryResolutionRows" :key="row.id">
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>

    <details class="attack-trace__details">
      <summary>{{ t('sulfurCube.attack.trace.showMore') }}</summary>
      <dl class="attack-trace__summary attack-trace__summary--details">
        <div v-for="row in detailedResolutionRows" :key="row.id">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
    </details>

    <h4 class="attack-trace__group-title">{{ t('sulfurCube.attack.trace.orderedCalls') }}</h4>
    <ol class="attack-trace__operations">
      <li
        v-for="(result, index) in evaluation.operationSequence.operationResults"
        :key="`${result.kind}-${index}`"
        class="attack-trace__operation"
      >
        <h4>{{ index + 1 }}. {{ operationTitle(result) }}</h4>
        <dl>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.directionProvider') }}</dt>
            <dd>{{ providerLabel(result) }}</dd>
          </div>
          <template v-if="result.kind === 'sulfurCubeKnockbackCall'">
            <div>
              <dt>{{ t('sulfurCube.attack.trace.callDamage') }}</dt>
              <dd>{{ formatNumber(result.operation.call.damageArgument) }}</dd>
            </div>
            <div>
              <dt>{{ t('sulfurCube.attack.trace.callEffect') }}</dt>
              <dd>{{ formatNumber(result.knockbackResult.diagnostics.effectFactor) }}</dd>
            </div>
          </template>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.before') }}</dt>
            <dd>{{ formatVector(result.existingVelocity) }}</dd>
          </div>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.added') }}</dt>
            <dd>{{ formatVector(result.addedVelocity) }}</dd>
          </div>
          <div>
            <dt>{{ t('sulfurCube.attack.trace.after') }}</dt>
            <dd>{{ formatVector(result.resultingVelocity) }}</dd>
          </div>
        </dl>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.attack-trace {
  min-width: 0;
}

.attack-trace h3,
.attack-trace__intro {
  margin: 0 0 0.75rem;
}

.attack-trace__group-title {
  margin: 0 0 0.5rem;
}

.attack-trace__details {
  margin: -0.25rem 0 1rem;
}

.attack-trace__details summary {
  width: fit-content;
  color: var(--color-progressive, #36c);
  cursor: pointer;
}

.attack-trace__summary--details {
  margin-top: 0.75rem;
}

.attack-trace__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  gap: 0.5rem;
  margin: 0 0 1rem;
}

.attack-trace__summary > div,
.attack-trace__operation {
  padding: 0.625rem;
  border: 1px solid var(--border-color-subtle, #c8ccd1);
  border-radius: 2px;
  background: var(--background-color-interactive-subtle, #f8f9fa);
}

.attack-trace dt {
  color: var(--color-subtle, #54595d);
  font-size: 0.875em;
}

.attack-trace dd {
  margin: 0.125rem 0 0;
  overflow-wrap: anywhere;
}

.attack-trace__summary dd,
.attack-trace__operation dd {
  font-family: monospace;
  font-variant-numeric: tabular-nums;
}

.attack-trace__operations {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.attack-trace__operation h4 {
  margin: 0 0 0.5rem;
}

.attack-trace__operation dl {
  display: grid;
  grid-template-columns: minmax(8rem, 0.9fr) minmax(0, 1.1fr);
  gap: 0.25rem 0.75rem;
  margin: 0;
}

@media (max-width: 36rem) {
  .attack-trace__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .attack-trace__operation dl {
    grid-template-columns: 1fr;
  }
}
</style>
