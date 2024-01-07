<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton } from '@wikimedia/codex'
import { type Color, colorToSequence, colorStringToRgb } from './calculate.ts'
import { nextTick } from 'vue'

const color = ref('#f9fffe')
const sequence = ref<[Color[], number, [number, number, number]]>([[], 0, [0, 0, 0]])

async function updateSequence(targetColor: [number, number, number]) {
  await nextTick()
  sequence.value = colorToSequence(targetColor)
}
</script>
<template>
  <label for="color-picker">Color</label>
  <input type="color" v-model="color" id="color-picker" />
  <p>Sequence:</p>
  <ul>
    <li>
      {{ sequence[0].join(' -> ') }} (dE = {{ sequence[1].toFixed(2) }})
      <span
        :style="{
          borderRadius: '50%',
          width: '1em',
          height: '1em',
          display: 'inline-block',
          backgroundColor: `rgb(${sequence[2][0]}, ${sequence[2][1]}, ${sequence[2][2]})`,
          border: '1px solid black',
        }"
      ></span>
    </li>
  </ul>
  <cdx-button @click="updateSequence(colorStringToRgb(color))">Update Color</cdx-button>
</template>
./calculate.js
