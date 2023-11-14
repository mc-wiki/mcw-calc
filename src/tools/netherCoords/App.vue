<script setup lang="ts">
import { ref } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'
const count = ref(0)
const increment = () => count.value++
</script>
<template>
  <CdxTextInput v-model="count" inputType="number" @click="increment" />
</template>
