<script setup lang="ts">
import * as Plot from '@observablehq/plot'
import PlotFigure from './PlotFigure.ts'
import { blockMap, getColor } from './data.ts'
</script>
<template>
  <PlotFigure
    :options="{
      marginLeft: 70,
      color: { legend: true },
      x: { label: 'Y Level', grid: true },
      y: {
        label: 'Number of X found among 100,000 blocks',
        type: 'log',
        tickFormat: 'f',
      },
      marks: [
        Plot.line(blockMap, {
          x: 'pos',
          y: 'count',
          z: 'block',
          stroke: 'block',
          curve: 'catmull-rom',
        }),
        Plot.crosshair(blockMap, { x: 'pos', y: 'count' }),
      ],
    }"
  />
  <p style="font-size: 80%">
    Credit to User:Meeples10 whose work on MCResourceAnalyzer made this graph
    possible.
  </p>
</template>
