<script setup lang="ts">
import type { max } from 'd3'
import { useFullscreen } from '@vueuse/core'
import { CdxButton, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconClose, cdxIconExitFullscreen, cdxIconFullScreen } from '@wikimedia/codex-icons'
import { ref, useTemplateRef } from 'vue'
import BlockBenchLogo from './blockbench_logo_text.webp'

const props = defineProps<
  (
    | {
        loadtype: 'image' | 'json' | 'miencraft_skin'
        loadname?: string | undefined
        loaddata?: string | undefined
      }
    | {
        m: string
      }
  ) & {
    additionalParams?: string | undefined
  }
>()

const wrapper = useTemplateRef<HTMLElement>('wrapper')

const { isFullscreen, isSupported, enter, exit } = useFullscreen(wrapper)

const loadIframe = ref(false)
const iframeLoaded = ref(false)

const iframeSrc = new URL('https://web.blockbench.net/')
const params = new URLSearchParams(props.additionalParams)
for (const [key, value] of Object.entries(props)) {
  if (key === 'additionalParams') continue
  if (value === undefined) continue
  params.set(key, value)
}

iframeSrc.search = params.toString()
</script>
<template>
  <div
    ref="wrapper"
    class="dark"
    :style="{
      backgroundColor: '#181a1f',
      height: isFullscreen ? '100vh' : '632px',
      maxHeight: '100vh',
    }"
  >
    <div v-if="loadIframe" v-show="iframeLoaded" class="flex flex-col h-full">
      <div class="flex justify-end">
        <CdxButton v-if="isFullscreen" action="progressive" weight="quiet" @click="exit()">
          <CdxIcon :icon="cdxIconExitFullscreen" />
          Exit fullscreen
        </CdxButton>
        <CdxButton v-else action="progressive" weight="quiet" @click="enter()">
          <CdxIcon :icon="cdxIconFullScreen" />
          Enter fullscreen
        </CdxButton>
      </div>
      <iframe
        :src="iframeSrc"
        class="block w-full h-full flex-1"
        style="color-scheme: auto"
        @load="iframeLoaded = true"
      />
    </div>
    <div
      v-if="!iframeLoaded"
      class="flex w-full h-full items-center justify-center bg-[#212e3c] px-6"
    >
      <div class="flex max-w-lg items-center justify-center flex-col gap-4">
        <img :src="BlockBenchLogo" class="inline-block" />
        <CdxProgressBar
          :inline="true"
          class="max-w-[500px]"
          :style="{
            visibility: loadIframe ? 'visible' : 'hidden',
          }"
        />
        <CdxButton
          action="progressive"
          weight="primary"
          size="large"
          :disabled="loadIframe"
          @click="loadIframe = true"
        >
          Open Editor
        </CdxButton>
        <CdxButton
          v-if="isSupported"
          action="progressive"
          weight="quiet"
          :disabled="loadIframe"
          @click="
            () => {
              loadIframe = true
              enter()
            }
          "
        >
          Open in fullscreen
        </CdxButton>
      </div>
    </div>
  </div>
</template>
<style>
.mcw-calc-field {
  padding: 0.5em;
}
</style>
