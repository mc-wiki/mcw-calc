<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { computed, ref } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'

const { t } = useI18n()

const gt = ref(0)

// 1 gt = 1/20 second
// 2 gt = 1 rt

const rt = computed({
  get: () => gt.value / 2,
  set: (value: number) => {
    if (isNaN(value)) return rt.value
    gt.value = value * 2
  },
})

// 1 gt = 1/20 second
const millisecond = computed({
  get: () => ((gt.value / 20) * 1000) % 1000,
  set: (value: number) => {
    if (isNaN(value)) return rt.value
    gt.value = gt.value + Math.floor((value - millisecond.value) / 1000) * 20
  },
})

const second = computed({
  get: () => Math.floor((gt.value / 20) % 60),
  set: (value: number) => {
    if (isNaN(value)) return rt.value
    gt.value = gt.value + (value - second.value) * 20
  },
})

const minute = computed({
  get: () => Math.floor((gt.value / 20 / 60) % 60),
  set: (value: number) => {
    if (isNaN(value)) return rt.value
    gt.value = gt.value + (value - minute.value) * 20 * 60
  },
})

const hour = computed({
  get: () => Math.floor((gt.value / 20 / 60 / 60) % 24),
  set: (value: number) => {
    gt.value = gt.value + (value - hour.value) * 20 * 60 * 60
  },
})

const day = computed({
  get: () => Math.floor(gt.value / 20 / 60 / 60 / 24),
  set: (value: number) => {
    gt.value = gt.value + (value - day.value) * 20 * 60 * 60 * 24
  },
})
</script>
<template>
  <CalcField>
    <template #heading>
      {{ t('tick.title') }}
    </template>

    <div class="flex flex-wrap gap-2">
      <div class="flex items-center gap-1">
        <div class="input-item">
          <div class="input-input">
            <CdxTextInput class="text-center min-w-16" v-model="gt" inputType="number" />
            {{ t('tick.gt') }}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <div class="h-full">
          <div class="input-symbol text-xl mx-1">=</div>
        </div>

        <div class="input-item">
          <div class="input-input">
            <CdxTextInput class="text-center min-w-16" v-model="rt" inputType="number" />
            {{ t('tick.rt') }}
          </div>
        </div>
      </div>

      <div class="flex overflow-x-auto items-center gap-1">
        <div class="h-full">
          <div class="input-symbol text-xl mx-1">=</div>
        </div>

        <div class="input-item">
          <div class="input-input">
            <CdxTextInput class="text-center min-w-16" v-model="day" inputType="number" />
            {{ t('tick.day') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div class="input-input">
            <CdxTextInput class="text-center min-w-16" v-model="hour" inputType="number" />
            {{ t('tick.hour') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div class="input-input">
            <CdxTextInput class="text-center min-w-16" v-model="minute" inputType="number" />
            {{ t('tick.minute') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div class="input-input">
            <CdxTextInput class="text-center min-w-16" v-model="second" inputType="number" />
            {{ t('tick.second') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">.</div>
          <div class="input-input">
            <CdxTextInput class="text-center min-w-16" v-model="millisecond" inputType="number" />
            {{ t('tick.millisecond') }}
          </div>
        </div>
      </div>
    </div>
  </CalcField>
</template>
<style lang="less">
.cdx-field {
  margin-top: 0;
}

.input-item {
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
}

.input-symbol {
  font-family: monospace;
  vertical-align: text-bottom;
  height: 32px;
  line-height: 32px;
}

.input-input {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cdx-text-input {
  font-family: monospace;
  width: 72px;
}
</style>
