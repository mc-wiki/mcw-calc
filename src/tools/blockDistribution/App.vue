<script setup lang="ts">
import * as Plot from '@observablehq/plot'
import PlotFigure from './PlotFigure.ts'
import { blockMap, getColor } from './data.ts'
</script>
<template>
  <PlotFigure
    :options="{
      color: { legend: true },
      x: {
        label: 'Y Level',
      },
      y: {
        label: 'Block count',
        type: 'log',
      },
      marks: [
        Plot.ruleY([0]),
        Plot.line(blockMap, {
          x: 'pos',
          y: 'count',
          z: 'block',
          stroke: 'block',
        }),
      ],
    }"
  />
  <p style="font-size: 80%">
    Credit to User:Meeples10 whose work on MCResourceAnalyzer made this graph
    possible.
  </p>
</template>
