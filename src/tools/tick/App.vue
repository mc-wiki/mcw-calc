<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'
import { CdxTextInput } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'

const { t } = useI18n()

const tps = ref(20)

const mspt = computed({
  get: () => 1000 / tps.value,
  set: (value: number) => {
    if (Number.isNaN(value)) return
    tps.value = 1000 / value
  },
})

const gt = ref(0)

// 1 gt = 1/20 second
// 2 gt = 1 rt

const rt = computed({
  get: () => gt.value / 2,
  set: (value: number) => {
    if (Number.isNaN(value)) return
    gt.value = value * 2
  },
})

const inGameDay = computed({
  get: () => gt.value / 24000,
  set: (value: number) => {
    if (Number.isNaN(value)) return
    gt.value = value * 24000
  },
})

// 1 gt = 1/20 second
const millisecond = computed({
  get: () => Math.floor(((gt.value / tps.value) * 1000) % 1000),
  set: (value: number) => {
    if (Number.isNaN(value)) return
    gt.value = gt.value + ((value - millisecond.value) / 1000) * tps.value
  },
})

const second = computed({
  get: () => Math.floor((gt.value / tps.value) % 60),
  set: (value: number) => {
    if (Number.isNaN(value)) return
    gt.value = gt.value + (value - second.value) * tps.value
  },
})

const minute = computed({
  get: () => Math.floor((gt.value / tps.value / 60) % 60),
  set: (value: number) => {
    if (Number.isNaN(value)) return
    gt.value = gt.value + (value - minute.value) * tps.value * 60
  },
})

const hour = computed({
  get: () => Math.floor((gt.value / tps.value / 60 / 60) % 24),
  set: (value: number) => {
    if (Number.isNaN(value)) return
    gt.value = gt.value + (value - hour.value) * tps.value * 60 * 60
  },
})

const day = computed({
  get: () => Math.floor(gt.value / tps.value / 60 / 60 / 24),
  set: (value: number) => {
    if (Number.isNaN(value)) return
    gt.value = gt.value + (value - day.value) * tps.value * 60 * 60 * 24
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
          <div id="gt" class="input-input">
            <CdxTextInput v-model="gt" class="text-center min-w-16" input-type="number" />
            {{ t('tick.gt') }}
          </div>
        </div>

        <div class="h-full">
          <div class="input-symbol text-xl mx-1">=</div>
        </div>

        <div class="input-item">
          <div id="rt" class="input-input">
            <CdxTextInput v-model="rt" class="text-center min-w-16" input-type="number" />
            {{ t('tick.rt') }}
          </div>
        </div>

        <div class="h-full">
          <div class="input-symbol text-xl mx-1">=</div>
        </div>

        <div class="input-item">
          <div id="inGameDay" class="input-input">
            <CdxTextInput v-model="inGameDay" class="text-center min-w-16" input-type="number" />
            {{ t('tick.inGameDay') }}
          </div>
        </div>
      </div>

      <div class="flex overflow-x-auto items-center gap-1">
        <div class="h-full">
          <div class="input-symbol text-xl mx-1">=</div>
        </div>

        <div class="input-item">
          <div id="day" class="input-input">
            <CdxTextInput v-model="day" class="text-center min-w-16" input-type="number" />
            {{ t('tick.day') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div id="hour" class="input-input">
            <CdxTextInput v-model="hour" class="text-center min-w-16" input-type="number" />
            {{ t('tick.hour') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div id="minute" class="input-input">
            <CdxTextInput v-model="minute" class="text-center min-w-16" input-type="number" />
            {{ t('tick.minute') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div id="second" class="input-input">
            <CdxTextInput v-model="second" class="text-center min-w-16" input-type="number" />
            {{ t('tick.second') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">.</div>
          <div id="millisecond" class="input-input">
            <CdxTextInput v-model="millisecond" class="text-center min-w-16" input-type="number" />
            {{ t('tick.millisecond') }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <div class="h-full">
          <div class="input-symbol mx-1">
            {{ t('tick.runningAt') }}
          </div>
        </div>

        <div class="input-item">
          <div id="tps" class="input-input">
            <CdxTextInput v-model="tps" class="text-center min-w-16" input-type="number" />
            <span class="explain" :title="t('tick.tps.explain')">{{ t('tick.tps') }}</span>
          </div>
        </div>

        <div class="h-full">
          <div class="input-symbol text-xl mx-1">=</div>
        </div>

        <div class="input-item">
          <div id="tps" class="input-input">
            <CdxTextInput v-model="mspt" class="text-center min-w-16" input-type="number" />
            <span class="explain" :title="t('tick.mspt.explain')">{{ t('tick.mspt') }}</span>
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
  width: 84px;
  resize: horizontal;
}
</style>
