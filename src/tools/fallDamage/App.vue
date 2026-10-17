<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import { CdxButton, CdxField, CdxIcon, CdxLookup, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { cdxIconAdd, cdxIconTrash } from '@wikimedia/codex-icons'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CalcField from '@/components/CalcField.vue'
import { javaEntityTypes } from '@/tools/targetSelector/data/entity_types_java.ts'
import { getImageLink } from '@/utils/image'
import { parseWikitext } from '@/utils/i18n'
import { horse_mobs, immune_mobs, mob_ids } from '@/tools/fallDamage/data/mobs.ts'

const { t } = useI18n()

interface MobData {
  value: string
  c_mob: number
  a: number
  waive: number
}

const mobs: MobData[] = [
  { value: 'other', c_mob: 3, a: 1, waive: 0 },
  { value: 'horse', c_mob: 6, a: 0.5, waive: 0 },
  { value: 'fox', c_mob: 5, a: 1, waive: 0 },
  { value: 'goat', c_mob: 3, a: 1, waive: 10 },
  { value: 'frog', c_mob: 3, a: 1, waive: 5 },
  { value: 'strider', c_mob: 3, a: 1, waive: 0 },
  { value: 'immune', c_mob: 3, a: 0, waive: 0 },
]

interface BlockData {
  value: string
  r: number
}

const blocks: BlockData[] = [
  { value: 'other', r: 1 },
  { value: 'hay', r: 0.2 },
  { value: 'bed', r: 0.5 },
  { value: 'dripstone', r: 2 },
  { value: 'none', r: 0 },
]

const protect_slots = ['helmet', 'chestplate', 'leggings', 'boots']

const label = {
  resistance: parseWikitext(t('fallDamage.resistance')),
  jump: parseWikitext(t('fallDamage.jump')),
  feather: parseWikitext(t('fallDamage.featherFalling')),
  protect: [
    parseWikitext(t('fallDamage.protection.helmet')),
    parseWikitext(t('fallDamage.protection.chestplate')),
    parseWikitext(t('fallDamage.protection.leggings')),
    parseWikitext(t('fallDamage.protection.boots')),
  ],
}

// const mob_items: MenuItemData[] = []
// for (let i = 0; i < mobs.length; i++) {
//   mob_items.push({ value: mobs[i].value, label: t('fallDamage.mob.' + mobs[i].value) })
// }

const all_mob_items: MenuItemData[] = []
for (let i = 0; i < mob_ids.length; i++) {
  const name = mob_ids[i]
  all_mob_items.push({
    value: 'minecraft:' + name,
    label: t('global.entity.' + name + '.java'),
    description: name,
    thumbnail: { url: getImageLink('en:' + (javaEntityTypes as Record<string, string>)[name]) },
  })
}
const mob_items = ref<MenuItemData[]>(all_mob_items)

const block_items: MenuItemData[] = []
for (let i = 0; i < blocks.length; i++) {
  block_items.push({ value: blocks[i].value, label: t('fallDamage.block.' + blocks[i].value) })
}
block_items.push({ value: 'lava', label: t('fallDamage.block.lava') })

const a = 0.08
const f = Math.fround(0.98)
const f8 = Math.fround(0.8)
const f32 = Math.fround
const player_high = 1.8
const eyes_high = 1.62
const _0429 = 10000 //single-layer ceiling, to prevent the data from being too large and causing bugs

interface LavaLayer {
  air: number
  lava: number
}

interface InternalLayer {
  lo: number
  hi: number
  lava: boolean
}

function build_layers(pairs: LavaLayer[]) {
  const list: LavaLayer[] = JSON.parse(JSON.stringify(pairs)).reverse()
  const layers: InternalLayer[] = []
  let y = 0
  for (let i = 0; i < list.length; i++) {
    const lava = Math.min(_0429, Math.max(0, list[i].lava || 0))
    const air = Math.min(_0429, Math.max(0, list[i].air || 0))
    if (lava > 0) {
      layers.push({ lo: y, hi: y + lava, lava: true })
      y += lava
    }
    if (air > 0) {
      layers.push({ lo: y, hi: y + air, lava: false })
      y += air
    }
  }
  return { layers: layers, height: y }
}

function is_lava_block(layers: InternalLayer[], k: number) {
  for (let i = 0; i < layers.length; i++) {
    if (k >= layers[i].lo && k < layers[i].hi) return layers[i].lava
  }
  return false
}

function fluid_top(layers: InternalLayer[], k: number) {
  return k + (is_lava_block(layers, k + 1) ? 1 : 8 / 9)
}

function fluid_height(layers: InternalLayer[], s: number) {
  const box_min = s + 0.001
  const y0 = Math.floor(box_min)
  const y1 = Math.ceil(s + player_high - 0.001) - 1
  let h = 0
  for (let k = y0; k <= y1; k++) {
    if (is_lava_block(layers, k)) {
      const top = fluid_top(layers, k)
      if (top >= box_min && top - s > h) h = top - s
    }
  }
  return h
}

function lava_fall_distance(pairs: LavaLayer[], strider = false) {
  const build = build_layers(pairs)
  const layers = build.layers
  const jump_threshold = eyes_high < 0.4 ? 0 : 0.4

  let s = build.height
  let v = 0
  let fall_distance = 0
  let first_tick = true

  while (true) {
    const in_lava = fluid_height(layers, s) > 0 && !first_tick
    first_tick = false
    if (in_lava) fall_distance *= 0.5

    const land = s + v <= 0
    const ds = v < 0 && land ? -s : v
    if (ds < 0) fall_distance -= f32(ds)
    s += ds

    // strider
    if (strider && fluid_height(layers, s) > 0) {
      fall_distance = 0
      if (land) return 0
    } else if (land) {
      return fall_distance
    }

    if (strider) {
      //
      v = (v - a) * f
    } else if (in_lava) {
      v = fluid_height(layers, s) <= jump_threshold ? v * f8 - a / 16 - a / 4 : v * 0.5 - a / 4
    } else {
      v = (v - a) * f
    }
  }
}

const height = ref(23)
const mob = ref<string | number | null>(null)
const block = ref('other')
const resistance = ref(0)
const jump = ref(0)
const protect0 = ref(0)
const protect = ref([0, 0, 0, 0])
const lava_layers = ref<LavaLayer[]>([{ air: 23, lava: 1 }])
const zero_reverse = ref(false)

function level(v: string | number) {
  return Math.min(255, Math.max(0, Math.round(Number(v) || 0)))
}

function fix_level_input(e: Event) {
  const input = e.target as HTMLInputElement
  const value = level(input.value)
  if (input.value !== String(value)) input.value = String(value)
}

function fix_height(v: string | number) {
  return Math.max(0, Number(v) || 0)
}

function fix_height_input(e: Event) {
  const input = e.target as HTMLInputElement
  const value = fix_height(input.value)
  if (input.value !== String(value)) input.value = String(value)
}

// function change_mob(value: string) {
//   mob.value = value
// }

function mob_row(id: string | number | null) {
  const name = String(id ?? '').replace('minecraft:', '')
  if (immune_mobs.includes(name)) return 'immune'
  if (horse_mobs.includes(name)) return 'horse'
  if (name === 'fox' || name === 'goat' || name === 'frog' || name === 'strider') return name
  return 'other'
}

function change_block(value: string) {
  block.value = value
}

function block_r() {
  const data = blocks.find((b) => b.value === block.value)
  return data ? data.r : 1
}

const mob_data = computed(() => mobs.find((m) => m.value === mob_row(mob.value))!)
const is_lava = computed(() => block.value === 'lava')
const lava_depth = computed(() => lava_fall_distance(lava_layers.value, mob_row(mob.value) === 'strider'))
const fully_immune = computed(() => block_r() === 0 || resistance.value >= 5 || mob_data.value.a === 0)

// Formula:
// damage = max(0, (height - c_mob - jump) * r * a - waive) * factor
// factor = (1 - min(20, 3 * protect0 + protect[0] + protect[1] + protect[2] + protect[3]) / 25)
//          * max(0, 1 - 0.2 * resistance)
// dripstone: height + 2.5
// lava: height = lava_fall_distance(pairs)
const factor = computed(() => {
  let points = 3 * Math.max(0, protect0.value)
  for (let i = 0; i < protect.value.length; i++) points += Math.max(0, protect.value[i])
  return (1 - Math.min(20, points) / 25) * Math.max(0, 1 - Math.max(0, resistance.value) * 0.2)
})

// initial damage
const raw_damage = computed(() => {
  const m = mob_data.value
  if (is_lava.value) {
    return Math.max(0, Math.floor((lava_depth.value + 1e-6 - m.c_mob - jump.value) * m.a) - m.waive)
  }
  const h = height.value + (block.value === 'dripstone' ? 2.5 : 0)
  return Math.max(0, (h - m.c_mob - jump.value) * block_r() * m.a - m.waive)
})

// damage
const damage = computed(() => Math.round(raw_damage.value * factor.value * 10) / 10)

function set_damage(val: string | number) {
  const m = mob_data.value
  const r = block_r()
  if (is_lava.value || factor.value === 0 || r === 0 || m.a === 0) return
  const input = Number(val)
  zero_reverse.value = input === 0 && !fully_immune.value
  const target = (isFinite(input) ? Math.max(0, input) : 0) / factor.value + m.waive
  height.value = Math.max(
    0,
    block.value === 'dripstone'
      ? target / (2 * m.a) + m.c_mob + jump.value - 2.5
      : target / (r * m.a) + m.c_mob + jump.value,
  )
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('fallDamage.title') }}
    </template>

    <div class="flex flex-col gap-1">
      <div class="flex flex-col gap-2">
        <template v-if="!is_lava">
          <CdxField class="mt-0">
            <template #label>
              {{ t('fallDamage.height') }}
            </template>
            <CdxTextInput
              id="height-input"
              :model-value="height"
              class="w-24 min-w-24 font-mono"
              input-type="number"
              min="0"
              step="0.1"
              @input="fix_height_input"
              @update:model-value="(v) => (height = fix_height(v))"
            />
          </CdxField>
        </template>

        <CdxField class="mt-0">
          <template #label>
            {{ t('fallDamage.mob') }}
          </template>
          <CdxLookup
            v-model:selected="mob"
            :menu-items="mob_items"
            :menu-config="{ visibleItemLimit: 6 }"
            @input="
              (value: string) =>
                (mob_items = all_mob_items.filter(
                  (item) =>
                    item.label?.toLowerCase().includes(value.toLowerCase()) ||
                    (item.value as string).includes(value.toLowerCase())
                ))
            "
          >            <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
              <span class="cdx-menu-item__content">
                <img
                  class="cdx-menu-item__icon pixel-image"
                  width="16"
                  height="16"
                  loading="lazy"
                  style="width: 16px; height: 16px; align-self: center"
                  :src="menuItem.thumbnail?.url"
                  :alt="menuItem.label"
                />
                <span class="cdx-menu-item__text">
                  <span class="cdx-menu-item__text__label">
                    <bdi>{{ menuItem.label }}</bdi>
                  </span>
                  <span class="cdx-menu-item__text__description">
                    <bdi>{{ menuItem.description }}</bdi>
                  </span>
                </span>
              </span>
            </template>
          </CdxLookup>
        </CdxField>
        <!--
        <CdxField class="mt-0">
          <template #label>
            {{ t('fallDamage.mob') }}
          </template>
          <CdxSelect
            id="mob-select"
            :selected="mob"
            :menu-items="mob_items"
            @update:selected="change_mob"
          />
        </CdxField>
        -->

        <CdxField class="mt-0">
          <template #label>
            {{ t('fallDamage.block') }}
          </template>
          <CdxSelect
            id="block-select"
            :selected="block"
            :menu-items="block_items"
            @update:selected="change_block"
          />
        </CdxField>
      </div>

      <div v-if="is_lava" class="flex flex-col gap-1 mt-2">
        <div class="text-sm">{{ t('fallDamage.lavaPath') }}</div>
        <div
          v-for="(layer, index) in lava_layers"
          :key="index"
          class="flex flex-row flex-wrap items-center gap-2"
        >
          <label :for="`lava-air-${index}`">{{ t('fallDamage.lavaAir') }}</label>
          <CdxTextInput
            :id="`lava-air-${index}`"
            v-model="layer.air"
            class="w-20 min-w-20 font-mono"
            input-type="number"
            min="0"
            :max="_0429"
            step="1"
          />
          <label :for="`lava-lava-${index}`">{{ t('fallDamage.lavaDepth') }}</label>
          <CdxTextInput
            :id="`lava-lava-${index}`"
            v-model="layer.lava"
            class="w-20 min-w-20 font-mono"
            input-type="number"
            min="0"
            :max="_0429"
            step="1"
          />
          <CdxButton
            weight="quiet"
            action="destructive"
            :aria-label="t('fallDamage.removeLayer')"
            @click="lava_layers.splice(index, 1)"
          >
            <CdxIcon :icon="cdxIconTrash" />
          </CdxButton>
        </div>
        <div>
          <CdxButton @click="lava_layers.push({ air: 0, lava: 1 })">
            <CdxIcon :icon="cdxIconAdd" class="mr-1" />{{ t('fallDamage.addLayer') }}
          </CdxButton>
        </div>
      </div>

      <div class="flex flex-row flex-wrap gap-4 mt-2">
        <CdxField class="mt-0">
          <template #label>
            <span v-html="label.resistance" />
          </template>
          <CdxTextInput
            id="resistance-input"
            :model-value="resistance"
            class="w-20 min-w-20 font-mono"
            input-type="number"
            min="0"
            max="255"
            step="1"
            :title="t('fallDamage.levelHint')"
            @input="fix_level_input"
            @update:model-value="(v) => (resistance = level(v))"
          />
        </CdxField>

        <CdxField class="mt-0">
          <template #label>
            <span v-html="label.jump" />
          </template>
          <CdxTextInput
            id="jump-input"
            :model-value="jump"
            class="w-20 min-w-20 font-mono"
            input-type="number"
            min="0"
            max="255"
            step="1"
            :title="t('fallDamage.levelHint')"
            @input="fix_level_input"
            @update:model-value="(v) => (jump = level(v))"
          />
        </CdxField>

        <CdxField v-for="(value, index) in protect" :key="protect_slots[index]" class="mt-0">
          <template #label>
            <span v-html="label.protect[index]" />
          </template>
          <CdxTextInput
            :id="`protect${index + 1}-input`"
            :model-value="protect[index]"
            class="w-20 min-w-20 font-mono"
            input-type="number"
            min="0"
            max="255"
            step="1"
            :title="t('fallDamage.levelHint')"
            @input="fix_level_input"
            @update:model-value="(v) => (protect[index] = level(v))"
          />
        </CdxField>

        <CdxField class="mt-0">
          <template #label>
            <span v-html="label.feather" />
          </template>
          <CdxTextInput
            id="protect0-input"
            :model-value="protect0"
            class="w-20 min-w-20 font-mono"
            input-type="number"
            min="0"
            max="255"
            step="1"
            :title="t('fallDamage.levelHint')"
            @input="fix_level_input"
            @update:model-value="(v) => (protect0 = level(v))"
          />
        </CdxField>
      </div>

      <div class="flex flex-row flex-wrap items-center gap-2 mt-2">
        <CdxField class="mt-0">
          <template #label>
            {{ t('fallDamage.damage') }}
          </template>
          <CdxTextInput
            id="damage-input"
            :model-value="damage"
            class="w-28 min-w-28 font-mono"
            input-type="number"
            min="0"
            step="0.1"
            :readonly="is_lava || fully_immune"
            @update:model-value="set_damage"
          />
        </CdxField>
      </div>

      <div v-if="fully_immune || is_lava || (zero_reverse && !fully_immune && damage === 0)" class="flex flex-col">
        <b v-if="fully_immune">{{ t('fallDamage.immuneNote') }}</b>
        <b v-if="is_lava">{{ t('fallDamage.lavaNoReverse') }}</b>
        <b v-if="zero_reverse && !fully_immune && damage === 0">{{ t('fallDamage.zeroReverseNote') }}</b>
      </div>
    </div>
  </CalcField>
</template>
