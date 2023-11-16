<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton } from '@wikimedia/codex'
const count = ref(0)
const increment = () => count.value++
</script>
<template>
  <Field>
    Count: {{ count }}
    <CdxButton @click="increment">Increment</CdxButton>
  </Field>
</template>
