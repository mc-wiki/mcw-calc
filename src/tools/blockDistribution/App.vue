<script setup lang="ts">
import * as Plot from '@observablehq/plot'
import PlotFigure from './PlotFigure.ts'
import { blockMap } from './data.ts'
const props = defineProps<{
  blocks: string[]
}>()
const blockMapFiltered = blockMap.filter((d) => props.blocks.includes(d.block))
</script>
<template>
  <h3></h3>
  <PlotFigure
    :options="{
      marginLeft: 70,
      color: { legend: true },
      x: { label: 'Y level', grid: true },
      y: {
        label: 'Number of X found among 100,000 blocks',
        type: 'log',
        tickFormat: 'f',
      },
      marks: [
        Plot.line(blockMapFiltered, {
          x: 'pos',
          y: 'count',
          z: 'block',
          stroke: 'block',
          curve: 'catmull-rom',
        }),
        Plot.crosshair(blockMapFiltered, { x: 'pos', y: 'count' }),
      ],
    }"
  />
  <p style="font-size: 80%">
    Credit to User:Meeples10 whose work on MCResourceAnalyzer made this graph
    possible.
  </p>
</template>
