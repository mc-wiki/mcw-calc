<script setup lang="ts">
import type { Block } from './data'
import { useLocalStorage } from '@vueuse/core'
import { CdxCheckbox, CdxTab, CdxTabs } from '@wikimedia/codex'
import * as d3 from 'd3'
import { computed, onMounted, onUpdated, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { parseWikitext } from '@/utils/i18n'
import { theme } from '@/utils/theme'
import { endBlockMap, getColor, netherBlockMap, overworldBlockMap } from './data'

const props = defineProps<{
  blocks: string[]
  blockNames: string[]
  pageName: string
  dimensions: string[]
}>()

const { t } = useI18n()

const validBlocks = props.blocks
  .slice()
  .filter(
    (block) =>
      overworldBlockMap.some((b) => b.block === block) ||
      netherBlockMap.some((b) => b.block === block) ||
      endBlockMap.some((b) => b.block === block),
  )
const enabledBlocks = ref(validBlocks.slice())

const logarithmicScale = useLocalStorage('mcwBlockDistributionLogarithmicScale', false)
const showTotal = useLocalStorage('mcwBlockDistributionShowTotal', true)
const onlyShowTotal = computed(() => enabledBlocks.value.length === 0)
const selectAll = computed({
  get() {
    return enabledBlocks.value.every((block) => !!validBlocks.includes(block))
  },
  set(value) {
    if (value) {
      enabledBlocks.value = validBlocks.slice()
    } else {
      enabledBlocks.value = []
    }
  },
})

const overworldBlockMapFiltered = computed(() => {
  if (onlyShowTotal.value) {
    return overworldBlockMap.filter((d) => validBlocks.includes(d.block))
  }
  if (enabledBlocks.value.length === 0) {
    return []
  }
  return overworldBlockMap.filter((d) => enabledBlocks.value.includes(d.block))
})
const netherBlockMapFiltered = computed(() => {
  if (enabledBlocks.value.length === 0) {
    return []
  }
  if (onlyShowTotal.value) {
    return netherBlockMap.filter((d) => validBlocks.includes(d.block))
  }
  return netherBlockMap.filter((d) => enabledBlocks.value.includes(d.block))
})
const endBlockMapFiltered = computed(() => {
  if (enabledBlocks.value.length === 0) {
    return []
  }
  if (onlyShowTotal.value) {
    return endBlockMap.filter((d) => validBlocks.includes(d.block))
  }
  return endBlockMap.filter((d) => enabledBlocks.value.includes(d.block))
})

const currentTab = ref(
  overworldBlockMapFiltered.value.length !== 0
    ? 'overworld'
    : netherBlockMapFiltered.value.length !== 0
      ? 'nether'
      : 'end',
)

function plot(
  blockMapFiltered: Block[],
  domain: [number, number],
  logarithmicScale: boolean,
  showTotal: boolean,
  onlyShowTotal: boolean,
) {
  if (blockMapFiltered.length === 0) {
    return null
  }

  // Declare the chart dimensions and margins.
  const width = 640
  const height = 400
  const marginTop = 40
  const marginRight = 50
  const marginBottom = 30
  const marginLeft = 60

  const totalPoints: Block[] = []

  if ((enabledBlocks.value.length > 1 && showTotal) || onlyShowTotal) {
    // Also add a group for the total count.
    const total = []
    for (let i = domain[0]; i <= domain[1]; i++) {
      total.push({
        pos: i,
        count: blockMapFiltered.filter((b) => b.pos === i).reduce((a, b) => a + b.count, 0),

        block: 'Total',
        color: getColor('Total'),
      })
    }
    totalPoints.push(...total)
  }

  const countMerged = [...(onlyShowTotal ? [] : blockMapFiltered), ...totalPoints]
  const yMax = d3.max(countMerged, (d) => d.count) as number
  let yMin = d3.min(countMerged, (d) => d.count) as number
  const yContainsZero = yMin <= 0
  if (logarithmicScale && yContainsZero) {
    const logYMax = Math.log10(yMax)
    const logYNonZeroMin = Math.log10(
      d3.min(
        countMerged.filter((d) => d.count > 0),
        (d) => d.count,
      ) as number,
    )
    yMin =
      10 ** (logYMax - logYNonZeroMin > 9 ? Math.floor(logYMax - 9) : Math.floor(logYNonZeroMin))
  }

  // Declare the x (horizontal position) scale.
  const x = d3
    .scaleLinear()
    .domain(domain)
    .range([marginLeft, width - marginRight])

  // Declare the y (vertical position) scale.
  const y = (logarithmicScale ? d3.scaleLog() : d3.scaleLinear())
    .domain([yMin, yMax])
    .range([height - marginBottom, marginTop])

  // Create the SVG container.
  const svg = d3.create('svg').attr('width', width).attr('height', height)

  // Add the x-axis.
  svg
    .append('g')
    .attr('class', 'isolate')
    .attr('transform', `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).ticks(20))
    .call((g) => g.select('.domain').remove())
    .call((g) => g.selectAll('.tick line').clone().attr('stroke-opacity', 0.1).attr('y1', -height))
    .call((g) =>
      g
        .append('text')
        .attr('x', width - marginRight)
        .attr('y', -4)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'end')
        .text(t('blockDistribution.xAxis')),
    )

  // Add the y-axis.
  const yAxis = d3.axisLeft(y).ticks(10, 'f')
  if (logarithmicScale && yContainsZero) {
    const formatter = y.tickFormat(10, 'f')
    yAxis.tickFormat((d) => (d === yMin ? '0' : formatter(d)))
  }
  svg
    .append('g')
    .attr('class', 'isolate')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(yAxis)
    .call((g) =>
      g
        .append('text')
        .attr('x', -marginLeft)
        .attr('y', 10)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .text(t('blockDistribution.yAxis')),
    )

  // Compute the points in pixel space as [x, y, z], where z is the name of the series.
  const points = countMerged.map((d) => [
    x(d.pos),
    y(d.count <= yMin ? yMin : d.count),
    d.block,
  ]) as [number, number, string][]

  // Group the points by series.
  const groups = d3.rollup(
    points,
    (v) => Object.assign(v, { z: v[0][2] }),
    (d) => d[2],
  )

  // Draw the lines.
  const line = d3.line()
  svg
    .append('g')
    .attr('class', 'isolate')
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 1.5)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .selectAll('path')
    .data(groups.values())
    .join('path')
    .style('mix-blend-mode', 'multiply')
    .style('stroke', ({ z }) => getColor(z))
    .attr('d', line as any)

  // Add an invisible layer for the interactive tip.
  const dot = svg.append('g').attr('class', 'isolate').attr('display', 'none')

  dot.append('circle').attr('r', 2.5).attr('fill', 'currentColor')

  dot.append('text').attr('text-anchor', 'middle').attr('y', -8).attr('fill', 'currentColor')

  svg
    .on('pointerenter', pointerentered)
    .on('pointermove', pointermoved)
    .on('pointerleave', pointerleft)
    .on('touchstart', (event) => event.preventDefault())

  // Return the SVG element.
  return svg.node()

  // When the pointer moves, find the closest point, update the interactive tip, and highlight
  // the corresponding line. Note: we don't actually use Voronoi here, since an exhaustive search
  // is fast enough.
  function pointermoved(event: PointerEvent) {
    const [xm, ym] = d3.pointer(event)
    const i = d3.leastIndex(points, ([x, y]) => Math.hypot(x - xm, y - ym))!
    const [x1, y1, k] = points[i]
    dot.attr('transform', `translate(${x1},${y1})`)
    const formatter = d3.format('d')
    dot.select('text').html(
      `<tspan x="0" dy="1.2em">${t('blockDistribution.xInTenThousand', {
        num: formatter(y.invert(y1)),
      })}</tspan>
        <tspan x="0" dy="1.2em">Y=${formatter(x.invert(x1))}</tspan>
        <tspan x="0" dy="1.2em">${k}</tspan>`,
    )
    svg.property('value', points[i][2]).dispatch('input', { bubbles: true } as any)
  }

  function pointerentered() {
    dot.attr('display', null)
  }

  function pointerleft() {
    dot.attr('display', 'none')
    svg.property('value', null)
    svg.dispatch('input', { bubbles: true } as any)
  }
}

function onCheckboxChange(block: string) {
  if (enabledBlocks.value.includes(block)) {
    enabledBlocks.value.splice(enabledBlocks.value.indexOf(block), 1)
  } else {
    enabledBlocks.value.push(block)
  }
}

const overworld = useTemplateRef('overworld')
const nether = useTemplateRef('nether')
const end = useTemplateRef('end')

onUpdated(update)
onMounted(update)
watch(theme, update)

function update() {
  overworld.value?.replaceChildren(
    plot(
      overworldBlockMapFiltered.value,
      [-64, 255],
      logarithmicScale.value,
      showTotal.value,
      onlyShowTotal.value,
    )!,
  )
  nether.value?.replaceChildren(
    plot(
      netherBlockMapFiltered.value,
      [0, 130],
      logarithmicScale.value,
      showTotal.value,
      onlyShowTotal.value,
    )!,
  )
  end.value?.replaceChildren(
    plot(
      endBlockMapFiltered.value,
      [0, 255],
      logarithmicScale.value,
      showTotal.value,
      onlyShowTotal.value,
    )!,
  )
}
</script>

<template>
  <h4
    v-html="
      parseWikitext(
        t('blockDistribution.title', {
          block:
            props.blockNames.length <= 5
              ? Intl.ListFormat // progressive enhancement
                ? new Intl.ListFormat($i18n.locale).format(props.blockNames)
                : props.blockNames.join(', ')
              : props.pageName,
          version: '1.21.7',
        }),
      )
    "
  />
  <div style="display: flex; flex-wrap: wrap; margin-bottom: 0.5rem">
    <div
      v-if="validBlocks.length > 1"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
        font-size: 90%;
      "
    >
      <input
        id="selectAll"
        v-model="selectAll"
        type="checkbox"
        :style="{
          width: '1rem',
          height: '1rem',
          marginRight: '0.3rem',
        }"
      />
      <label for="selectAll">{{ t('blockDistribution.selectAll') }}</label>
    </div>
    <div
      v-if="validBlocks.length > 1"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
        font-size: 90%;
      "
    >
      <input
        id="total"
        v-model="showTotal"
        type="checkbox"
        :disabled="enabledBlocks.length <= 1"
        :style="{
          width: '1rem',
          height: '1rem',
          marginRight: '0.3rem',
          accentColor: getColor('Total'),
        }"
      />
      <label for="total">{{ t('blockDistribution.total') }}</label>
    </div>
    <div
      v-for="block in validBlocks"
      :key="block"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
        font-size: 90%;
      "
    >
      <input
        v-if="validBlocks.length > 1"
        :id="`blockLabel_${block}`"
        type="checkbox"
        :checked="enabledBlocks.includes(block)"
        :style="{
          width: '1rem',
          height: '1rem',
          marginRight: '0.3rem',
          accentColor: getColor(block),
        }"
        @change="() => onCheckboxChange(block)"
      />
      <div
        v-else
        :style="{
          width: '1rem',
          height: '1rem',
          marginRight: '0.3rem',
          backgroundColor: getColor(block),
        }"
      />
      <label :for="`blockLabel_${block}`">{{
        props.blockNames[props.blocks.indexOf(block)]
      }}</label>
    </div>
  </div>
  <CdxTabs v-model:active="currentTab">
    <CdxTab
      v-if="overworldBlockMapFiltered.length !== 0 && props.dimensions.includes('overworld')"
      name="overworld"
      :label="t('blockDistribution.overworld')"
    >
      <div ref="overworld" style="overflow: auto" />
    </CdxTab>
    <CdxTab
      v-if="netherBlockMapFiltered.length !== 0 && props.dimensions.includes('nether')"
      name="nether"
      :label="t('blockDistribution.theNether')"
    >
      <div ref="nether" style="overflow: auto" />
    </CdxTab>
    <CdxTab
      v-if="endBlockMapFiltered.length !== 0 && props.dimensions.includes('end')"
      name="end"
      :label="t('blockDistribution.theEnd')"
    >
      <div ref="end" style="overflow: auto" />
    </CdxTab>
  </CdxTabs>
  <CdxCheckbox v-model="logarithmicScale">
    {{ t('blockDistribution.logarithmicScale') }}
    <template #description>
      {{ t('blockDistribution.logarithmicScaleHelp') }}
    </template>
  </CdxCheckbox>
</template>

<style>
#app {
  overflow-x: auto;
}

g.isolate {
  isolation: isolate;
  pointer-events: none;
}
</style>
