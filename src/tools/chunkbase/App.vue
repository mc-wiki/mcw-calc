<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CdxTab, CdxTabs } from '@wikimedia/codex'
import CalcField from '@/components/CalcField.vue'
import { theme } from '@/utils/theme'

const props = defineProps<AppEmbedProps>()

const { t } = useI18n()

interface ChunkbaseEmbedParams {
  /**
   * The seed to display. Note that it must be in numeric form.
   */
  seed: bigint

  /**
   * Whether to enable biomes/terrain rendering.
   */
  showBiomes: boolean

  /**
   * Whether to enables terrain rendering and displaying Y coords on hover.
   */
  terrain: boolean

  /**
   * Minecraft platform, version, and world type. This follows the format of `platform_1_XX_type`.
   * Platform can be `java` or `bedrock`, version can be `1_XX`, and type can be `lb` (large biomes).
   */
  platform:
    | 'java_1_21_lb'
    | 'java_1_21'
    | 'java_1_20_lb'
    | 'java_1_20'
    | 'java_1_19_3_lb'
    | 'java_1_19_3'
    | 'java_1_19_lb'
    | 'java_1_19'
    | 'java_1_18_lb'
    | 'java_1_18'
    | 'java_1_17_lb'
    | 'java_1_17'
    | 'java_1_16_lb'
    | 'java_1_16'
    | 'java_1_15_lb'
    | 'java_1_15'
    | 'java_1_14_lb'
    | 'java_1_14'
    | 'java_1_13_lb'
    | 'java_1_13'
    | 'java_1_12_lb'
    | 'java_1_12'
    | 'java_1_11_lb'
    | 'java_1_11'
    | 'java_1_10_lb'
    | 'java_1_10'
    | 'java_1_9_lb'
    | 'java_1_9'
    | 'java_1_8_lb'
    | 'java_1_8'
    | 'java_1_7_lb'
    | 'java_1_7'
    | 'bedrock_1_21'
    | 'bedrock_1_20_60'
    | 'bedrock_1_20'
    | 'bedrock_1_19'
    | 'bedrock_1_18'
    | 'bedrock_1_17'
    | 'bedrock_1_16'
    | 'bedrock_1_14'

  /**
   * The point of interest to mark on the mark.
   */
  pois:
    | 'Ag'
    | 'Ac'
    | 'Br'
    | 'Bt'
    | 'Ca'
    | 'Dt'
    | 'Dw'
    | 'D'
    | 'E'
    | 'Eg'
    | 'F'
    | 'I'
    | 'IOw'
    | 'J'
    | 'Lp'
    | 'M'
    | 'N'
    | 'Om'
    | 'Or'
    | 'Ov'
    | 'Po'
    | 'Rv'
    | 'Rpn'
    | 'Rp'
    | 'Sw'
    | 'Sc'
    | 'Sp'
    | 'St'
    | 'Tr'
    | 'Tc'
    | 'V'
    | 'Wh'
    | 'Ma'
    | null

  /**
   * The height at which biome is calculated.
   * - `depth0`: at surface
   * - `caveDepth`: at cave level
   * - `bottom`: at Y=-51
   */
  biomeHeight: 'depth0' | 'caveDepth' | 'bottom'

  /**
   * The initial zoom level of the map.
   * Should be a number between float between -0.5 (64 blocks per pixel) and 1.5 (0.25 blocks per pixel).
   */
  zoom: number

  /**
   * The initial X coordinate of the center of the map.
   */
  x: number

  /**
   * The initial Z coordinate of the center of the map.
   */
  z: number

  /**
   * The dimension the map is in.
   */
  dimension: 'overworld' | 'nether' | 'end'
}

interface AppEmbedProps extends ChunkbaseEmbedParams {
  /**
   * Whether to lead reader to Chunkbase's apps page.
   */
  promo: boolean

  /**
   * Whether to enable a toggle between Java and Bedrock.
   */
  multiplatform: boolean
}

const params = ref(props)
const edition = ref<'java' | 'bedrock'>('java')

const chunkbaseUrl = computed(() => {
  const normalizedParams: Record<string, string> = {}
  for (const [key, value] of Object.entries(params.value)) {
    if (key === 'platform' && params.value.multiplatform === true) {
      normalizedParams[key] = edition.value === 'java' ? 'java_1_21' : 'bedrock_1_21'
    } else if (typeof value === 'string') {
      normalizedParams[key] = value
    } else if (typeof value === 'boolean') {
      if (value) normalizedParams[key] = 'true'
    } else if (value !== null) {
      normalizedParams[key] = value.toString()
    }
  }

  const searchParams = new URLSearchParams(normalizedParams)

  if (theme.value === 'dark') {
    searchParams.set('bgColor', '#2b2f39')
    searchParams.set('theme', 'dark')
  } else {
    searchParams.set('bgColor', '#e6eff4')
    searchParams.set('theme', 'light')
  }

  return new URL(
    `#${searchParams.toString()}`,
    'https://www.chunkbase.com/seed-map-embed',
  ).toString()
})
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('chunkbase.title') }}
    </template>

    <div
      v-if="props.promo"
      :style="{
        marginTop: '8px',
      }"
    >
      <i18n-t keypath="chunkbase.promo" tag="p">
        <template #link>
          <a href="https://www.chunkbase.com/apps/" target="_blank" rel="noopener noreferrer">
            {{ t('chunkbase.name') }}
          </a>
        </template>
      </i18n-t>
    </div>

    <CdxTabs v-model:active="edition">
      <CdxTab name="java" :label="t('chunkbase.java')" />
      <CdxTab name="bedrock" :label="t('chunkbase.bedrock')" />
    </CdxTabs>

    <div
      :style="{
        width: '100%',
        maxWidth: '1024px',
        height: '0',
        paddingBottom: 'min(50%, 500px)',
        position: 'relative',
        overflow: 'hidden',
      }"
    >
      <iframe
        :src="chunkbaseUrl"
        :style="{
          position: 'absolute',
          border: 'none',
          width: '100%',
          height: '100%',
        }"
      />
    </div>
  </CalcField>
</template>
