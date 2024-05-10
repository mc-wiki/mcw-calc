<script setup lang="ts">
import { CdxField } from '@wikimedia/codex'
</script>
<template>
  <CdxField class="mcw-calc-field">
    <template #label>
      <slot name="heading">Calculator</slot>
    </template>
    <slot />
  </CdxField>
</template>
<style>
.mcw-calc-field {
  border-radius: 4px;
  border: 1px solid #ccc;
  padding: 1em;
  margin: 1em 0;
}
</style>
