<script setup lang="ts">
import { ref } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'
import Field from '@/components/Field.vue'
const seed = ref('')
// Java String.hashCode() implementation
function hashCode(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h
}
</script>
<template>
  <Field>
    <template #heading>Convert a string to actual seed</template>
    <CdxTextInput v-model="seed" />
    Actual seed: <code>{{ hashCode(seed) }}</code>
  </Field>
</template>
