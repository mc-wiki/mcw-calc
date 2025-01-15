<script setup lang="ts">
import type { Armor, ArmorEnchantment, BootsEnchantment, HelmetMaterial } from './App.vue'
import { wikiImg } from '@/utils/image'
import {
  CdxAccordion,
  CdxField,
  CdxSelect,
  CdxTextInput,
  type MenuItemData,
} from '@wikimedia/codex'
import { useI18n } from 'vue-i18n'

const { type } = defineProps<{
  type: 'helmet' | 'chestplate' | 'leggings' | 'boots'
}>()

const model = defineModel<Armor<HelmetMaterial, BootsEnchantment>>()

const { t } = useI18n()

function materials(type: 'helmet' | 'chestplate' | 'leggings' | 'boots'): MenuItemData[] {
  return [
    { label: 'Empty', value: 'empty', thumbnail: { url: wikiImg('BlockSprite_air') } },
    ...(type === 'helmet'
      ? [
          {
            label: 'Turtle Shell',
            value: 'turtle',
            thumbnail: { url: wikiImg('ItemSprite_turtle-shell') },
          },
        ]
      : []),
    {
      label: 'Leather',
      value: 'leather',
      thumbnail: {
        url: wikiImg(
          `ItemSprite_leather-${
            {
              helmet: 'cap',
              chestplate: 'tunic',
              leggings: 'pants',
              boots: 'boots',
            }[type]
          }`,
        ),
      },
    },
    { label: 'Golden', value: 'golden', thumbnail: { url: wikiImg(`ItemSprite_golden-${type}`) } },
    {
      label: 'Chainmail',
      value: 'chainmail',
      thumbnail: { url: wikiImg(`ItemSprite_chainmail-${type}`) },
    },
    { label: 'Iron', value: 'iron', thumbnail: { url: wikiImg(`ItemSprite_iron-${type}`) } },
    {
      label: 'Diamond',
      value: 'diamond',
      thumbnail: { url: wikiImg(`ItemSprite_diamond-${type}`) },
    },
    {
      label: 'Netherite',
      value: 'netherite',
      thumbnail: { url: wikiImg(`ItemSprite_netherite-${type}`) },
    },
  ]
}
</script>
<template>
  <CdxAccordion open>
    <template #title>
      {{ t(`armor.${type}`) }}
    </template>

    <CdxField class="mb-4">
      <template #label>
        {{ t('armor.material') }}
      </template>

      <CdxSelect v-model:selected="model!.material" :menu-items="materials(type)">
        <template #menu-item="{ menuItem }: { menuItem: MenuItemData }">
          <div class="flex items-center">
            <img
              class="pixel-image mr-2"
              width="16"
              height="16"
              loading="lazy"
              :src="menuItem.thumbnail?.url"
              :alt="menuItem.label"
            />
            <span>{{ menuItem.label }}</span>
          </div>
        </template>
      </CdxSelect>
    </CdxField>

    <div class="flex flex-row flex-wrap gap-6">
      <div
        v-for="(e, index) in model?.enchantments"
        :key="e.enchantment"
        class="flex items-center gap-2"
      >
        <CdxField>
          <template #label>
            {{ t('armor.enchantment', { index: index + 1 }) }}
          </template>

          <CdxSelect
            v-model:selected="e.enchantment"
            :menu-items="
              [
                'empty',
                'protection',
                'fireProtection',
                'blastProtection',
                'projectileProtection',
                'featherFalling',
                ...(type === 'boots' ? ['featherFalling'] : []),
              ].map((enchantment) => ({
                label: t(`armor.enchantment.${enchantment}`),
                value: enchantment,
              }))
            "
            @update:selected="
              (value: ArmorEnchantment) => {
                if (
                  value === 'empty' &&
                  model!.enchantments.length > 1 &&
                  model!.enchantments.length !== index + 1
                ) {
                  model!.enchantments.splice(index, 1)
                }
                if (model!.enchantments.length === index + 1 && value !== 'empty') {
                  model!.enchantments.push({ enchantment: 'empty', level: 1 })
                }
              }
            "
          />
        </CdxField>

        <CdxField>
          <template #label>
            {{ t('armor.enchantment.level') }}
          </template>

          <CdxTextInput
            v-model="e.level"
            class="level-input min-w-[4em]"
            type="number"
            min="1"
            :disabled="e.enchantment === 'empty'"
          />
        </CdxField>
      </div>
    </div>
  </CdxAccordion>
</template>
