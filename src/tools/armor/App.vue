<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { CdxSelect, CdxTextInput } from '@wikimedia/codex'

type ArmorMaterial =
  | 'empty'
  | 'leather'
  | 'golden'
  | 'chainmail'
  | 'iron'
  | 'diamond'
  | 'netherite'
type HelmetMaterial = 'turtle' | ArmorMaterial

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

type ArmorEnchantment =
  | 'empty'
  | 'protection'
  | 'fireProtection'
  | 'blastProtection'
  | 'projectileProtection'
type BootsEnchantment = 'featherFalling' | ArmorEnchantment

const ePFMap: Record<
  BootsEnchantment,
  [number, number, number, number, number]
> = {
  empty: [0, 0, 0, 0, 0],
  protection: [0, 1, 2, 3, 4],
  fireProtection: [0, 2, 4, 6, 8],
  blastProtection: [0, 2, 4, 6, 8],
  projectileProtection: [0, 2, 4, 6, 8],
  featherFalling: [0, 3, 6, 9, 12],
}

type Armor<M, E> = {
  material: M
  enchantment: E
  enchantmentLevel: 0 | 1 | 2 | 3 | 4
  featherFalling: BootsEnchantment
  featherFallingLevel: 0 | 1 | 2 | 3 | 4
}

const damage = ref(0)
const helmet = reactive<Armor<HelmetMaterial, ArmorEnchantment>>({
  material: 'empty',
  enchantment: 'empty',
  enchantmentLevel: 1,
  featherFalling: 'empty',
  featherFallingLevel: 1,
})
const chestplate = reactive<Armor<ArmorMaterial, ArmorEnchantment>>({
  material: 'empty',
  enchantment: 'empty',
  enchantmentLevel: 1,
  featherFalling: 'empty',
  featherFallingLevel: 1,
})
const leggings = reactive<Armor<ArmorMaterial, ArmorEnchantment>>({
  material: 'empty',
  enchantment: 'empty',
  enchantmentLevel: 1,
  featherFalling: 'empty',
  featherFallingLevel: 1,
})
const boots = reactive<Armor<ArmorMaterial, ArmorEnchantment>>({
  material: 'empty',
  enchantment: 'empty',
  enchantmentLevel: 1,
  featherFalling: 'empty',
  featherFallingLevel: 1,
})

const actualDamage = computed(() => {
  const armorValue =
    armorValueMap[helmet.material].helmet +
    armorValueMap[chestplate.material].chestplate +
    armorValueMap[leggings.material].leggings +
    armorValueMap[boots.material].boots
  const armorToughness =
    armorToughnessMap[helmet.material].helmet +
    armorToughnessMap[chestplate.material].chestplate +
    armorToughnessMap[leggings.material].leggings +
    armorToughnessMap[boots.material].boots

  const a = 0.2 * armorValue
  const b = armorValue - damage.value / (2 + 0.5 * armorToughness)
  const x = Math.min(20, Math.max(a, b)) / 25

  const materialFactor = 1 - x

  const cumulativeEPF = Math.min(
    20,
    ePFMap[helmet.enchantment][helmet.enchantmentLevel] +
      ePFMap[chestplate.enchantment][chestplate.enchantmentLevel] +
      ePFMap[leggings.enchantment][leggings.enchantmentLevel] +
      ePFMap[boots.enchantment][boots.enchantmentLevel] +
      ePFMap[boots.featherFalling][boots.featherFallingLevel]
  )
  const ePF = cumulativeEPF / 25 || 1

  return materialFactor * ePF * damage.value
})
</script>
<template>
  <table class="wikitable" style="margin: auto">
    <caption>
      Actual damage taken
    </caption>
    <tbody>
      <tr>
        <th scope="col">Slot</th>
        <th scope="col">Material</th>
        <th scope="col">Enchantment 1</th>
        <th scope="col">Enchantment 2</th>
      </tr>
      <tr>
        <th scope="row">Helmet</th>
        <td>
          <CdxSelect
            v-model:selected="helmet.material"
            :menu-items="[
              { label: 'Empty', value: 'empty' },
              { label: 'Turtle Shell', value: 'turtle' },
              { label: 'Leather', value: 'leather' },
              { label: 'Golden', value: 'golden' },
              { label: 'Chainmail', value: 'chainmail' },
              { label: 'Iron', value: 'iron' },
              { label: 'Diamond', value: 'diamond' },
              { label: 'Netherite', value: 'netherite' },
            ]"
          />
        </td>
        <td>
          <div style="display: flex; flex-direction: row">
            <CdxSelect
              v-model:selected="helmet.enchantment"
              :menu-items="[
                { label: 'Empty', value: 'empty' },
                { label: 'Protection', value: 'protection' },
                { label: 'Fire Protection', value: 'fireProtection' },
                { label: 'Blast Protection', value: 'blastProtection' },
                {
                  label: 'Projectile Protection',
                  value: 'projectileProtection',
                },
              ]"
            />
            <CdxSelect
              v-if="helmet.enchantment !== 'empty'"
              v-model:selected="helmet.enchantmentLevel"
              :menu-items="[
                { label: 'I', value: 1 },
                { label: 'II', value: 2 },
                { label: 'III', value: 3 },
                { label: 'IV', value: 4 },
              ]"
            />
          </div>
        </td>
        <td>N/A</td>
      </tr>
      <tr>
        <th scope="row">Chestplate</th>
        <td>
          <CdxSelect
            v-model:selected="chestplate.material"
            :menu-items="[
              { label: 'Empty', value: 'empty' },
              { label: 'Leather', value: 'leather' },
              { label: 'Golden', value: 'golden' },
              { label: 'Chainmail', value: 'chainmail' },
              { label: 'Iron', value: 'iron' },
              { label: 'Diamond', value: 'diamond' },
              { label: 'Netherite', value: 'netherite' },
            ]"
          />
        </td>
        <td>
          <div style="display: flex; flex-direction: row">
            <CdxSelect
              v-model:selected="chestplate.enchantment"
              :menu-items="[
                { label: 'Empty', value: 'empty' },
                { label: 'Protection', value: 'protection' },
                { label: 'Fire Protection', value: 'fireProtection' },
                { label: 'Blast Protection', value: 'blastProtection' },
                {
                  label: 'Projectile Protection',
                  value: 'projectileProtection',
                },
              ]"
            />
            <CdxSelect
              v-if="chestplate.enchantment !== 'empty'"
              v-model:selected="chestplate.enchantmentLevel"
              :menu-items="[
                { label: 'I', value: 1 },
                { label: 'II', value: 2 },
                { label: 'III', value: 3 },
                { label: 'IV', value: 4 },
              ]"
            />
          </div>
        </td>
        <td>N/A</td>
      </tr>
      <tr>
        <th scope="row">Leggings</th>
        <td>
          <CdxSelect
            v-model:selected="leggings.material"
            :menu-items="[
              { label: 'Empty', value: 'empty' },
              { label: 'Leather', value: 'leather' },
              { label: 'Golden', value: 'golden' },
              { label: 'Chainmail', value: 'chainmail' },
              { label: 'Iron', value: 'iron' },
              { label: 'Diamond', value: 'diamond' },
              { label: 'Netherite', value: 'netherite' },
            ]"
          />
        </td>
        <td>
          <div style="display: flex; flex-direction: row">
            <CdxSelect
              v-model:selected="leggings.enchantment"
              :menu-items="[
                { label: 'Empty', value: 'empty' },
                { label: 'Protection', value: 'protection' },
                { label: 'Fire Protection', value: 'fireProtection' },
                { label: 'Blast Protection', value: 'blastProtection' },
                {
                  label: 'Projectile Protection',
                  value: 'projectileProtection',
                },
              ]"
            />
            <CdxSelect
              v-if="leggings.enchantment !== 'empty'"
              v-model:selected="leggings.enchantmentLevel"
              :menu-items="[
                { label: 'I', value: 1 },
                { label: 'II', value: 2 },
                { label: 'III', value: 3 },
                { label: 'IV', value: 4 },
              ]"
            />
          </div>
        </td>
        <td>N/A</td>
      </tr>
      <tr>
        <th scope="row">Boots</th>
        <td>
          <CdxSelect
            v-model:selected="boots.material"
            :menu-items="[
              { label: 'Empty', value: 'empty' },
              { label: 'Leather', value: 'leather' },
              { label: 'Golden', value: 'golden' },
              { label: 'Chainmail', value: 'chainmail' },
              { label: 'Iron', value: 'iron' },
              { label: 'Diamond', value: 'diamond' },
              { label: 'Netherite', value: 'netherite' },
            ]"
          />
        </td>
        <td>
          <div style="display: flex; flex-direction: row">
            <CdxSelect
              v-model:selected="boots.enchantment"
              :menu-items="[
                { label: 'Empty', value: 'empty' },
                { label: 'Protection', value: 'protection' },
                { label: 'Fire Protection', value: 'fireProtection' },
                { label: 'Blast Protection', value: 'blastProtection' },
                {
                  label: 'Projectile Protection',
                  value: 'projectileProtection',
                },
                { label: 'Feather Falling', value: 'featherFalling' },
              ]"
            />
            <CdxSelect
              v-if="boots.enchantment !== 'empty'"
              v-model:selected="boots.enchantmentLevel"
              :menu-items="[
                { label: 'I', value: 1 },
                { label: 'II', value: 2 },
                { label: 'III', value: 3 },
                { label: 'IV', value: 4 },
              ]"
            />
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: row">
            <CdxSelect
              v-model:selected="boots.featherFalling"
              :menu-items="[
                { label: 'Empty', value: 'empty' },
                { label: 'Feather Falling', value: 'featherFalling' },
              ]"
            />
            <CdxSelect
              v-if="boots.featherFalling !== 'empty'"
              v-model:selected="boots.featherFallingLevel"
              :menu-items="[
                { label: 'I', value: 1 },
                { label: 'II', value: 2 },
                { label: 'III', value: 3 },
                { label: 'IV', value: 4 },
              ]"
            />
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <CdxTextInput v-model="damage" input-type="number" />

  {{ actualDamage }}
</template>
