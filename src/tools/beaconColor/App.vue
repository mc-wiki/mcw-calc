<script setup lang="ts">
import Field from '@/components/Field.vue'
import { ref, nextTick } from 'vue'
import { CdxButton } from '@wikimedia/codex'
import { type Color, colorToSequence, colorStringToRgb } from './calculate.ts'

const color = ref('#f9fffe')
const sequence = ref<[Color[], number, [number, number, number]]>([['White'], 0, [255, 255, 255]])

async function updateSequence(targetColor: [number, number, number]) {
  await nextTick()
  sequence.value = colorToSequence(targetColor)
}
</script>
<template>
  <Field>
    <template #heading>Calculate glass sequence for a beacon beam color</template>
    <div
      :style="{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '.5rem',
      }"
    >
      <label for="color-picker">Color:</label>
      <input type="color" v-model="color" id="color-picker" />
      <cdx-button @click="updateSequence(colorStringToRgb(color))">Calculate</cdx-button>
    </div>
    <div
      :style="{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '.5rem',
      }"
    >
      Sequence: {{ sequence[0].join(' -> ') }}
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
    </div>
    <div>
      <span
        class="explain"
        title="Delta E is a measure of color proximity. Lower is better. Values ≤1.0 means the difference is not perceptible by human eyes."
      >
        dE
      </span>
      = {{ sequence[1].toFixed(2) }}
    </div>
  </Field>
</template>
