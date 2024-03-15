<script setup lang="ts"></script>
<template>
  <div class="mcw-calc-field">
    <h4 class="mcw-calc-field-header">
      <slot name="heading">Calculator</slot>
    </h4>
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
  font-size: 16px !important;
  margin: 0 !important;
  padding-top: 0;
}
</style>
