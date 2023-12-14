<script setup lang="ts">
const props = defineProps<{
  element: SVGElement
}>()
</script>
<template>
  <div ref="element"></div>
</template>
