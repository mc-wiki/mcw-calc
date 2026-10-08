<script setup lang="ts">
import { CdxCheckbox, CdxTextInput } from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseWikitext } from '@/utils/i18n'
import CalcField from '@/components/CalcField.vue'

const { t } = useI18n()

// ── Types ──────────────────────────────────────────────────────────────────────

interface Entry {
  name: string | string[]  // Single name or list of names; all are linked
  link?: string | string[] // Optional link target(s); if array must match length of name
  stages?: number | null   // omit or null = single-action block (e.g. lit redstone ore)
  growthChance?: number    // 0–1 probability of advancing one stage when ticked; defaults to 1.0
  avgDrops?: number        // Average items dropped per harvest; omit for non-harvestable blocks
  stackSize?: number       // Stack size for that item; defaults to 64
  notes?: string
}

// ── Props ──────────────────────────────────────────────────────────────────────

const props = defineProps<{
  entries: Entry[]
}>()

// ── Inputs ─────────────────────────────────────────────────────────────────────

const randomTickSpeed = ref(3)
const cropCount = ref(1)
const useCropCount = ref(false)
const targetItems = ref(64)

// ── Math ───────────────────────────────────────────────────────────────────────

const SUBCHUNK = 4096

function tickProb(growthChance: number, rts: number): number {
  return (rts / SUBCHUNK) * growthChance
}

function avgTicksPerAction(growthChance: number, rts: number): number {
  return 1 / tickProb(growthChance, rts)
}

function avgTicksTotal(stages: number, growthChance: number, rts: number): number {
  return stages / tickProb(growthChance, rts)
}

// Exact median for a single geometric RV (stages = 1):
// ceil(log(0.5) / log(1 - p))
function exactGeometricMedian(growthChance: number, rts: number): number {
  const prob = tickProb(growthChance, rts)
  return Math.ceil(Math.log(0.5) / Math.log(1 - prob))
}

// Numerical approximation of the median of NB(stages, p).
// Walks the CDF via the log-PMF recurrence until it first reaches ≥ 0.5.
function medianTicksTotal(stages: number, growthChance: number, rts: number): number | null {
  const prob = tickProb(growthChance, rts)
  if (prob <= 0 || stages <= 0) return null

  const logProb = Math.log(prob)
  const logQ = Math.log(1 - prob)

  let logPmf = stages * logProb
  let cdf = Math.exp(logPmf)

  if (cdf >= 0.5) return stages

  const MAX_ITER = 10_000_000
  for (let n = stages + 1; n <= stages + MAX_ITER; n++) {
    logPmf += Math.log(n - 1) - Math.log(n - stages) + logQ
    cdf += Math.exp(logPmf)
    if (cdf >= 0.5) return n
  }
  return null
}

// ── Formatting ─────────────────────────────────────────────────────────────────

function fmtTime(ticks: number): string {
  const totalSeconds = ticks / 20
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}${t('randomTickTable.unit.s')}`
  const totalMinutes = Math.floor(totalSeconds / 60)
  const secs = Math.round(totalSeconds % 60)
  if (totalMinutes < 60) return secs > 0
    ? `${totalMinutes}${t('randomTickTable.unit.m')} ${secs}${t('randomTickTable.unit.s')}`
    : `${totalMinutes}${t('randomTickTable.unit.m')}`
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return mins > 0
    ? `${hours}${t('randomTickTable.unit.h')} ${mins}${t('randomTickTable.unit.m')}`
    : `${hours}${t('randomTickTable.unit.h')}`
}

function fmtTicks(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${t('randomTickTable.unit.gt')}`
}

function renderLink(entry: Entry): string {
  const names = Array.isArray(entry.name) ? entry.name : [entry.name]
  const links = entry.link === undefined
    ? names
    : Array.isArray(entry.link) ? entry.link : [entry.link]

  const linkedItems = names.map((name, i) => {
    const target = links[i] ?? name
    return parseWikitext(`[[${target}|${name}]]`)
  })

  if (linkedItems.length === 1) return linkedItems[0]
  if (linkedItems.length === 2) return `${linkedItems[0]} ${t('randomTickTable.and')} ${linkedItems[1]}`
  const allButLast = linkedItems.slice(0, -1).join(', ')
  return `${allButLast}${t('randomTickTable.oxfordComma')} ${t('randomTickTable.and')} ${linkedItems[linkedItems.length - 1]}`
}

// ── Per-row computed data ──────────────────────────────────────────────────────

interface RowData {
  entry: Entry
  renderedLink: string
  stagesIsNull: boolean
  avgPerAction: number
  avgTotal: number
  medianTotal: number | null
  medianExact: boolean
  avgDrops: number | undefined
  avgTicksForTarget: number | null
}

const rows = computed((): RowData[] => {
  const rts = randomTickSpeed.value
  const crops = useCropCount.value ? Math.max(1, cropCount.value) : 1
  const target = Math.max(1, targetItems.value)

  return props.entries.map((entry): RowData => {
    const effectiveStages = entry.stages ?? 1
    const effectiveGrowthChance = entry.growthChance ?? 1
    const isExact = effectiveStages === 1
    const perAction = avgTicksPerAction(effectiveGrowthChance, rts)
    const total = avgTicksTotal(effectiveStages, effectiveGrowthChance, rts)
    const median = isExact
      ? exactGeometricMedian(effectiveGrowthChance, rts)
      : medianTicksTotal(effectiveStages, effectiveGrowthChance, rts)

    const avgTicksForTarget = entry.avgDrops !== undefined
      ? (Math.ceil(target / (entry.avgDrops * crops)) * total)
      : null

    return {
      entry,
      renderedLink: renderLink(entry),
      stagesIsNull: entry.stages == null,
      avgPerAction: perAction,
      avgTotal: total,
      medianTotal: median,
      medianExact: isExact,
      avgDrops: entry.avgDrops,
      avgTicksForTarget,
    }
  })
})
</script>

<template>
  <CalcField>
    <template #heading>{{ t('randomTickTable.title') }}</template>

    <!-- ── Controls ── -->
    <div class="flex flex-wrap gap-4 mb-4 items-end">

      <div class="input-input">
        <CdxTextInput
          v-model="randomTickSpeed"
          class="text-center min-w-16"
          input-type="number"
          min="1"
        />
        <span class="explain" :title="t('randomTickTable.rts.explain')">
          {{ t('randomTickTable.rts') }}
        </span>
      </div>

      <div class="input-input">
        <CdxTextInput
          v-model="targetItems"
          class="text-center min-w-16"
          input-type="number"
          min="1"
        />
        <span>{{ t('randomTickTable.targetItems') }}</span>
      </div>

      <div class="flex flex-col gap-1">
        <CdxCheckbox v-model="useCropCount">
          {{ t('randomTickTable.useCropCount') }}
        </CdxCheckbox>
        <div class="input-input" :class="{ 'rt-disabled': !useCropCount }">
          <CdxTextInput
            v-model="cropCount"
            class="text-center min-w-16"
            input-type="number"
            min="1"
            :disabled="!useCropCount"
          />
          <span>{{ t('randomTickTable.cropCount') }}</span>
        </div>
      </div>

    </div>

    <p class="rt-note mb-3">
      {{ t('randomTickTable.note') }}
    </p>

    <!-- ── Table ── -->
    <div class="rt-table-wrapper">
      <table class="wikitable rt-table">
        <thead>
          <tr>
            <th>{{ t('randomTickTable.col.block') }}</th>
            <th>{{ t('randomTickTable.col.avgPerAction') }}</th>
            <th>{{ t('randomTickTable.col.avgTotal') }}</th>
            <th>{{ t('randomTickTable.col.medianTotal') }}</th>
            <th>{{ t('randomTickTable.col.avgDrops') }}</th>
            <th>{{ useCropCount
              ? t('randomTickTable.col.avgTimeForItemsWithCrops', targetItems, { named: { n: targetItems, crops: cropCount } })
              : t('randomTickTable.col.avgTimeForItems', targetItems, { named: { n: targetItems } })
            }}</th>
            <th>{{ t('randomTickTable.col.notes') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="index">

            <!-- Name / link -->
            <td v-html="row.renderedLink" />

            <!-- Avg time per action -->
            <td class="rt-time">
              {{ fmtTime(row.avgPerAction) }}
              <span class="rt-ticks">{{ fmtTicks(row.avgPerAction) }}</span>
            </td>

            <!-- Avg total growth -->
            <td class="rt-time">
              <template v-if="row.stagesIsNull">
                ({{ fmtTime(row.avgTotal) }})
                <span class="rt-ticks">({{ fmtTicks(row.avgTotal) }})</span>
              </template>
              <template v-else>
                {{ fmtTime(row.avgTotal) }}
                <span class="rt-ticks">{{ fmtTicks(row.avgTotal) }}</span>
              </template>
            </td>

            <!-- Median total growth -->
            <td class="rt-time">
              <template v-if="row.medianTotal !== null">
                <template v-if="row.medianExact">
                  {{ fmtTime(row.medianTotal) }}
                  <span class="rt-ticks">{{ fmtTicks(row.medianTotal) }}</span>
                </template>
                <template v-else>
                  {{ t('randomTickTable.approx', { value: fmtTime(row.medianTotal) }) }}
                  <span class="rt-ticks">{{ t('randomTickTable.approx', { value: fmtTicks(row.medianTotal) }) }}</span>
                </template>
              </template>
              <template v-else>{{ t('randomTickTable.na') }}</template>
            </td>

            <!-- Avg drops -->
            <td class="rt-center">
              {{ row.avgDrops !== undefined
                ? (row.avgDrops * (useCropCount ? cropCount : 1))
                : t('randomTickTable.na') }}
            </td>

            <!-- Avg time for target items -->
            <td class="rt-time">
              <template v-if="row.avgTicksForTarget !== null">
                {{ fmtTime(row.avgTicksForTarget) }}
                <span class="rt-ticks">{{ fmtTicks(row.avgTicksForTarget) }}</span>
              </template>
              <template v-else>{{ t('randomTickTable.na') }}</template>
            </td>

            <!-- Notes -->
            <td class="rt-notes">{{ row.entry.notes ?? '' }}</td>

          </tr>
        </tbody>
      </table>
    </div>
  </CalcField>
</template>

<style lang="less">
.rt-table-wrapper {
  overflow-x: auto;
}

.rt-note {
  font-size: 0.85rem;
  color: var(--color-subtle, #666);
  font-style: italic;
}

.rt-disabled {
  opacity: 0.4;
  pointer-events: none;
}

.rt-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9rem;

  th, td {
    padding: 5px 10px;
    border: 1px solid var(--border-color-base, #a2a9b1);
    vertical-align: middle;
  }

  th {
    background: var(--background-color-neutral, #eaecf0);
    font-weight: bold;
    white-space: nowrap;
  }

  tr:nth-child(even) td {
    background: var(--background-color-neutral-subtle, #f8f9fa);
  }

  .rt-center {
    text-align: center;
  }

  .rt-time {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .rt-ticks {
    display: block;
    font-size: 0.8em;
    color: var(--color-subtle, #888);
    font-family: monospace;
  }

  .rt-notes {
    font-size: 0.85rem;
    color: var(--color-subtle, #555);
    min-width: 160px;
  }
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