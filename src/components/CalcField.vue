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
