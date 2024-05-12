<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { CdxCheckbox, CdxSelect, CdxTextInput, } from '@wikimedia/codex'
import {computed, ref} from "vue";
import {useI18n} from "@/utils/i18n.ts";
import locales from "@/tools/damage/locales.ts";

const { t, message } = useI18n(__TOOL_NAME__, locales)

const weaponsWithMaterial = ['sword', 'axe', 'pickaxe', 'shovel', 'hoe']
const weaponsWithDamageEnchantment = ['sword', 'axe', 'mace']
const enchantmentOptionMap = {
  sword: [
    { label: t('damage.sharpness'), value: 'sharpness' },
    { label: t('damage.smite'), value: 'smite' },
    { label: t('damage.baneOfArthropods'), value: 'baneOfArthropods' },
  ],
  axe: [
    { label: t('damage.sharpness'), value: 'sharpness' },
    { label: t('damage.smite'), value: 'smite' },
    { label: t('damage.baneOfArthropods'), value: 'baneOfArthropods' },
  ],
  mace: [
    { label: t('damage.density'), value: 'density' },
    { label: t('damage.smite'), value: 'smite' },
    { label: t('damage.baneOfArthropods'), value: 'baneOfArthropods' },
  ]
}
const attackSpeedMap: {[key: string]: {[key: string]: number}} = {
  sword: {
    wooden: 1.6,
    stone: 1.6,
    iron: 1.6,
    golden: 1.6,
    diamond: 1.6,
    netherite: 1.6,
  },
  axe: {
    wooden: 0.8,
    stone: 0.8,
    iron: 0.9,
    golden: 1,
    diamond: 1,
    netherite: 1,
  },
  pickaxe: {
    wooden: 1.2,
    stone: 1.2,
    iron: 1.2,
    golden: 1.2,
    diamond: 1.2,
    netherite: 1.2,
  },
  shovel: {
    wooden: 1,
    stone: 1,
    iron: 1,
    golden: 1,
    diamond: 1,
    netherite: 1,
  },
  hoe: {
    wooden: 1,
    stone: 2,
    iron: 3,
    golden: 1,
    diamond: 4,
    netherite: 4,
  },
  trident: {
    null: 1.1
  },
  mace: {
    null: 0.5
  },
  hand: {
    null: 4
  },
}
const attackDamageMap: {[key: string]: {[key: string]: number}} = {
  sword: {
    wooden: 4,
    stone: 5,
    iron: 6,
    golden: 4,
    diamond: 7,
    netherite: 8,
  },
  axe: {
    wooden: 7,
    stone: 9,
    iron: 9,
    golden: 7,
    diamond: 9,
    netherite: 10,
  },
  pickaxe: {
    wooden: 2,
    stone: 3,
    iron: 4,
    golden: 2,
    diamond: 5,
    netherite: 6,
  },
  shovel: {
    wooden: 2.5,
    stone: 3.5,
    iron: 4.5,
    golden: 2.5,
    diamond: 5.5,
    netherite: 6.5,
  },
  hoe: {
    wooden: 1,
    stone: 1,
    iron: 1,
    golden: 1,
    diamond: 1,
    netherite: 1,
  },
  trident: {
    null: 9
  },
  mace: {
    null: 6
  },
  hand: {
    null: 1
  },
}
const weaponImageMap: {[key: string]: {[key: string]: string}} = {
  sword: {
    wooden: 'https://minecraft.wiki/images/Wooden_Sword_JE2_BE2.png',
    stone: 'https://minecraft.wiki/images/Stone_Sword_JE2_BE2.png',
    iron: 'https://minecraft.wiki/images/Iron_Sword_JE2_BE2.png',
    golden: 'https://minecraft.wiki/images/Golden_Sword_JE3_BE2.png',
    diamond: 'https://minecraft.wiki/images/Diamond_Sword_JE2_BE2.png',
    netherite: 'https://minecraft.wiki/images/Netherite_Sword_JE2_BE2.png',
  },
  axe: {
    wooden: 'https://minecraft.wiki/images/Wooden_Axe_JE2_BE2.png',
    stone: 'https://minecraft.wiki/images/Stone_Axe_JE2_BE2.png',
    iron: 'https://minecraft.wiki/images/Iron_Axe_JE5_BE2.png',
    golden: 'https://minecraft.wiki/images/Golden_Axe_JE3_BE2.png',
    diamond: 'https://minecraft.wiki/images/Diamond_Axe_JE3_BE3.png',
    netherite: 'https://minecraft.wiki/images/Netherite_Axe_JE2.png',
  },
  pickaxe: {
    wooden: 'https://minecraft.wiki/images/Wooden_Pickaxe_JE3_BE3.png',
    stone: 'https://minecraft.wiki/images/Stone_Pickaxe_JE2_BE2.png',
    iron: 'https://minecraft.wiki/images/Iron_Pickaxe_JE3_BE2.png',
    golden: 'https://minecraft.wiki/images/Golden_Pickaxe_JE4_BE3.png',
    diamond: 'https://minecraft.wiki/images/Diamond_Pickaxe_JE3_BE3.png',
    netherite: 'https://minecraft.wiki/images/Netherite_Pickaxe_JE3.png',
  },
  shovel: {
    wooden: 'https://minecraft.wiki/images/Wooden_Shovel_JE2_BE2.png',
    stone: 'https://minecraft.wiki/images/Stone_Shovel_JE2_BE2.png',
    iron: 'https://minecraft.wiki/images/Iron_Shovel_JE3_BE2.png',
    golden: 'https://minecraft.wiki/images/Golden_Shovel_JE3_BE2.png',
    diamond: 'https://minecraft.wiki/images/Diamond_Shovel_JE3_BE3.png',
    netherite: 'https://minecraft.wiki/images/Netherite_Shovel_JE2_BE1.png',
  },
  hoe: {
    wooden: 'https://minecraft.wiki/images/Wooden_Hoe_JE3_BE3.png',
    stone: 'https://minecraft.wiki/images/Stone_Hoe_JE2_BE2.png',
    iron: 'https://minecraft.wiki/images/Iron_Hoe_JE2_BE2.png',
    golden: 'https://minecraft.wiki/images/Golden_Hoe_JE3_BE3.png',
    diamond: 'https://minecraft.wiki/images/Diamond_Hoe_JE3_BE3.png',
    netherite: 'https://minecraft.wiki/images/Netherite_Hoe_JE2_BE2.png',
  },
  trident: {
    null: 'https://minecraft.wiki/images/Trident_(item).png'
  },
  mace: {
    null: 'https://minecraft.wiki/images/Mace_JE1_BE1.png'
  },
  hand: {
    null: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/1x1.png'
  },

}

const enchantments = ref({
  sharpness: { name: 'sharpness', level: 0, max: 5 },
  smite: { name: 'smite', level: 0, max: 5 },
  baneOfArthropods: { name: 'baneOfArthropods', level: 0, max: 5 },
  impaling: { name: 'impaling', level: 0, max: 5 },
  density: { name: 'density', level: 0, max: 5 },
})
const strength = ref( { name: 'strength', level: 0, max: 2 })
const weakness = ref( { name: 'weakness', level: 0, max: 1 })

const type = ref('sword')
const storedMaterial = ref('wooden')
const material = computed(() => {
  if (weaponsWithMaterial.includes(type.value)) return storedMaterial.value
  else return 'null'
})
const damageEnchantmentType = ref('sharpness')
const activeEnchantments = computed(() => {
  const enchantmentList = []
  if (weaponsWithDamageEnchantment.includes(type.value)) enchantmentList.push(enchantments.value[damageEnchantmentType.value as keyof typeof enchantments.value])
  if (type.value === 'trident') enchantmentList.push(enchantments.value['impaling'])
  return enchantmentList
})
const activeEffects = ref([strength.value, weakness.value])
const fallDistance = ref(0)
const criticalHit = ref(true)
const secondsSinceLastAttack = ref(1.6)
const attackQualificationType = computed( () => {
  for (const enchantment of ['smite', 'baneOfArthropods', 'impaling']) {
    if (activeEnchantments.value.some(e => e.name === enchantment) && getEnchantment(enchantment).level) return getName(enchantment + 'Attack')
  }
  return ''
})

const damage = computed(() => {
  let attackDamage = getAttackDamage()
  let enchantmentDamage = getEnchantmentDamage()!
  const attackCooldownProgress = Math.max(0, Math.min((secondsSinceLastAttack.value + 0.025) * attackSpeedMap[type.value][material.value], 1))
  attackDamage *= (0.2 + attackCooldownProgress ** 2 * 0.8)
  enchantmentDamage *= attackCooldownProgress
  attackDamage += getMaceDamage()
  if ((type.value != 'mace' || fallDistance.value > 0) && criticalHit.value && attackCooldownProgress > 0.9) attackDamage = attackDamage * 1.5
  return attackDamage + enchantmentDamage
})

const attackSpeedMessage = computed(() => {
  return ((weaponsWithMaterial.includes(type.value)) ? getName(material.value) + ' ' : '') +
      getName(type.value) +
      message('damage.attackSpeed', [
          attackSpeedMap[type.value][material.value],
          (Math.round((1 / attackSpeedMap[type.value][material.value] + Number.EPSILON) * 1000) / 1000),
          (1 / attackSpeedMap[type.value][material.value]) == 1 ? '' : 's'
      ]).parse()
})

function getEnchantment(enchantment: string) {
  return activeEnchantments.value.find(e => e.name === enchantment)!
}
function getEffect(effect: string) {
  return activeEffects.value.find(e => e.name === effect)!
}

function getAttackDamage() {
  let attackDamage = attackDamageMap[type.value][material.value]
  attackDamage += 3 * getEffect('strength').level
  attackDamage += -4 * getEffect('weakness').level
  return Math.max(0, attackDamage)
}
function getEnchantmentDamage() {
  let enchantmentDamage = 0
  for (const enchantment of activeEnchantments.value) {
    if (enchantment.name == 'sharpness') enchantmentDamage += 1 + Math.max(0, enchantment.level - 1) * 0.5
    else if (enchantment.name == 'smite' || enchantment.name == 'baneOfArthropods' || enchantment.name == 'impaling') enchantmentDamage += enchantment.level * 2.5
  }
  return enchantmentDamage
}
function getMaceDamage() {
  if (activeEnchantments.value.some(e => e.name === 'density') && fallDistance.value > 1.5) {
    let maceBaseDamage
    if (fallDistance.value <= 3) maceBaseDamage = 4 * fallDistance.value
    else if (fallDistance.value <= 8) maceBaseDamage = 6 + 2 * fallDistance.value
    else maceBaseDamage = 14 + fallDistance.value

    const smashDamagePerFallenBlock = getEnchantment('density').level * 0.5
    return maceBaseDamage + smashDamagePerFallenBlock * fallDistance.value
  }
  return 0
}
function getName(name: string) {
  switch (name) {
    case 'sword':
      return t('damage.sword')
    case 'axe':
      return t('damage.axe')
    case 'pickaxe':
      return t('damage.pickaxe')
    case 'shovel':
      return t('damage.shovel')
    case 'hoe':
      return t('damage.hoe')
    case 'trident':
      return t('damage.trident')
    case 'mace':
      return t('damage.mace')
    case 'hand':
      return t('damage.hand')

    case 'wooden':
      return t('damage.wooden')
    case 'stone':
      return t('damage.stone')
    case 'iron':
      return t('damage.iron')
    case 'golden':
      return t('damage.golden')
    case 'diamond':
      return t('damage.diamond')
    case 'netherite':
      return t('damage.netherite')

    case 'sharpness':
      return t('damage.sharpness')
    case 'smite':
      return t('damage.smite')
    case 'baneOfArthropods':
      return t('damage.baneOfArthropods')
    case 'impaling':
      return t('damage.impaling')
    case 'density':
      return t('damage.density')

    case 'smiteAttack':
      return t('damage.smiteAttack')
    case 'baneOfArthropodsAttack':
      return t('damage.baneOfArthropodsAttack')
    case 'impalingAttack':
      return t('damage.impalingAttack')

    case 'strength':
      return t('damage.strength')
    case 'weakness':
      return t('damage.weakness')
  }
}

function handleTypeChange(type: string) {
  if (type == 'mace' && damageEnchantmentType.value == 'sharpness') {
    damageEnchantmentType.value = 'density'
    handleDamageEnchantmentChange('density')
  } else if (type == 'sword' || type == 'axe' && damageEnchantmentType.value == 'density') {
    damageEnchantmentType.value = 'sharpness'
    handleDamageEnchantmentChange('sharpness')
  }
}
function handleDamageEnchantmentChange(enchantment: string) {
  const labelElement = document.querySelector('label[for="enchantment-level-input"]')!
  labelElement.textContent = getName(enchantment) + ' level'
}
function validateLevelInput(modifier: {name: string, level: number, max: number}) {
  modifier.level = Math.floor(Math.min(modifier.max, Math.max(0, modifier.level)))
}
</script>
<template>
  <CalcField>
    <template #heading>{{t('damage.title')}}</template>
    <div style="display: flex; flex-direction: row; justify-content: space-between;">
      <div style="display: flex; flex-direction: column;">
        <div class="damage-calc-row">
          <CdxSelect
            v-model:selected="type"
            :menu-items="[
              { label: t('damage.sword'), value: 'sword' },
              { label: t('damage.axe'), value: 'axe' },
              { label: t('damage.pickaxe'), value: 'pickaxe' },
              { label: t('damage.shovel'), value: 'shovel' },
              { label: t('damage.hoe'), value: 'hoe' },
              { label: t('damage.trident'), value: 'trident' },
              { label: t('damage.mace'), value: 'mace' },
              { label: t('damage.hand'), value: 'hand' },
            ]"
            @update:selected="handleTypeChange"
          />
          <CdxSelect
            v-if="weaponsWithMaterial.includes(type)"
            v-model:selected="storedMaterial"
            :menu-items="[
              { label: t('damage.wooden'), value: 'wooden' },
              { label: t('damage.stone'), value: 'stone' },
              { label: t('damage.iron'), value: 'iron' },
              { label: t('damage.golden'), value: 'golden' },
              { label: t('damage.diamond'), value: 'diamond' },
              { label: t('damage.netherite'), value: 'netherite' },
            ]"
          />
          <CdxCheckbox v-model="criticalHit" id="critical-checkbox">
            <label for="critical-checkbox">{{t('damage.critical')}}</label>
          </CdxCheckbox>
        </div>
        <div class="damage-calc-row">
          <CdxSelect
            v-if="type == 'sword' || type == 'axe' || type == 'mace'"
            v-model:selected="damageEnchantmentType"
            :menu-items="enchantmentOptionMap[type]"
            @update:selected="handleDamageEnchantmentChange"
          />
        </div>
        <div class="damage-calc-row"
        v-for="enchantment in activeEnchantments"
        :key="enchantment.name">
          <label for="enchantment-level-input">{{getName(enchantment.name)}} level</label>
          <CdxTextInput
            inputType="number"
            min="0"
            :max="enchantment.max"
            v-model="enchantment.level"
            @update:modelValue="validateLevelInput(enchantment)"
            id="enchantment-level-input"
          />
        </div>
        <div class="damage-calc-row"
        v-if="type == 'mace'">
          <label for="fall-height-input">{{t('damage.fallDistance')}}</label>
          <CdxTextInput
            inputType="number"
            min="0"
            step="0.1"
            v-model="fallDistance"
            id="fall-height-input"
          />
        </div>
        <div class="damage-calc-row"
        v-for="effect in activeEffects"
        :key="effect.name">
          <label for="effect-level-input" >{{getName(effect.name) + t('damage.level')}}</label>
          <CdxTextInput
            inputType="number"
            min="0"
            :max="effect.max"
            v-model="effect.level"
            @update:modelValue="validateLevelInput(effect)"
            id="effect-level-input"
          />
        </div>
        <div class="damage-calc-row">
          <div class="damage-calc-row">
            <label for="time-since-attack-input">{{t('damage.seconds')}}</label>
            <CdxTextInput
              inputType="number"
              min="0"
              step="0.05"
              v-model="secondsSinceLastAttack"
              id="time-since-attack-input"
            />
            <span>{{attackSpeedMessage}}</span>
          </div>
        </div>
        <div class="damage-calc-row">
          <b>{{t('damage.damage') + (Math.round((damage + Number.EPSILON) * 100) / 100)}}</b>
          <span>{{attackQualificationType}}</span>
        </div>
      </div>
      <img width="64" height="64" :src="weaponImageMap[type][material]" />
    </div>
  </CalcField>
</template>
<style>
.damage-calc-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}
</style>