<script setup lang="ts">
import * as d3 from 'd3'
import { blockMap, getColor } from './data.ts'
import Plot from './Plot.ts'
import { computed } from 'vue'

const props = defineProps<{
  blocks: string[]
  blockNames: string[]
}>()

const blockMapFiltered = blockMap.filter((d) => props.blocks.includes(d.block))
const element = computed(() => {
  // Declare the chart dimensions and margins.
  const width = 640
  const height = 400
  const marginTop = 20
  const marginRight = 20
  const marginBottom = 30
  const marginLeft = 40

  // Declare the x (horizontal position) scale.
  const x = d3
    .scaleLinear()
    .domain([-64, 255])
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
    .call((g) =>
      g
        .selectAll('.tick line')
        .clone()
        .attr('stroke-opacity', 0.1)
        .attr('y1', -height)
    )
    .call((g) =>
      g
        .append('text')
        .attr('x', width - marginRight)
        .attr('y', -4)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'end')
        .text('Y level →')
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
        .text('↑ Number of X found among 100,000 blocks')
    )

  // Compute the points in pixel space as [x, y, z], where z is the name of the series.
  const points = blockMapFiltered.map((d) => [
    x(d.pos),
    y(d.count),
    d.block,
  ]) as [number, number, string][]

  // Group the points by series.
  const groups = d3.rollup(
    points,
    (v) => Object.assign(v, { z: v[0][2] }),
    (d) => d[2]
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

  dot
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('y', -8)
    .attr('fill', 'currentColor')

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
    path
      .style('stroke', ({ z }) => (z === k ? 'steelblue' : getColor(z)))
      .filter(({ z }) => z === k)
      .raise()
    dot.attr('transform', `translate(${x1},${y1})`)
    const formatter = d3.format('d')
    dot.select('text').html(
      `<tspan x="0" dy="1.2em">${formatter(y.invert(y1))} in 100,000</tspan>
        <tspan x="0" dy="1.2em">Y=${formatter(x.invert(x1))}</tspan>
        <tspan x="0" dy="1.2em">${k}</tspan>`
    )
  }

  function pointerentered() {
    path.style('mix-blend-mode', null).style('stroke', 'currentColor')
    dot.attr('display', null)
  }

  function pointerleft() {
    path
      .style('mix-blend-mode', 'multiply')
      .style('stroke', ({ z }) => getColor(z))
    dot.attr('display', 'none')
  }
})
</script>
<template>
  <h4>Block distribution for {{ props.blocks.join(', ') }}</h4>
  <div style="display: flex; flex-wrap: wrap; margin-bottom: 0.5rem">
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
  <Plot :element="element" />
  <p style="font-size: 80%">
    Credit to User:Meeples10 whose work on MCResourceAnalyzer made this graph
    possible.
  </p>
</template>
