<script setup lang="ts">
import * as d3 from 'd3'
import { overworldBlockMap, netherBlockMap, endBlockMap, getColor, type Block } from './data.ts'
import { onMounted, ref, computed, onUpdated } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { CdxTab, CdxTabs, CdxCheckbox } from '@wikimedia/codex'

const props = defineProps<{
  blocks: string[]
  blockNames: string[]
}>()

const enabledBlocks = ref(props.blocks.slice())

const overworldBlockMapFiltered = computed(() =>
  overworldBlockMap.filter((d) => enabledBlocks.value.includes(d.block)),
)
const netherBlockMapFiltered = computed(() =>
  netherBlockMap.filter((d) => enabledBlocks.value.includes(d.block)),
)
const endBlockMapFiltered = computed(() =>
  endBlockMap.filter((d) => enabledBlocks.value.includes(d.block)),
)

const currentTab = ref(
  overworldBlockMapFiltered.value.length !== 0
    ? 'overworld'
    : netherBlockMapFiltered.value.length !== 0
      ? 'nether'
      : 'end',
)
const logarithmicScale = useLocalStorage('mcwBlockDistributionLogarithmicScale', true)
const showTotal = useLocalStorage('mcwBlockDistributionShowTotal', true)

function plot(
  blockMapFiltered: Block[],
  domain: [number, number],
  logarithmicScale: boolean,
  showTotal: boolean,
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
  if (blockMapFiltered.length > 1 && showTotal) {
    // Also add a group for the total count.
    const total = []
    for (let i = domain[0]; i <= domain[1]; i++) {
      total.push({
        pos: i,
        count: blockMapFiltered
          .filter((b) => b.pos === i)
          .reduce((a, b) => a + (b.count <= 0.0001 ? 0 : b.count), 0.0001),

        block: 'Total',
        color: getColor('Total'),
      })
    }
    totalPoints.push(...total)
  }

  // Declare the x (horizontal position) scale.
  const x = d3
    .scaleLinear()
    .domain(domain)
    .range([marginLeft, width - marginRight])

  // Declare the y (vertical position) scale.
  const y = (logarithmicScale ? d3.scaleLog() : d3.scaleLinear())
    .domain(d3.extent([...blockMapFiltered, ...totalPoints], (d) => d.count) as [number, number])
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
        .text('Y level →'),
    )

  // Add the y-axis.
  svg
    .append('g')
    .attr('class', 'isolate')
    .attr('transform', `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(10, 'f'))
    .call((g) =>
      g
        .append('text')
        .attr('x', -marginLeft)
        .attr('y', 10)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .text('↑ Number of X found among 100,000 blocks'),
    )

  // Compute the points in pixel space as [x, y, z], where z is the name of the series.
  const points = [...blockMapFiltered, ...totalPoints].map((d) => [
    x(d.pos),
    y(d.count),
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
  const path = svg
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
      `<tspan x="0" dy="1.2em">${formatter(y.invert(y1))} in 100,000</tspan>
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

const overworld = ref<HTMLDivElement>()
const nether = ref<HTMLDivElement>()
const end = ref<HTMLDivElement>()

onUpdated(update)
onMounted(update)

function update() {
  overworld.value?.replaceChildren(
    plot(overworldBlockMapFiltered.value, [-64, 255], logarithmicScale.value, showTotal.value) ||
      document.createElement('div'),
  )
  nether.value?.replaceChildren(
    plot(netherBlockMapFiltered.value, [0, 127], logarithmicScale.value, showTotal.value) ||
      document.createElement('div'),
  )
  end.value?.replaceChildren(
    plot(endBlockMapFiltered.value, [0, 255], logarithmicScale.value, showTotal.value) ||
      document.createElement('div'),
  )
}
</script>
<template>
  <h4>Block distribution for {{ props.blockNames.join(', ') }} in Java Edition</h4>
  <p style="font-size: 80%">
    Data from
    <a
      href="https://github.com/Meeples10/MCResourceAnalyzer"
      target="_blank"
      class="external text"
      rel="noreferrer noopener"
      >MCResourceAnalyzer</a
    >.
  </p>
  <div style="display: flex; flex-wrap: wrap; margin-bottom: 0.5rem">
    <div
      v-if="enabledBlocks.length > 1"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
        font-size: 90%;
      "
    >
      <input
        v-if="props.blocks.length > 1"
        type="checkbox"
        :disabled="enabledBlocks.length === 1"
        v-model="showTotal"
        id="total"
        :style="{
          width: '1rem',
          height: '1rem',
          marginRight: '0.3rem',
          accentColor: getColor('Total'),
        }"
      />
      <label for="total">Total</label>
    </div>
    <div
      v-for="block in props.blocks"
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
        v-if="props.blocks.length > 1"
        type="checkbox"
        :checked="enabledBlocks.includes(block)"
        :disabled="enabledBlocks.length === 1 && enabledBlocks.includes(block)"
        :id="block"
        @change="
          () => {
            if (enabledBlocks.includes(block)) {
              enabledBlocks.splice(enabledBlocks.indexOf(block), 1)
            } else {
              enabledBlocks.push(block)
            }
          }
        "
        :style="{
          width: '1rem',
          height: '1rem',
          marginRight: '0.3rem',
          accentColor: getColor(block),
        }"
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
      <label :for="block">{{ props.blockNames[props.blocks.indexOf(block)] }}</label>
    </div>
  </div>
  <cdx-tabs v-model:active="currentTab">
    <cdx-tab name="overworld" label="Overworld" v-if="overworldBlockMapFiltered.length !== 0">
      <div style="width: 100%; overflow: auto" ref="overworld" />
    </cdx-tab>
    <cdx-tab name="nether" label="Nether" v-if="netherBlockMapFiltered.length !== 0">
      <div style="width: 100%; overflow: auto" ref="nether" />
    </cdx-tab>
    <cdx-tab name="end" label="The End" v-if="endBlockMapFiltered.length !== 0">
      <div style="width: 100%; overflow: auto" ref="end" />
    </cdx-tab>
  </cdx-tabs>
  <cdx-checkbox v-model="logarithmicScale">
    Logarithmic scale
    <div class="oo-ui-labelWidget oo-ui-inline-help">
      Slight difference in the Y-coordinate represents a large change in the relative frequency of a
      block type, making it useful to see small changes on the graph when there is a large spike.
    </div>
  </cdx-checkbox>
</template>
<style>
.cdx-tabs--quiet > .cdx-tabs__header {
  background-color: transparent;
}

.cdx-tabs--quiet > .cdx-tabs__header .cdx-tabs__list__item--enabled [role="tab"] {
  color: var(--content-text-color);
}

.cdx-tabs__next-scroller {
  display: none;
}

ul.cdx-tabs__list {
  margin: 0;
}

g.isolate {
  isolation: isolate;
  pointer-events: none;
}
</style>
