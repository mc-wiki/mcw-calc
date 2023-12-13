<script setup lang="ts">
import { ref, computed } from 'vue'
const edition = ref<'java' | 'bedrock'>('java')
const targetUseCount = ref(0)
const sacrificeUseCount = ref(0)
const rename = ref(false)
const repair = ref(false)
const cost = computed<number>(() => {
  const priorUsePenalty = 2 ** targetUseCount.value + 1 + 2 ** sacrificeUseCount.value + 1
  const renameCost = rename.value ? 1 : 0
  const repairCost = repair.value ? 2 : 0
  if (edition.value === 'java') {
  } else if (edition.value === 'bedrock') {
  }
  return priorUsePenalty + renameCost + repairCost
})
</script>
<template></template>
