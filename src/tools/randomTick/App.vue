<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CdxTextInput } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'

const { t } = useI18n()

// ── Inputs ────────────────────────────────────────────────────────────────────

const randomTickSpeed = ref(3)
const stages = ref(7)
const growthChancePct = ref(100)   // user enters as percentage, e.g. 10 for 10%
const avgDropsPerHarvest = ref(1)
const stackSize = ref(64)

// ── Core probability ──────────────────────────────────────────────────────────

// Probability that a given block advances one stage on a single game tick.
// Each subchunk tick fires `randomTickSpeed` attempts across 4096 blocks,
// so the chance of being selected at least once ≈ randomTickSpeed / 4096
// (exact: 1 - ((4095/4096)^randomTickSpeed), but the approximation is
// standard and matches the wiki's figures).
// Then the block's own growth chance (e.g. 10% for nether wart) applies on top.
const p = computed(() => {
  const rts = randomTickSpeed.value
  const gc = growthChancePct.value / 100
  if (rts <= 0 || gc <= 0) return 0
  return (rts / 4096) * gc
})

// ── Average calculations ───────────────────────────────────────────────────────

// Each stage is geometrically distributed with success probability p.
// Mean of a geometric RV = 1/p (in ticks).
const avgTicksPerStage = computed(() => (p.value > 0 ? 1 / p.value : Infinity))

// Total growth = sum of `stages` geometric RVs → mean = stages / p
const avgTicksTotal = computed(() => (p.value > 0 ? stages.value / p.value : Infinity))

const avgSecondsPerStage = computed(() => avgTicksPerStage.value / 20)
const avgSecondsTotal = computed(() => avgTicksTotal.value / 20)

// ── Median calculation (numerical approximation) ──────────────────────────────
//
// Total growth time follows a Negative Binomial distribution NB(stages, p).
// There is no closed-form median, so we walk the CDF until it first reaches
// or exceeds 0.5.  This is an approximation because:
//   1. We use the exact discrete CDF rather than a continuous approximation.
//   2. For extremely small p (huge tick counts), we cap at a practical limit.
//
// CDF of NB(r, p) at k successes-worth-of-trials:
//   P(T ≤ n) = I_p(r, n - r + 1)   [regularised incomplete beta]
// We compute it iteratively via the PMF recurrence instead, which is stable
// and avoids special functions.

const medianTicksTotal = computed((): number | null => {
  const r = stages.value
  const prob = p.value
  if (prob <= 0 || r <= 0) return null

  // PMF of NB(r, prob) at n total trials:
  //   P(T = n) = C(n-1, r-1) * prob^r * (1-prob)^(n-r)
  // We use the log-PMF recurrence to avoid overflow:
  //   logPMF(n+1) = logPMF(n) + log(n) - log(n - r) + log(1 - prob)
  const logProb = Math.log(prob)
  const logQ = Math.log(1 - prob)

  // Start at n = r (minimum possible, all successes)
  // logPMF(r) = r * log(prob)   [C(r-1,r-1)=1, (1-p)^0=1]
  let logPmf = r * logProb
  let cdf = Math.exp(logPmf)

  if (cdf >= 0.5) return r   // degenerate case (p very close to 1)

  const MAX_ITER = 10_000_000
  for (let n = r + 1; n <= r + MAX_ITER; n++) {
    // Recurrence: PMF(n) = PMF(n-1) * (n-1)/(n-r) * (1-p)
    logPmf += Math.log(n - 1) - Math.log(n - r) + logQ
    cdf += Math.exp(logPmf)
    if (cdf >= 0.5) return n
  }

  return null   // exceeded practical limit
})

const medianSecondsTotal = computed(() =>
  medianTicksTotal.value !== null ? medianTicksTotal.value / 20 : null
)

// ── Stack calculator ───────────────────────────────────────────────────────────

const harvestsForStack = computed(() => {
  if (avgDropsPerHarvest.value <= 0) return Infinity
  return Math.ceil(stackSize.value / avgDropsPerHarvest.value)
})

const avgTicksForStack = computed(() =>
  harvestsForStack.value === Infinity ? Infinity : harvestsForStack.value * avgTicksTotal.value
)

const avgSecondsForStack = computed(() => avgTicksForStack.value / 20)

// ── Formatting helpers ─────────────────────────────────────────────────────────

function fmtTicks(t: number): string {
  if (!isFinite(t)) return '∞'
  return t.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function fmtSeconds(s: number): string {
  if (!isFinite(s)) return '∞'
  if (s < 60) return `${s.toFixed(2)}s`
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m < 60) return `${m}m ${sec.toFixed(1)}s`
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h}h ${min}m ${(s % 60).toFixed(0)}s`
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('randomTick.growth.title') }}
    </template>

    <!-- ── Inputs ── -->
    <div class="flex flex-wrap gap-4 mb-6">

      <div class="input-item">
        <div class="input-input">
          <CdxTextInput
            v-model="randomTickSpeed"
            class="text-center min-w-16"
            input-type="number"
            min="1"
          />
          <span class="explain" :title="t('randomTick.growth.rts.explain')">
            {{ t('randomTick.growth.rts') }}
          </span>
        </div>
      </div>

      <div class="input-item">
        <div class="input-input">
          <CdxTextInput
            v-model="stages"
            class="text-center min-w-16"
            input-type="number"
            min="1"
          />
          <span>{{ t('randomTick.growth.stages') }}</span>
        </div>
      </div>

      <div class="input-item">
        <div class="input-input">
          <CdxTextInput
            v-model="growthChancePct"
            class="text-center min-w-16"
            input-type="number"
            min="0.01"
            max="100"
          />
          <span class="explain" :title="t('randomTick.growth.chance.explain')">
            {{ t('randomTick.growth.chance') }}
          </span>
        </div>
      </div>

      <div class="input-item">
        <div class="input-input">
          <CdxTextInput
            v-model="avgDropsPerHarvest"
            class="text-center min-w-16"
            input-type="number"
            min="0.01"
          />
          <span class="explain" :title="t('randomTick.growth.drops.explain')">
            {{ t('randomTick.growth.drops') }}
          </span>
        </div>
      </div>

      <div class="input-item">
        <div class="input-input">
          <CdxTextInput
            v-model="stackSize"
            class="text-center min-w-16"
            input-type="number"
            min="1"
          />
          <span>{{ t('randomTick.growth.stackSize') }}</span>
        </div>
      </div>
    </div>

    <!-- ── Note ── -->
    <p class="rt-note mb-4">
      {{ t('randomTick.growth.optimalNote') }}
    </p>

    <!-- ── Results table ── -->
    <table class="rt-results">
      <thead>
        <tr>
          <th>{{ t('randomTick.growth.metric') }}</th>
          <th>{{ t('randomTick.growth.realTime') }}</th>
          <th>{{ t('randomTick.growth.ticks') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ t('randomTick.growth.avgPerStage') }}</td>
          <td>{{ fmtSeconds(avgSecondsPerStage) }}</td>
          <td>{{ fmtTicks(avgTicksPerStage) }}</td>
        </tr>
        <tr>
          <td>{{ t('randomTick.growth.avgTotal') }}</td>
          <td>{{ fmtSeconds(avgSecondsTotal) }}</td>
          <td>{{ fmtTicks(avgTicksTotal) }}</td>
        </tr>
        <tr>
          <td>
            {{ t('randomTick.growth.medianTotal') }}
            <span class="rt-approx" :title="t('randomTick.growth.medianExplain')">~</span>
          </td>
          <td>{{ medianSecondsTotal !== null ? fmtSeconds(medianSecondsTotal) : '—' }}</td>
          <td>{{ medianTicksTotal !== null ? fmtTicks(medianTicksTotal) : '—' }}</td>
        </tr>
        <tr class="rt-divider">
          <td colspan="3"></td>
        </tr>
        <tr>
          <td>{{ t('randomTick.growth.harvestsForStack', { n: stackSize }) }}</td>
          <td colspan="2">{{ harvestsForStack === Infinity ? '∞' : harvestsForStack }}</td>
        </tr>
        <tr>
          <td>{{ t('randomTick.growth.avgTimeForStack', { n: stackSize }) }}</td>
          <td>{{ fmtSeconds(avgSecondsForStack) }}</td>
          <td>{{ fmtTicks(avgTicksForStack) }}</td>
        </tr>
      </tbody>
    </table>
  </CalcField>
</template>

<style lang="less">
.rt-note {
  font-size: 0.875rem;
  color: var(--color-subtle, #666);
  font-style: italic;
}

.rt-approx {
  display: inline-block;
  margin-left: 4px;
  font-weight: bold;
  color: var(--color-subtle, #888);
  cursor: help;
  font-style: normal;
}

.rt-results {
  border-collapse: collapse;
  width: 100%;
  font-family: monospace;

  th, td {
    padding: 4px 12px;
    text-align: left;
    border: 1px solid var(--border-color-base, #a2a9b1);
  }

  th {
    background: var(--background-color-neutral, #eaecf0);
    font-weight: bold;
  }

  tr:nth-child(even) td {
    background: var(--background-color-neutral-subtle, #f8f9fa);
  }

  .rt-divider td {
    padding: 2px;
    background: var(--border-color-base, #a2a9b1);
    border: none;
  }
}

/* Reuse input layout from tick calc */
.input-item {
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
}

.input-input {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cdx-text-input {
  font-family: monospace;
  width: 84px;
}
</style>
