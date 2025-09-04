<script setup lang="ts">
import type { MenuItemData } from '@wikimedia/codex'
import type { Armor, ArmorEnchantment, HelmetMaterial } from './App.vue'
import { CdxField, CdxSelect, CdxTextInput } from '@wikimedia/codex'
import { useI18n } from 'vue-i18n'
import { getImageLink } from '@/utils/image'

const { type } = defineProps<{
  type: 'helmet' | 'chestplate' | 'leggings' | 'boots'
}>()

const model = defineModel<Armor<HelmetMaterial, ArmorEnchantment>>()

const { t } = useI18n()

function materials(type: 'helmet' | 'chestplate' | 'leggings' | 'boots'): MenuItemData[] {
  return [
    { label: 'Empty', value: 'empty', thumbnail: { url: getImageLink('en:BlockSprite_air.png') } },
    ...(type === 'helmet'
      ? [
          {
            label: 'Turtle Shell',
            value: 'turtle',
            thumbnail: { url: getImageLink('en:ItemSprite_turtle-shell.png') },
          },
        ]
      : []),
    {
      label: 'Leather',
      value: 'leather',
      thumbnail: {
        url: getImageLink(
          `en:ItemSprite_leather-${
            {
              helmet: 'cap',
              chestplate: 'tunic',
              leggings: 'pants',
              boots: 'boots',
            }[type]
          }.png`,
        ),
      },
    },
    {
      label: 'Golden',
      value: 'golden',
      thumbnail: { url: getImageLink(`en:ItemSprite_golden-${type}.png`) },
    },
    {
      label: 'Chainmail',
      value: 'chainmail',
      thumbnail: { url: getImageLink(`en:ItemSprite_chainmail-${type}.png`) },
    },
    {
      label: 'Iron',
      value: 'iron',
      thumbnail: { url: getImageLink(`en:ItemSprite_iron-${type}.png`) },
    },
    {
      label: 'Diamond',
      value: 'diamond',
      thumbnail: { url: getImageLink(`en:ItemSprite_diamond-${type}.png`) },
    },
    {
      label: 'Netherite',
      value: 'netherite',
      thumbnail: { url: getImageLink(`en:ItemSprite_netherite-${type}.png`) },
    },
  ]
}
</script>
<template>
  <div class="mt-2">
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

        <template #label="{ selectedMenuItem }: { selectedMenuItem: MenuItemData }">
          <div v-if="selectedMenuItem" class="flex items-center">
            <img
              class="pixel-image mr-2"
              width="16"
              height="16"
              loading="lazy"
              :src="selectedMenuItem?.thumbnail?.url"
              :alt="selectedMenuItem?.label"
            />
            <span>{{ selectedMenuItem?.label }}</span>
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
  </div>
</template>
