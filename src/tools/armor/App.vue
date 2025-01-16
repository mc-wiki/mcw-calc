<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { CdxField, CdxSelect, CdxTab, CdxTabs, CdxTextInput } from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ArmorSlot from './ArmorSlot.vue'

const { t } = useI18n()

export type ArmorMaterial =
  | 'empty'
  | 'leather'
  | 'golden'
  | 'chainmail'
  | 'iron'
  | 'diamond'
  | 'netherite'
export type HelmetMaterial = 'turtle' | ArmorMaterial

const armorPointMap = {
  empty: {
    helmet: 0,
    chestplate: 0,
    leggings: 0,
    boots: 0,
  },
  turtle: {
    helmet: 2,
  },
  leather: {
    helmet: 1,
    chestplate: 3,
    leggings: 2,
    boots: 1,
  },
  golden: {
    helmet: 2,
    chestplate: 5,
    leggings: 3,
    boots: 1,
  },
  chainmail: {
    helmet: 2,
    chestplate: 5,
    leggings: 4,
    boots: 1,
  },
  iron: {
    helmet: 2,
    chestplate: 6,
    leggings: 5,
    boots: 2,
  },
  diamond: {
    helmet: 3,
    chestplate: 8,
    leggings: 6,
    boots: 3,
  },
  netherite: {
    helmet: 3,
    chestplate: 8,
    leggings: 6,
    boots: 3,
  },
}

const armorToughnessMap = {
  empty: {
    helmet: 0,
    chestplate: 0,
    leggings: 0,
    boots: 0,
  },
  turtle: {
    helmet: 0,
  },
  leather: {
    helmet: 0,
    chestplate: 0,
    leggings: 0,
    boots: 0,
  },
  golden: {
    helmet: 0,
    chestplate: 0,
    leggings: 0,
    boots: 0,
  },
  chainmail: {
    helmet: 0,
    chestplate: 0,
    leggings: 0,
    boots: 0,
  },
  iron: {
    helmet: 0,
    chestplate: 0,
    leggings: 0,
    boots: 0,
  },
  diamond: {
    helmet: 2,
    chestplate: 2,
    leggings: 2,
    boots: 2,
  },
  netherite: {
    helmet: 3,
    chestplate: 3,
    leggings: 3,
    boots: 3,
  },
}

const extraArmorPoint = ref(0)
const extraArmorToughness = ref(0)

export type ArmorEnchantment =
  | 'empty'
  | 'protection'
  | 'fireProtection'
  | 'blastProtection'
  | 'projectileProtection'
export type BootsEnchantment = 'featherFalling' | ArmorEnchantment

export interface Armor<M, E> {
  material: M
  enchantments: { enchantment: E; level: 0 | 1 | 2 | 3 | 4 }[]
}

const sourceDamage = ref(1)
type Source = 'other' | 'fire' | 'explosion' | 'projectile' | 'fall' | 'magic'
const source = ref<Source>('other')
const breachLevel = ref(0)
const helmet = ref<Armor<HelmetMaterial, ArmorEnchantment>>({
  material: 'empty',
  enchantments: [{ enchantment: 'empty', level: 1 }],
})
const chestplate = ref<Armor<ArmorMaterial, ArmorEnchantment>>({
  material: 'empty',
  enchantments: [{ enchantment: 'empty', level: 1 }],
})
const leggings = ref<Armor<ArmorMaterial, ArmorEnchantment>>({
  material: 'empty',
  enchantments: [{ enchantment: 'empty', level: 1 }],
})
const boots = ref<Armor<ArmorMaterial, BootsEnchantment>>({
  material: 'empty',
  enchantments: [{ enchantment: 'empty', level: 1 }],
})

const armorPoint = computed(
  () =>
    armorPointMap[helmet.value.material].helmet +
    armorPointMap[chestplate.value.material].chestplate +
    armorPointMap[leggings.value.material].leggings +
    armorPointMap[boots.value.material].boots +
    extraArmorPoint.value,
)

const armorToughness = computed(
  () =>
    armorToughnessMap[helmet.value.material].helmet +
    armorToughnessMap[chestplate.value.material].chestplate +
    armorToughnessMap[leggings.value.material].leggings +
    armorToughnessMap[boots.value.material].boots +
    extraArmorToughness.value,
)

const extraEpf = ref(0)

function determineEpf(level: number, enchantment: BootsEnchantment): number {
  if (enchantment === 'protection') return level
  if (enchantment === 'fireProtection' && source.value === 'fire') return level * 2
  if (enchantment === 'blastProtection' && source.value === 'explosion') return level * 2
  if (enchantment === 'projectileProtection' && source.value === 'projectile') return level * 2
  if (enchantment === 'featherFalling' && source.value === 'fall') return level * 3

  return 0
}

const cumulativeEpf = computed(() =>
  Math.min(
    20,
    helmet.value.enchantments.reduce(
      (acc, { enchantment, level }) => acc + determineEpf(level, enchantment),
      0,
    ) +
      chestplate.value.enchantments.reduce(
        (acc, { enchantment, level }) => acc + determineEpf(level, enchantment),
        0,
      ) +
      leggings.value.enchantments.reduce(
        (acc, { enchantment, level }) => acc + determineEpf(level, enchantment),
        0,
      ) +
      boots.value.enchantments.reduce(
        (acc, { enchantment, level }) => acc + determineEpf(level, enchantment),
        0,
      ) +
      extraEpf.value,
  ),
)

const finalDamage = computed(() => {
  let materialFactor = 1

  if (source.value !== 'fire' && source.value !== 'fall' && source.value !== 'magic') {
    const a = 0.2 * armorPoint.value
    const b = armorPoint.value - sourceDamage.value / (2 + 0.25 * armorToughness.value)
    const x = Math.min(20, Math.max(a, b)) / 25 - 0.15 * breachLevel.value

    materialFactor = Math.min(1, 1 - x)
  }

  const epf = cumulativeEpf.value / 25 || 0

  return materialFactor * (1 - epf) * sourceDamage.value
})

function selectOutput() {
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.selectAllChildren(document.getElementById('output')!)
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('armor.title') }}
    </template>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <h3 class="mb-2">
          {{ t('armor.armor') }}
        </h3>

        <CdxTabs>
          <CdxTab :name="t('armor.helmet')">
            <ArmorSlot v-model="helmet" type="helmet" />
          </CdxTab>
          <CdxTab :name="t('armor.chestplate')">
            <ArmorSlot v-model="chestplate" type="chestplate" />
          </CdxTab>
          <CdxTab :name="t('armor.leggings')">
            <ArmorSlot v-model="leggings" type="leggings" />
          </CdxTab>
          <CdxTab :name="t('armor.boots')">
            <ArmorSlot v-model="boots" type="boots" />
          </CdxTab>
        </CdxTabs>

        <hr class="mt-4 mb-2" />

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 no-min-w">
          <CdxField>
            <template #label>
              {{ t('armor.extraArmorPoint') }}
            </template>

            <CdxTextInput v-model="extraArmorPoint" input-type="number" />
          </CdxField>

          <CdxField>
            <template #label>
              {{ t('armor.extraArmorToughness') }}
            </template>

            <CdxTextInput v-model="extraArmorToughness" input-type="number" />
          </CdxField>

          <CdxField>
            <template #label>
              {{ t('armor.extraEpf') }}
            </template>

            <CdxTextInput v-model="extraEpf" input-type="number" />
          </CdxField>
        </div>
      </div>

      <div>
        <h3 class="mb-2">
          {{ t('armor.source') }}
        </h3>
        <CdxField>
          <template #label>
            {{ t('armor.sourceInput') }}
          </template>

          <CdxSelect
            v-model:selected="source"
            :menu-items="[
              { label: t('armor.source.other'), value: 'other' },
              { label: t('armor.source.fire'), value: 'fire' },
              { label: t('armor.source.explosion'), value: 'explosion' },
              { label: t('armor.source.projectile'), value: 'projectile' },
              { label: t('armor.source.fall'), value: 'fall' },
              {
                label: t('armor.source.magic'),
                value: 'magic',
                description: t('armor.source.magic.help'),
              },
            ]"
          />
        </CdxField>

        <CdxField>
          <template #label>
            {{ t('armor.breachLevel') }}
          </template>

          <CdxTextInput v-model="breachLevel" input-type="number" />
        </CdxField>

        <CdxField>
          <template #label>
            {{ t('armor.sourceDamage') }}
          </template>

          <CdxTextInput v-model="sourceDamage" input-type="number" />
        </CdxField>
      </div>
    </div>

    <hr class="mt-4 mb-2" />

    <div class="flex gap-4 mb-2">
      <I18nT tag="div" keypath="armor.armorPoint">
        <template #point>
          <output class="font-mono">{{ armorPoint.toFixed(2) }}</output>
        </template>
      </I18nT>
      <I18nT tag="div" keypath="armor.armorToughness">
        <template #toughness>
          <output class="font-mono">{{ armorToughness.toFixed(2) }}</output>
        </template>
      </I18nT>
      <I18nT tag="div" keypath="armor.cumulativeEpf">
        <template #epf>
          <output class="font-mono">{{ cumulativeEpf.toFixed(2) }}</output>
        </template>
      </I18nT>
    </div>

    <I18nT tag="div" keypath="armor.finalDamage" class="font-bold">
      <template #damage>
        <output id="output" class="text-lg font-mono" @click="selectOutput">{{
          finalDamage.toFixed(2)
        }}</output>
      </template>
    </I18nT>
  </CalcField>
</template>
<style>
.no-min-w .cdx-text-input {
  min-width: auto;
}
</style>
