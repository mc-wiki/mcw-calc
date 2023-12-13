<script setup lang="ts">
import * as d3 from 'd3'
import { overworldBlockMap, netherBlockMap, endBlockMap, getColor } from './data.ts'
import Plot from './Plot.ts'
import { computed, ref } from 'vue'
import { CdxTab, CdxTabs } from '@wikimedia/codex'

const props = defineProps<{
  blocks: string[]
  blockNames: string[]
}>()

const overworldBlockMapFiltered = overworldBlockMap.filter((d) => props.blocks.includes(d.block))
const netherBlockMapFiltered = netherBlockMap.filter((d) => props.blocks.includes(d.block))
const endBlockMapFiltered = endBlockMap.filter((d) => props.blocks.includes(d.block))

const currentTab = ref(
  overworldBlockMapFiltered.length !== 0
    ? 'overworld'
    : netherBlockMapFiltered.length !== 0
      ? 'nether'
      : 'end',
)

function plot(blockMapFiltered: typeof overworldBlockMapFiltered, domain: [number, number]) {
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

  // Declare the x (horizontal position) scale.
  const x = d3
    .scaleLinear()
    .domain(domain)
    .range([marginLeft, width - marginRight])

  // Declare the y (vertical position) scale.
  const y = d3
    .scaleLog()
    .domain(d3.extent(blockMapFiltered, (d) => d.count) as [number, number])
    .range([height - marginBottom, marginTop])

  // Create the SVG container.
  const svg = d3.create('svg').attr('width', width).attr('height', height)

  // Add the x-axis.
  svg
    .append('g')
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
  const points = blockMapFiltered.map((d) => [x(d.pos), y(d.count), d.block]) as [
    number,
    number,
    string,
  ][]

  if (props.blocks.length > 1) {
    // Also add a group for the total count.
    const total = []
    for (let i = -64; i < 256; i++) {
      total.push([
        x(i),
        y(
          blockMapFiltered
            .filter((b) => b.pos === i)
            .reduce((a, b) => a + (b.count <= 0.0001 ? 0 : b.count), 0.0001),
        ),
        'Total',
      ] as [number, number, string])
    }
    points.push(...total)
  }

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
  const dot = svg.append('g').attr('display', 'none')

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

const overworld = computed(() => plot(overworldBlockMapFiltered, [-64, 255]))
const nether = computed(() => plot(netherBlockMapFiltered, [0, 127]))
const end = computed(() => plot(endBlockMapFiltered, [0, 255]))
</script>
<template>
  <h4>Block distribution for {{ props.blockNames.join(', ') }}</h4>
  <p style="font-size: 80%">
    Note that this chart utilizes the logarithmic scale, which means a slight difference in the
    Y-coordinate represents a large change in the relative frequency of a block type. Credit to
    User:Meeples10 whose work on MCResourceAnalyzer made this chart possible.
  </p>
  <div style="display: flex; flex-wrap: wrap; margin-bottom: 0.5rem">
    <div
      v-if="props.blocks.length > 1"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
        font-size: 90%;
      "
    >
      <div
        :style="{
          width: '1rem',
          height: '1rem',
          backgroundColor: 'steelblue',
          marginRight: '0.3rem',
        }"
      />
      Total
    </div>
    <div
      v-for="(block, index) in props.blocks"
      :key="block"
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 0.75rem;
        font-size: 90%;
      "
    >
      <div
        :style="{
          width: '1rem',
          height: '1rem',
          backgroundColor: getColor(block),
          marginRight: '0.3rem',
        }"
      />
      {{ props.blockNames[index] }}
    </div>
  </div>
  <cdx-tabs v-model:active="currentTab">
    <cdx-tab name="overworld" label="Overworld" v-if="overworld">
      <Plot :element="overworld" />
    </cdx-tab>
    <cdx-tab name="nether" label="Nether" v-if="nether">
      <Plot :element="nether" />
    </cdx-tab>
    <cdx-tab name="end" label="The End" v-if="end">
      <Plot :element="end" />
    </cdx-tab>
  </cdx-tabs>
</template>
<style scoped>
.cdx-tabs--quiet > .cdx-tabs__header {
  background-color: transparent;
}
.cdx-tabs__next-scroller {
  display: none;
}

ul.cdx-tabs__list {
  margin: 0;
}
</style>
