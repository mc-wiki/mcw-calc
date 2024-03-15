<script setup lang="ts">
const props = defineProps<{
  for: string
}>()
</script>
<template>
  <label class="mcw-calc-label" :for="props.for">
    <slot />
  </label>
</template>
<style>
.mcw-calc-label {
  font-weight: bold;
}
</style>
