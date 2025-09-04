<script setup lang="ts">
import { CdxField, CdxTextInput } from '@wikimedia/codex'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'

const { t } = useI18n()

const distanceMeter = ref(0)
const speedMeterPerSecond = ref(1)
const timeSecond = computed(() => distanceMeter.value / speedMeterPerSecond.value)

const coordinate1 = ref({ x: 0, z: 0 })
const coordinate2 = ref({ x: 0, z: 0 })

const angleDegree = computed(() => {
  // north: 180, east: -90, south: 0, west: 90
  const dx = coordinate2.value.x - coordinate1.value.x
  const dz = coordinate2.value.z - coordinate1.value.z

  const degrees = (Math.atan2(dz, dx) / Math.PI) * 180 - 90
  return degrees < -180 ? degrees + 360 : degrees
})
const direction = computed(() => {
  const angle = angleDegree.value
  if (angle < -135) return 'north'
  if (angle < -45) return 'east'
  if (angle < 45) return 'south'
  if (angle < 135) return 'west'
  return 'north'
})
const axis = computed(() => {
  switch (direction.value) {
    case 'north':
      return 'z.negative'
    case 'south':
      return 'z.positive'
    case 'east':
      return 'x.positive'
    case 'west':
      return 'x.negative'
  }
  return 'z.negative'
})

watch(
  [coordinate1, coordinate2],
  () => {
    const dx = coordinate2.value.x - coordinate1.value.x
    const dz = coordinate2.value.z - coordinate1.value.z
    distanceMeter.value = Math.sqrt(dx * dx + dz * dz)
  },
  { deep: true },
)
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('transport.title') }}
    </template>

    <div class="flex flex-wrap gap-4">
      <div class="flex flex-col gap-2">
        <CdxField>
          <template #label>
            {{ t('transport.speed') }}
          </template>
          <div class="flex font-mono items-center gap-2">
            <I18nT keypath="transport.unit.metersPerSecond">
              <template #speed>
                <CdxTextInput v-model="speedMeterPerSecond" class="flex-1" input-type="number" />
              </template>
            </I18nT>
          </div>
        </CdxField>

        <CdxField>
          <template #label>
            {{ t('transport.coordinate1') }}
          </template>

          <div class="flex gap-2">
            <CdxField>
              <template #label> X </template>
              <CdxTextInput v-model="coordinate1.x" input-type="number" />
            </CdxField>
            <CdxField>
              <template #label> Z </template>
              <CdxTextInput v-model="coordinate1.z" input-type="number" />
            </CdxField>
          </div>
        </CdxField>

        <CdxField>
          <template #label>
            {{ t('transport.coordinate2') }}
          </template>

          <div class="flex gap-2">
            <CdxField>
              <template #label> X </template>
              <CdxTextInput v-model="coordinate2.x" input-type="number" />
            </CdxField>
            <CdxField>
              <template #label> Z </template>
              <CdxTextInput v-model="coordinate2.z" input-type="number" />
            </CdxField>
          </div>
        </CdxField>
      </div>

      <div class="flex flex-wrap flex-col gap-4">
        <div class="flex-1 min-h-[180px]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            class="max-h-full max-w-full"
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="15"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--border-color-notice, #54595d)" />
              </marker>

              <marker
                id="arrow-no-inset"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" style="fill: var(--border-color-notice, #54595d)" />
              </marker>
            </defs>

            <!-- axes -->
            <line
              x1="100"
              y1="25"
              x2="100"
              y2="175"
              marker-end="url(#arrow-no-inset)"
              stroke="currentColor"
            />
            <line
              x1="25"
              y1="100"
              x2="175"
              y2="100"
              marker-end="url(#arrow-no-inset)"
              stroke="currentColor"
            />

            <!-- axes labels -->
            <g style="font-size: 12px">
              <text
                x="100"
                y="20"
                text-anchor="middle"
                style="stroke: var(--color-subtle, #54595d)"
              >
                {{ t('transport.plot.north') }}
              </text>
              <text
                x="100"
                y="190"
                text-anchor="middle"
                style="stroke: var(--color-subtle, #54595d)"
              >
                {{ t('transport.plot.south') }}
              </text>
              <text x="0" y="100" text-anchor="start" style="stroke: var(--color-subtle, #54595d)">
                <tspan>{{ t('transport.plot.west.0') }}</tspan>
                <tspan x="0" dy="1.2em">{{ t('transport.plot.west.1') }}</tspan>
              </text>
              <text x="200" y="100" text-anchor="end" style="stroke: var(--color-subtle, #54595d)">
                <tspan x="200">{{ t('transport.plot.east.0') }}</tspan>
                <tspan x="200" dy="1.2em">{{ t('transport.plot.east.1') }}</tspan>
              </text>
            </g>

            <!-- draw the circle with radius 75 -->
            <circle
              cx="100"
              cy="100"
              r="75"
              fill="none"
              style="stroke: var(--border-color-subtle, #c8ccd1)"
            />

            <!-- draw the line between the two coordinates -->
            <line
              :x1="100"
              :y1="100"
              :x2="100 + 75 * Math.cos(((angleDegree + 90) * Math.PI) / 180)"
              :y2="100 + 75 * Math.sin(((angleDegree + 90) * Math.PI) / 180)"
              marker-end="url(#arrow)"
              style="stroke: var(--border-color-notice, #54595d)"
            />

            <!-- draw coordinate 1 as origin -->
            <circle cx="100" cy="100" r="5" style="fill: var(--border-color-progressive, #36c)" />

            <!-- coordinate 2 lies on the circle with radius 95 -->
            <!-- note that north: 180, east: -90, south: 0, west: 90 -->
            <circle
              :cx="100 + 75 * Math.cos(((angleDegree + 90) * Math.PI) / 180)"
              :cy="100 + 75 * Math.sin(((angleDegree + 90) * Math.PI) / 180)"
              r="5"
              style="fill: var(--border-color-destructive, #d73333)"
            />
          </svg>
        </div>
        <div class="flex gap-4 flex-wrap">
          <CdxField>
            <template #label>
              {{ t('transport.distance') }}
            </template>
            <samp>{{ t('transport.unit.meters', { distance: distanceMeter.toFixed(2) }) }}</samp>
          </CdxField>

          <CdxField>
            <template #label>
              {{ t('transport.time') }}
            </template>
            <samp>{{ t('transport.unit.seconds', { time: timeSecond.toFixed(2) }) }}</samp>
          </CdxField>

          <CdxField>
            <template #label>
              {{ t('transport.angle') }}
            </template>

            <I18nT keypath="transport.facing">
              <template #direction>
                {{ t(`transport.direction.${direction}`) }}
              </template>
              <template #axis>
                {{ t(`transport.axis.${axis}`) }}
              </template>
              <template #angle>
                <samp>{{ t('transport.unit.degrees', { angle: angleDegree.toFixed(2) }) }}</samp>
              </template>
            </I18nT>
          </CdxField>
        </div>
      </div>
    </div>
  </CalcField>
</template>

<style lang="less">
@import '@wikimedia/codex-design-tokens/theme-wikimedia-ui-mixin-mode-reset.less';
@import '@wikimedia/codex-design-tokens/theme-wikimedia-ui-mixin-dark.less';

svg {
  .cdx-mode-reset();
}

.dark svg {
  .cdx-mode-dark();
}

.cdx-field {
  margin-top: 0;
}

.cdx-text-input {
  min-width: 150px;
}
</style>
