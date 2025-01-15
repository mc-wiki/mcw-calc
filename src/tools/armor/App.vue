<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { CdxAccordion, CdxField, CdxSelect, CdxTab, CdxTabs, CdxTextInput } from '@wikimedia/codex'
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

const armorValueMap = {
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
type Source = 'other' | 'fire' | 'explosion' | 'projectile' | 'fall'
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

const finalDamage = computed(() => {
  const armorValue =
    armorValueMap[helmet.value.material].helmet +
    armorValueMap[chestplate.value.material].chestplate +
    armorValueMap[leggings.value.material].leggings +
    armorValueMap[boots.value.material].boots
  const armorToughness =
    armorToughnessMap[helmet.value.material].helmet +
    armorToughnessMap[chestplate.value.material].chestplate +
    armorToughnessMap[leggings.value.material].leggings +
    armorToughnessMap[boots.value.material].boots

  const a = 0.2 * armorValue
  const b = armorValue - sourceDamage.value / (2 + 0.25 * armorToughness)
  const x = Math.min(20, Math.max(a, b)) / 25 - 0.15 * breachLevel.value

  const materialFactor = Math.min(1, 1 - x)

  function determineEpf(level: number, enchantment: BootsEnchantment): number {
    const epfMap: Record<BootsEnchantment, [number, number, number, number, number]> = {
      empty: [0, 0, 0, 0, 0],
      protection: [0, 1, 2, 3, 4],
      fireProtection: [0, 2, 4, 6, 8],
      blastProtection: [0, 2, 4, 6, 8],
      projectileProtection: [0, 2, 4, 6, 8],
      featherFalling: [0, 3, 6, 9, 12],
    }

    if (enchantment === 'protection') return epfMap[enchantment][level]
    if (enchantment === 'fireProtection' && source.value === 'fire')
      return epfMap[enchantment][level]
    if (enchantment === 'blastProtection' && source.value === 'explosion')
      return epfMap[enchantment][level]
    if (enchantment === 'projectileProtection' && source.value === 'projectile')
      return epfMap[enchantment][level]
    if (enchantment === 'featherFalling' && source.value === 'fall')
      return epfMap[enchantment][level]

    return 0
  }

  const cumulativeEpf = Math.min(
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
      ),
  )
  console.log(cumulativeEpf)
  const epf = cumulativeEpf / 25 || 0

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

    <div class="flex items-center justify-between">
      <I18nT tag="span" keypath="armor.finalDamage" class="font-bold">
        <template #damage>
          <output id="output" class="text-lg font-mono" @click="selectOutput">{{
            finalDamage.toFixed(2)
          }}</output>
        </template>
      </I18nT>
    </div>
  </CalcField>
</template>
