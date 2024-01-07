<script setup lang="ts"></script>
<template>
  <div class="mcw-calc-field">
    <h2 class="mcw-calc-field-header">
      <slot name="heading">Calculator</slot>
    </h2>
    <slot />
  </div>
</template>
<style>
.mcw-calc-field {
  border-radius: 4px;
  border: 1px solid #ccc;
  padding: 1em;
  margin: 1em 0;
}

.mcw-calc-field-header {
  font-weight: bold;
  font-size: 16px;
  margin: 0 0 1em 0;
}
</style>
