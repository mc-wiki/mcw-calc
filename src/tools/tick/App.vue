<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { computed, ref } from 'vue'
import { CdxField, CdxTextInput } from '@wikimedia/codex'

const { t } = useI18n()

const gt = ref(0)

// 1 gt = 1/20 second
// 2 gt = 1 rt

const rt = computed({
  get: () => gt.value / 2,
  set: (value: number) => {
    gt.value = value * 2
  },
})

// 1 gt = 1/20 second
const millisecond = computed({
  get: () => (gt.value * 50) % 1000,
  set: (value: number) => {
    gt.value = gt.value - (gt.value % 50) + value / 50
  },
})

const second = computed({
  get: () => Math.floor(gt.value / 20) % 60,
  set: (value: number) => {
    gt.value = gt.value - (gt.value % 20) + value * 20
  },
})

const minute = computed({
  get: () => Math.floor(gt.value / 1200) % 60,
  set: (value: number) => {
    gt.value = gt.value - (gt.value % 1200) + value * 1200
  },
})

const hour = computed({
  get: () => Math.floor(gt.value / 72000) % 24,
  set: (value: number) => {
    gt.value = gt.value - (gt.value % 72000) + value * 72000
  },
})

const day = computed({
  get: () => Math.floor(gt.value / 1728000),
  set: (value: number) => {
    gt.value = value * 1728000
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
            <CdxTextInput
              class="text-center min-w-16"
              v-model="gt"
              inputType="text"
              pattern="\d+"
            />
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
            <CdxTextInput
              class="text-center min-w-16"
              v-model="rt"
              inputType="text"
              pattern="\d+"
            />
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
            <CdxTextInput
              class="text-center min-w-16"
              v-model="day"
              inputType="text"
              pattern="\d+"
            />
            {{ t('tick.day') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div class="input-input">
            <CdxTextInput
              class="text-center min-w-16"
              v-model="hour"
              inputType="text"
              pattern="\d+"
            />
            {{ t('tick.hour') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div class="input-input">
            <CdxTextInput
              class="text-center min-w-16"
              v-model="minute"
              inputType="text"
              pattern="\d+"
            />
            {{ t('tick.minute') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">:</div>
          <div class="input-input">
            <CdxTextInput
              class="text-center min-w-16"
              v-model="second"
              inputType="text"
              pattern="\d+"
            />
            {{ t('tick.second') }}
          </div>
        </div>

        <div class="input-item">
          <div class="input-symbol">.</div>
          <div class="input-input">
            <CdxTextInput
              class="text-center min-w-16"
              v-model="millisecond"
              inputType="text"
              pattern="\d+"
            />
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
}
</style>
