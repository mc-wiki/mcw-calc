<script setup lang="ts">
import type { Color } from '@/utils/color'
import CalcField from '@/components/CalcField.vue'
import { colorMap, colorRgbMap } from '@/utils/color/java'
import { copyToClipboard, parentUrl } from '@/utils/iframe'
import { getImageLink } from '@/utils/image'
import { theme } from '@/utils/theme'
import { useLocalStorage } from '@vueuse/core'
import {
  CdxButton,
  CdxIcon,
  CdxSelect,
  CdxTable,
  CdxToggleButtonGroup,
  type MenuItemData,
} from '@wikimedia/codex'
import {
  cdxIconAlert,
  cdxIconDownTriangle,
  cdxIconError,
  cdxIconHelpNotice,
  cdxIconLink,
  cdxIconTableAddRowAfter,
  cdxIconTrash,
  cdxIconUpTriangle,
} from '@wikimedia/codex-icons'
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BannerPopup from './BannerPopup.vue'

const props = defineProps<{ icon: 'banner' | 'shield' }>()

const { t } = useI18n()

const type = ref<'banner' | 'shield'>(props.icon)

interface Pattern {
  id: number
  name: keyof typeof patternName
  color: Color
}

const patternId: (keyof typeof patternName)[] = [
  'stripe_bottom',
  'stripe_top',
  'stripe_left',
  'stripe_right',
  'stripe_center',
  'stripe_middle',
  'stripe_downright',
  'stripe_downleft',
  'small_stripes',
  'cross',
  'straight_cross',
  'diagonal_left',
  'diagonal_right',
  'diagonal_up_left',
  'diagonal_up_right',
  'half_vertical',
  'half_vertical_right',
  'half_horizontal',
  'half_horizontal_bottom',
  'square_bottom_left',
  'square_bottom_right',
  'square_top_left',
  'square_top_right',
  'triangle_bottom',
  'triangle_top',
  'triangles_bottom',
  'triangles_top',
  'circle',
  'rhombus',
  'border',
  'curly_border',
  'bricks',
  'gradient',
  'gradient_up',
  'creeper',
  'skull',
  'flower',
  'mojang',
  'globe',
  'piglin',
  'flow',
  'guster',
]

const patternName = {
  stripe_bottom: 'Base',
  stripe_top: 'Chief',
  stripe_left: 'Pale Dexter',
  stripe_right: 'Pale Sinister',
  stripe_center: 'Pale',
  stripe_middle: 'Fess',
  stripe_downright: 'Bend',
  stripe_downleft: 'Bend Sinister',
  small_stripes: 'Paly',
  cross: 'Saltire',
  straight_cross: 'Cross',
  diagonal_left: 'Per Bend Sinister',
  diagonal_right: 'Per Bend',
  diagonal_up_left: 'Per Bend Inverted',
  diagonal_up_right: 'Per Bend Sinister Inverted',
  half_vertical: 'Per Pale',
  half_vertical_right: 'Per Pale Inverted',
  half_horizontal: 'Per Fess',
  half_horizontal_bottom: 'Per Fess Inverted',
  square_bottom_left: 'Base Dexter Canton',
  square_bottom_right: 'Base Sinister Canton',
  square_top_left: 'Chief Dexter Canton',
  square_top_right: 'Chief Sinister Canton',
  triangle_bottom: 'Chevron',
  triangle_top: 'Inverted Chevron',
  triangles_bottom: 'Base Indented',
  triangles_top: 'Chief Indented',
  circle: 'Roundel',
  rhombus: 'Lozenge',
  border: 'Bordure',
  curly_border: 'Bordure Indented',
  bricks: 'Field Masoned',
  gradient: 'Gradient',
  gradient_up: 'Base Gradient',
  creeper: 'Creeper Charge',
  skull: 'Skull Charge',
  flower: 'Flower Charge',
  mojang: 'Thing',
  globe: 'Globe',
  piglin: 'Snout',
  flow: 'Flow',
  guster: 'Guster',
}

const patternItemRequired = [
  'flower',
  'creeper',
  'skull',
  'mojang',
  'globe',
  'piglin',
  'flow',
  'guster',
  'bricks',
  'curly_border',
]

const activePatterns = useLocalStorage<Pattern[]>('mcwBannerActivePatterns', [
  {
    id: 0,
    name: 'mojang',
    color: 'black',
  },
])
function updatePattern(index: number, pattern: keyof typeof patternName) {
  activePatterns.value[index].name = pattern
}
function updatePatternIds() {
  activePatterns.value.forEach((pattern, index) => {
    pattern.id = index
  })
}
function newLayer() {
  if (activePatterns.value.length === 0) {
    activePatterns.value.push({
      id: 0,
      name: 'mojang',
      color: 'black',
    })
  } else {
    activePatterns.value.push({
      ...activePatterns.value[activePatterns.value.length - 1],
      id: activePatterns.value.length,
    })
  }
}

const patternMenuItems: MenuItemData[] = patternId.map((pattern) => ({
  value: pattern,
  label: t(`banner.pattern.${pattern}`),
  thumbnail: {
    url: getImageLink(`en:SlotSprite_${patternName[pattern].replace(/ /g, '_')}.png`),
  },
}))

const colorMenuItems: MenuItemData[] = Object.entries(colorMap).map((color) => ({
  value: color[0],
  label: t(`banner.color.${color[0]}`),
  icon: `
    <rect width="20" height="20" fill="#${color[1].toString(16)}" stroke="${theme.value === 'dark' ? '#ffffff' : '#000000'}" stroke-width="2" />
  `,
}))
function updateColor(index: number, color: Color) {
  activePatterns.value[index].color = color
}

const baseColor = useLocalStorage<Color>('mcwBannerBaseColor', 'white')

const canvasRef = useTemplateRef('canvasRef')

const loadedImages: Record<string, HTMLImageElement> = {}
function loadImage(src: string) {
  if (loadedImages[src]) return Promise.resolve(loadedImages[src])
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.addEventListener('load', () => {
      loadedImages[src] = img
      resolve(img)
    })
    img.addEventListener('error', reject)
    img.src = src
  })
}

async function promiseAllObject<T>(obj: Record<string, Promise<T>>) {
  const values = await Promise.all(Object.values(obj))
  return Object.fromEntries(Object.keys(obj).map((key, i) => [key, values[i]]))
}

function imageToImageData(image: HTMLImageElement, width: number, height: number) {
  const context = Object.assign(document.createElement('canvas'), {
    width,
    height,
  }).getContext('2d')
  if (!context) throw new Error('Could not create canvas context')
  context.imageSmoothingEnabled = false
  context.drawImage(image, 1, 1, width, height, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

watch(
  [activePatterns, baseColor, type, canvasRef],
  async ([patterns, color, type, canvas]) => {
    const baseColor = colorRgbMap[color]
    if (!canvas) return
    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
    })
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const images = await promiseAllObject({
      base: loadImage(
        type === 'banner'
          ? getImageLink('en:Banner_base_(texture)_JE1_BE1.png')
          : getImageLink('en:Shield_base_(texture)_JE2_BE1.png'),
      ),
      ...Object.fromEntries(
        patterns.map((pattern) => [
          pattern.name,
          loadImage(
            getImageLink(
              `en:${type === 'banner' ? 'Banner' : 'Shield'}_${pattern.name}_(texture)_JE1_BE1.png`,
            ),
          ),
        ]),
      ),
    })

    if (type === 'banner') ctx.drawImage(images.base, 1, 1, 20, 40, 0, 0, 20, 40)
    else ctx.drawImage(images.base, 1, 1, 12, 22, 0, 0, 12, 22)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      if (type === 'shield') {
        // skip at first and last row and column
        if (i <= 12 * 4 || i >= 12 * 21 * 4 || i % (12 * 4) === 0 || i % (12 * 4) === 12 * 4 - 4) {
          continue
        }
      }
      data[i] = (data[i] * baseColor[0]) / 255
      data[i + 1] = (data[i + 1] * baseColor[1]) / 255
      data[i + 2] = (data[i + 2] * baseColor[2]) / 255
    }

    for (const pattern of patterns) {
      const patternImage = images[pattern.name]
      const patternData =
        type === 'banner'
          ? imageToImageData(patternImage, 20, 40)
          : imageToImageData(patternImage, 12, 22)
      const patternColor = colorRgbMap[pattern.color]
      const patternDataArray = patternData.data
      for (let i = 0; i < patternDataArray.length; i += 4) {
        const red2 = (patternColor[0] / 255) * (patternDataArray[i] / 255)
        const green2 = (patternColor[1] / 255) * (patternDataArray[i + 1] / 255)
        const blue2 = (patternColor[2] / 255) * (patternDataArray[i + 2] / 255)
        const alpha2 = patternDataArray[i + 3] / 255

        data[i] = (red2 * alpha2 + (data[i] / 255) * (1 - alpha2)) * 255
        data[i + 1] = (green2 * alpha2 + (data[i + 1] / 255) * (1 - alpha2)) * 255
        data[i + 2] = (blue2 * alpha2 + (data[i + 2] / 255) * (1 - alpha2)) * 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  },
  {
    deep: true,
  },
)

function copyShareUrl() {
  const url = new URL(t('banner.shareUrl'))
  const searchParams = new URLSearchParams()
  searchParams.set('activePatterns', JSON.stringify(activePatterns.value))
  searchParams.set('baseColor', baseColor.value)
  url.hash = `?${searchParams.toString()}`
  copyToClipboard(url.href)
}

function copyJavaCommand() {
  const camelToSnake = (str: string) =>
    str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  copyToClipboard(
    type.value === 'shield'
      ? `/give @s minecraft:shield` +
          `[minecraft:banner_patterns=[${activePatterns.value
            .map(
              (pattern) => `{color: "${camelToSnake(pattern.color)}", pattern: "${pattern.name}"}`,
            )
            .join(',')}], minecraft:base_color="${camelToSnake(baseColor.value)}"]`
      : `/give @s minecraft:${camelToSnake(baseColor.value)}_banner` +
          `[minecraft:banner_patterns=[${activePatterns.value
            .map(
              (pattern) => `{color: "${camelToSnake(pattern.color)}", pattern: "${pattern.name}"}`,
            )
            .join(',')}]]`,
  )
}

// const patternBedrockId = {
//   stripe_bottom: 'bs',
//   stripe_top: 'ts',
//   stripe_left: 'ls',
//   stripe_right: 'rs',
//   stripe_center: 'cs',
//   stripe_middle: 'ms',
//   stripe_downright: 'drs',
//   stripe_downleft: 'dls',
//   small_stripes: 'ss',
//   cross: 'cr',
//   straight_cross: 'sc',
//   diagonal_left: 'ld',
//   diagonal_right: 'rud',
//   diagonal_up_left: 'lud',
//   diagonal_up_right: 'rd',
//   half_vertical: 'vh',
//   half_vertical_right: 'vhr',
//   half_horizontal: 'hh',
//   half_horizontal_bottom: 'hhb',
//   square_bottom_left: 'bl',
//   square_bottom_right: 'br',
//   square_top_left: 'tl',
//   square_top_right: 'tr',
//   triangle_bottom: 'bt',
//   triangle_top: 'tt',
//   triangles_bottom: 'bts',
//   triangles_top: 'tts',
//   circle: 'mc',
//   rhombus: 'mr',
//   border: 'bo',
//   curly_border: 'cbo',
//   bricks: 'bri',
//   gradient: 'gra',
//   gradient_up: 'gru',
//   creeper: 'cre',
//   skull: 'sku',
//   flower: 'flo',
//   mojang: 'moj',
//   globe: 'glb',
//   piglin: 'pig',
//   flow: 'flw',
//   guster: 'gus',
// }

// function copyBedrockCommand() {
//   copyToClipboard(
//     `${
//       type.value === 'shield' ? '/give @s minecraft:shield' : '/give @s minecraft:banner'
//     }{Base: ${colorCode[baseColor.value]}, Patterns: [${activePatterns.value
//       .map(
//         (pattern) =>
//           `{Pattern: "${patternBedrockId[pattern.name]}", Color: ${colorCode[pattern.color]}}`,
//       )
//       .join(',')}]}`,
//   )
// }

onMounted(() => {
  const url = parentUrl()
  const params = new URLSearchParams(url.hash.slice(2))
  const activePatternsParam = params.get('activePatterns')
  if (activePatternsParam) {
    activePatterns.value = JSON.parse(activePatternsParam)
  }
  const baseColorParam = params.get('baseColor')
  if (baseColorParam) {
    baseColor.value = baseColorParam as Color
  }
})
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('banner.title', { type: t(`banner.icon.${type}`) }) }}
    </template>
    <div class="flex flex-col md:flex-row flex-wrap items-center md:items-stretch gap-3">
      <div class="flex flex-col gap-3 items-center">
        <canvas
          ref="canvasRef"
          :width="type === 'banner' ? 20 : 12"
          :height="type === 'banner' ? 40 : 22"
          class="h-[200px] md:h-[400px] pixel-image"
        />

        <CdxToggleButtonGroup
          v-model="type"
          class="flex grow-items w-full"
          :buttons="[
            { value: 'banner', label: t('banner.icon.banner.capital') },
            { value: 'shield', label: t('banner.icon.shield.capital') },
          ]"
        />
        <CdxSelect v-model:selected="baseColor" :menu-items="colorMenuItems" />
      </div>

      <div class="overflow-x-auto w-full flex flex-col flex-1 gap-3">
        <div class="overflow-auto flex-1 max-h-[400px] max-w-full">
          <CdxTable
            class="min-h-full"
            :caption="t('banner.layers')"
            :use-row-headers="true"
            :data="activePatterns"
            :columns="
              activePatterns.length === 0
                ? []
                : [
                    { id: 'id', label: t('banner.layer'), textAlign: 'number' },
                    { id: 'name', label: t('banner.pattern') },
                    { id: 'color', label: t('banner.color') },
                    { id: 'actions', label: t('banner.actions') },
                  ]
            "
          >
            <template #header>
              <CdxButton @click="newLayer">
                <CdxIcon :icon="cdxIconTableAddRowAfter" />
                {{ t('banner.new') }}
              </CdxButton>
            </template>

            <template #item-id="{ item }: { item: number }">
              <div class="flex items-center justify-end">
                <BannerPopup
                  v-if="item + 1 > 6 && item + 1 <= 16"
                  :icon="cdxIconAlert"
                  type="warning"
                >
                  {{ t('banner.limitWarning') }}
                </BannerPopup>
                <BannerPopup v-if="item + 1 > 16" :icon="cdxIconError" type="error">
                  {{ t('banner.limitError') }}
                </BannerPopup>

                {{ item + 1 }}
              </div>
            </template>

            <template #item-name="{ item, row }: { item: keyof typeof patternName; row: Pattern }">
              <CdxSelect
                class="long-handle"
                :menu-items="patternMenuItems"
                :selected="item"
                @update:selected="
                  (selected: keyof typeof patternName) => updatePattern(row.id, selected)
                "
              >
                <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
                  <div class="flex items-center">
                    <img
                      class="pixel-image -m-2"
                      width="45"
                      height="45"
                      loading="lazy"
                      :src="menuItem.thumbnail?.url"
                    />
                    <span>{{ menuItem.label }}</span>

                    <div
                      v-if="patternItemRequired.includes(menuItem.value as string)"
                      v-tooltip="t('banner.requiredPattern')"
                      class="flex items-center relative"
                    >
                      <img
                        class="pixel-image ml-2"
                        width="24"
                        height="24"
                        loading="lazy"
                        :src="
                          getImageLink(
                            `en:ItemSprite_${patternName[menuItem.value as keyof typeof patternName]
                              .toLowerCase()
                              .replace(/ /, '-')}-banner-pattern.png`,
                          )
                        "
                      />
                    </div>
                  </div>
                </template>
                <template #label="{ selectedMenuItem }">
                  <div v-if="selectedMenuItem" class="flex items-center">
                    <img
                      class="pixel-image -m-2 -ml-3"
                      width="40"
                      height="40"
                      loading="lazy"
                      :src="selectedMenuItem.thumbnail.url"
                    />
                    <span>{{ selectedMenuItem.label }}</span>

                    <div
                      v-if="patternItemRequired.includes(selectedMenuItem.value as string)"
                      v-tooltip="t('banner.requiredPattern')"
                      class="flex items-center relative"
                    >
                      <img
                        class="pixel-image ml-2"
                        width="24"
                        height="24"
                        loading="lazy"
                        :src="
                          getImageLink(
                            `en:ItemSprite_${patternName[
                              selectedMenuItem.value as keyof typeof patternName
                            ]
                              .toLowerCase()
                              .replace(/ /g, '-')}-banner-pattern.png`,
                          )
                        "
                      />
                    </div>
                  </div>
                </template>
              </CdxSelect>
            </template>

            <template #item-color="{ item, row }: { item: Color; row: Pattern }">
              <CdxSelect
                :menu-items="colorMenuItems"
                :selected="item"
                @update:selected="(selected: Color) => updateColor(row.id, selected)"
              />
            </template>

            <template #item-actions="{ row }: { row: Pattern }">
              <div class="flex">
                <div class="flex flex-col justify-evenly">
                  <CdxButton
                    v-if="row.id !== 0"
                    class="min-h-0"
                    weight="quiet"
                    :aria-label="t('banner.move_up')"
                    @click="
                      () => {
                        const index = row.id
                        const temp = activePatterns[index]
                        activePatterns[index] = activePatterns[index - 1]
                        activePatterns[index - 1] = temp
                        updatePatternIds()
                      }
                    "
                  >
                    <CdxIcon size="x-small" :icon="cdxIconUpTriangle" />
                  </CdxButton>
                  <CdxButton
                    v-if="row.id !== activePatterns.length - 1"
                    class="min-h-0"
                    weight="quiet"
                    :aria-label="t('banner.move_down')"
                    @click="
                      () => {
                        const index = row.id
                        const temp = activePatterns[index]
                        activePatterns[index] = activePatterns[index + 1]
                        activePatterns[index + 1] = temp
                        updatePatternIds()
                      }
                    "
                  >
                    <CdxIcon size="x-small" :icon="cdxIconDownTriangle" />
                  </CdxButton>
                </div>

                <CdxButton
                  weight="quiet"
                  action="destructive"
                  :aria-label="t('banner.remove')"
                  @click="
                    () => {
                      activePatterns.splice(row.id, 1)
                      updatePatternIds()
                    }
                  "
                >
                  <CdxIcon :icon="cdxIconTrash" />
                </CdxButton>
              </div>
            </template>

            <template #empty-state>
              <CdxButton action="progressive" weight="primary" size="large" @click="newLayer">
                <CdxIcon :icon="cdxIconTableAddRowAfter" />
                {{ t('banner.new') }}
              </CdxButton>
            </template>
          </CdxTable>
        </div>

        <div class="flex gap-2">
          <CdxButton @click="copyShareUrl">
            <CdxIcon :icon="cdxIconLink" />
            {{ t('banner.copyShareUrl') }}
          </CdxButton>
          <CdxButton @click="copyJavaCommand">
            {{ t('banner.copyJavaCommand') }}
          </CdxButton>
          <!-- <CdxButton @click="copyBedrockCommand">
            {{ t('banner.copyBedrockCommand') }}
          </CdxButton> -->
          <CdxButton v-tooltip="t('banner.bedrockCommandHelpTooltip')" weight="quiet">
            <CdxIcon :icon="cdxIconHelpNotice" />
            {{ t('banner.bedrockCommandHelpButton') }}
          </CdxButton>
        </div>
      </div>
    </div>
  </CalcField>
</template>

<style lang="less">
@import (reference) '@wikimedia/codex-design-tokens/theme-wikimedia-ui.less';

.grow-items > * {
  flex: 1;
}

.cdx-select-vue__handle {
  min-width: 175px;
  display: flex;
  align-items: center;
  height: 36px;

  .long-handle & {
    min-width: 230px;
  }
}

.cdx-table {
  display: flex;
  flex-direction: column;
  background-color: @background-color-base;
}

.cdx-table__table-wrapper {
  flex: 1;
  overflow: visible;
  overflow-x: auto;
}

.cdx-table__header {
  position: sticky;
  top: 0;
  background-color: @background-color-base;
  z-index: @z-index-above-content;
}
</style>
