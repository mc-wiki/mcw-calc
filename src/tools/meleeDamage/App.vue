<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'
import {
  CdxButton,
  CdxCheckbox,
  CdxField,
  CdxIcon,
  CdxSelect,
  CdxTab,
  CdxTable,
  CdxTabs,
  CdxTextInput,
  type MenuItemData,
} from '@wikimedia/codex'
import { cdxIconTrash } from '@wikimedia/codex-icons'
import CalcField from '@/components/CalcField.vue'
import { parseWikitext } from '@/utils/i18n.ts'

const { t } = useI18n()

interface ToolData {
  name: string
  // Attribute Modifiers
  attackDamageJE: number
  attackDamageBE: number
  attackSpeed: number // Only for JE
}

interface AttributeModifier {
  uniqueID: string
  attribute: string
  operation: 'add_value' | 'add_multiplied_base' | 'add_multiplied_total'
  amount: number
}

// Base tools data ---------------------------------------------------------------------------------
const definedToolsData: ToolData[] = [
  { name: 'hand', attackDamageJE: 0, attackDamageBE: 0, attackSpeed: 0 },
  // Sword
  { name: 'wooden_sword', attackDamageJE: 3, attackDamageBE: 4, attackSpeed: -2.4 },
  { name: 'golden_sword', attackDamageJE: 3, attackDamageBE: 4, attackSpeed: -2.4 },
  { name: 'stone_sword', attackDamageJE: 4, attackDamageBE: 5, attackSpeed: -2.4 },
  { name: 'iron_sword', attackDamageJE: 5, attackDamageBE: 6, attackSpeed: -2.4 },
  { name: 'diamond_sword', attackDamageJE: 6, attackDamageBE: 7, attackSpeed: -2.4 },
  { name: 'netherite_sword', attackDamageJE: 7, attackDamageBE: 8, attackSpeed: -2.4 },
  // Shovel
  { name: 'wooden_shovel', attackDamageJE: 1.5, attackDamageBE: 1, attackSpeed: -3 },
  { name: 'golden_shovel', attackDamageJE: 1.5, attackDamageBE: 1, attackSpeed: -3 },
  { name: 'stone_shovel', attackDamageJE: 2.5, attackDamageBE: 2, attackSpeed: -3 },
  { name: 'iron_shovel', attackDamageJE: 3.5, attackDamageBE: 3, attackSpeed: -3 },
  { name: 'diamond_shovel', attackDamageJE: 4.5, attackDamageBE: 4, attackSpeed: -3 },
  { name: 'netherite_shovel', attackDamageJE: 5.5, attackDamageBE: 5, attackSpeed: -3 },
  // Pickaxe
  { name: 'wooden_pickaxe', attackDamageJE: 1, attackDamageBE: 1, attackSpeed: -2.8 },
  { name: 'golden_pickaxe', attackDamageJE: 1, attackDamageBE: 1, attackSpeed: -2.8 },
  { name: 'stone_pickaxe', attackDamageJE: 2, attackDamageBE: 2, attackSpeed: -2.8 },
  { name: 'iron_pickaxe', attackDamageJE: 3, attackDamageBE: 3, attackSpeed: -2.8 },
  { name: 'diamond_pickaxe', attackDamageJE: 4, attackDamageBE: 4, attackSpeed: -2.8 },
  { name: 'netherite_pickaxe', attackDamageJE: 5, attackDamageBE: 5, attackSpeed: -2.8 },
  // Axe
  { name: 'wooden_axe', attackDamageJE: 6, attackDamageBE: 3, attackSpeed: -3.2 },
  { name: 'golden_axe', attackDamageJE: 6, attackDamageBE: 3, attackSpeed: -3 },
  { name: 'stone_axe', attackDamageJE: 8, attackDamageBE: 4, attackSpeed: -3.2 },
  { name: 'iron_axe', attackDamageJE: 8, attackDamageBE: 5, attackSpeed: -3.1 },
  { name: 'diamond_axe', attackDamageJE: 8, attackDamageBE: 6, attackSpeed: -3 },
  { name: 'netherite_axe', attackDamageJE: 9, attackDamageBE: 7, attackSpeed: -3 },
  // Hoe
  { name: 'wooden_hoe', attackDamageJE: 0, attackDamageBE: 1, attackSpeed: -3 },
  { name: 'golden_hoe', attackDamageJE: 0, attackDamageBE: 1, attackSpeed: -3 },
  { name: 'stone_hoe', attackDamageJE: 0, attackDamageBE: 2, attackSpeed: -2 },
  { name: 'iron_hoe', attackDamageJE: 0, attackDamageBE: 3, attackSpeed: -1 },
  { name: 'diamond_hoe', attackDamageJE: 0, attackDamageBE: 4, attackSpeed: 0 },
  { name: 'netherite_hoe', attackDamageJE: 0, attackDamageBE: 5, attackSpeed: 0 },
  // Others
  { name: 'trident', attackDamageJE: 8, attackDamageBE: 8, attackSpeed: -2.9 },
  { name: 'mace', attackDamageJE: 5, attackDamageBE: 5, attackSpeed: -3.4 },
]

const directAMToolData: ToolData = {
  name: 'directAM',
  attackDamageJE: 0,
  attackDamageBE: 0,
  attackSpeed: 0,
}

const maceWithDirectAMToolData: ToolData = {
  name: 'maceAM',
  attackDamageJE: 0,
  attackDamageBE: 0,
  attackSpeed: 0,
}

const attributeModifierColumns = [
  { id: 'attribute', label: t('meleeDamage.tool.modifier.attribute') },
  { id: 'operation', label: t('meleeDamage.tool.modifier.operation') },
  { id: 'amount', label: t('meleeDamage.tool.modifier.amount') },
  { id: 'action', label: t('meleeDamage.tool.modifier.action') },
]

// Calculator States -------------------------------------------------------------------------------
const edition = ref<'java' | 'bedrock'>('java')
const isJavaEdition = computed(() => edition.value === 'java') // For critical damage and attack cooldown
const canObtainInSurvival = ref(true)

// Attacker states
const baseMeleeDamage = ref(1) // Player base damage
const strengthLevel = ref(0) // Strength level
const weaknessLevel = ref(0) // Weakness level
const hasteLevel = ref(0) // Haste level, only for JE
const miningFatigueLevel = ref(0) // Mining fatigue level, only for JE
const fallHeight = ref(0) // Fall height, only for mace

// Tool states
const selectedTool = ref('hand') // Selected tool
const nowSelectedTool = computed(
  () =>
    definedToolsData.find((tool) => tool.name === selectedTool.value) ??
    (selectedTool.value === 'direct-am' ? directAMToolData : maceWithDirectAMToolData),
)
const usingDirectAM = computed(
  () => nowSelectedTool.value.name === 'directAM' || nowSelectedTool.value.name === 'maceAM',
) // For direct attribute modifiers
const isHand = computed(() => nowSelectedTool.value.name === 'hand') // For hand
const isMaceItem = computed(
  () => nowSelectedTool.value.name === 'mace' || nowSelectedTool.value.name === 'maceAM',
) // For mace additional damage
const isTridentItem = computed(() => nowSelectedTool.value.name === 'trident') // For trident additional damage
const isGeneralWeapon = computed(
  () =>
    nowSelectedTool.value.name.endsWith('_sword') || nowSelectedTool.value.name.endsWith('_axe'),
) // For general weapon additional damage

const attributeModifiers = ref([] as AttributeModifier[]) // Attribute modifiers, only for direct attribute modifiers
const sharpnessLevel = ref(0) // Sharpness level, only for general weapon
const smiteLevel = ref(0) // Smite level, only for general weapon
const baneOfArthropodsLevel = ref(0) // Bane of arthropods level, only for general weapon
const impalingLevel = ref(0) // Impaling level, only for trident
const densityLevel = ref(0) // Density level, only for mace

// Victim states
const isUndead = ref(false) // For smite damage
const isArthropod = ref(false) // For bane of arthropods damage
const isWaterMob = ref(false) // For impaling damage

// Attack arguments
const critical = ref(false) // Critical hit
const tickAfterLastAttack = ref(20) // For attack cooldown, only for JE

function getToolsMenuItems() {
  const items: MenuItemData[] = definedToolsData.map((tool) => ({
    value: tool.name,
    label: t(`meleeDamage.defaultTools.${tool.name}`),
    thumbnail: {
      url: `https://minecraft.wiki/images/ItemSprite_${tool.name.replace('_', '-')}.png?format=original`,
    },
  }))
  items[0].thumbnail!.url = 'https://minecraft.wiki/images/ItemSprite_paper.png?format=original'
  if (!canObtainInSurvival.value && isJavaEdition.value) {
    items.push({
      value: 'direct-am',
      label: t('meleeDamage.defaultTools.directAttributeModifiers'),
      thumbnail: {
        url: 'https://minecraft.wiki/images/ItemSprite_stick.png?format=original',
      },
    })
    items.push({
      value: 'mace-am',
      label: t('meleeDamage.defaultTools.maceAttributeModifiers'),
      thumbnail: {
        url: 'https://minecraft.wiki/images/ItemSprite_mace.png?format=original',
      },
    })
  }
  return items
}

// Compute the total attack damage -----------------------------------------------------------------
// Formula for melee damage: [[zh:近战攻击]]

const baseMeleeAttackDamage = computed(() => {
  // Base Melee Attack Damage  = Attribute 'generic.attack_damage'
  let baseDamage = baseMeleeDamage.value // Attribute Base Damage

  if (usingDirectAM.value) {
    // Compute with direct attribute modifiers
    baseDamage += attributeModifiers.value
      .filter((m) => m.attribute === 'generic.attack_damage')
      .filter((m) => m.operation === 'add_value')
      .map((m) => m.amount)
      .reduce((acc, cur) => acc + cur, 0)
    baseDamage *= attributeModifiers.value
      .filter((m) => m.attribute === 'generic.attack_damage')
      .filter((m) => m.operation === 'add_multiplied_base')
      .map((m) => m.amount)
      .reduce((acc, cur) => acc + cur, 1)
    baseDamage *= attributeModifiers.value
      .filter((m) => m.attribute === 'generic.attack_damage')
      .filter((m) => m.operation === 'add_multiplied_total')
      .map((m) => m.amount)
      .reduce((acc, cur) => acc * (cur + 1), 1)
  } else {
    // Compute with tool attack damage
    baseDamage += isJavaEdition.value
      ? nowSelectedTool.value.attackDamageJE
      : nowSelectedTool.value.attackDamageBE
  }

  // Compute status effect
  if (isJavaEdition.value) {
    baseDamage += Math.floor(strengthLevel.value) * 3
    baseDamage -= Math.floor(weaknessLevel.value) * 4
  } else {
    for (let i = 0; i < strengthLevel.value; i++) baseDamage = 1.3 * baseDamage + 1
    for (let i = 0; i < weaknessLevel.value; i++) baseDamage = 0.8 * baseDamage - 0.5
  }

  // Sanitize the base damage
  if (baseDamage < 0) baseDamage = 0
  if (baseDamage > 2048) baseDamage = 2048

  return baseDamage
})

const enchantmentDamage = computed(() => {
  let enchantmentDamage = 0

  enchantmentDamage +=
    (!canObtainInSurvival.value || isGeneralWeapon.value) && !isHand.value
      ? isJavaEdition.value
        ? Math.floor(sharpnessLevel.value) > 0
          ? 0.5 * Math.floor(sharpnessLevel.value) + 0.5
          : 0
        : Math.floor(sharpnessLevel.value) * 1.25
      : 0
  enchantmentDamage +=
    isUndead.value &&
    (!canObtainInSurvival.value || isGeneralWeapon.value || isMaceItem.value) &&
    !isHand.value
      ? 2.5 * Math.floor(smiteLevel.value)
      : 0
  enchantmentDamage +=
    isArthropod.value &&
    (!canObtainInSurvival.value || isGeneralWeapon.value || isMaceItem.value) &&
    !isHand.value
      ? 2.5 * Math.floor(baneOfArthropodsLevel.value)
      : 0
  enchantmentDamage +=
    isWaterMob.value && (!canObtainInSurvival.value || isTridentItem.value) && !isHand.value
      ? 2.5 * Math.floor(impalingLevel.value)
      : 0

  if (!isJavaEdition.value) enchantmentDamage = Math.floor(enchantmentDamage)

  return enchantmentDamage
})

const additionalDamage = computed(() => {
  if (!isMaceItem.value) return 0
  if (fallHeight.value < 1.5) return 0

  let additionalDamage: number
  if (fallHeight.value < 3) additionalDamage = 4 * fallHeight.value
  else if (fallHeight.value < 8) additionalDamage = 2 * fallHeight.value + 6
  else additionalDamage = fallHeight.value + 14

  additionalDamage += 0.5 * Math.floor(densityLevel.value) * fallHeight.value
  return additionalDamage
})

const attackSpeed = computed(() => {
  let attackSpeed = 4
  if (usingDirectAM.value) {
    attackSpeed += attributeModifiers.value
      .filter((m) => m.attribute === 'generic.attack_speed')
      .filter((m) => m.operation === 'add_value')
      .map((m) => m.amount)
      .reduce((acc, cur) => acc + cur, 0)
    attackSpeed *= attributeModifiers.value
      .filter((m) => m.attribute === 'generic.attack_speed')
      .filter((m) => m.operation === 'add_multiplied_base')
      .map((m) => m.amount)
      .reduce((acc, cur) => acc + cur, 1)
    attackSpeed *= attributeModifiers.value
      .filter((m) => m.attribute === 'generic.attack_speed')
      .filter((m) => m.operation === 'add_multiplied_total')
      .map((m) => m.amount)
      .reduce((acc, cur) => acc * (cur + 1), 1)
  } else {
    attackSpeed += nowSelectedTool.value.attackSpeed
  }

  // Compute status effect
  attackSpeed *= 1 + 0.1 * Math.floor(hasteLevel.value)
  attackSpeed *= 1 - 0.1 * Math.floor(miningFatigueLevel.value)

  // Sanitize the attack speed
  if (attackSpeed < 0) attackSpeed = 0
  if (attackSpeed > 1024) attackSpeed = 1024

  return attackSpeed
})

const cooldownProgress = computed(() => {
  if (!isJavaEdition.value) return 1
  if (attackSpeed.value === 0) return 0
  return Math.min((Math.floor(tickAfterLastAttack.value) + 0.5) / (20 / attackSpeed.value), 1)
})

const canCritical = computed(() => {
  if (isMaceItem.value && fallHeight.value === 0) return false
  return !(isJavaEdition.value && cooldownProgress.value < 0.9)
})

const totalAttackDamage = computed(() => {
  const criticalMultiplier = critical.value && canCritical.value ? 1.5 : 1
  if (isJavaEdition.value) {
    return (
      (baseMeleeAttackDamage.value * (0.2 + 0.8 * cooldownProgress.value * cooldownProgress.value) +
        additionalDamage.value) *
        criticalMultiplier +
      enchantmentDamage.value * cooldownProgress.value
    )
  } else {
    return (
      (baseMeleeAttackDamage.value + enchantmentDamage.value + additionalDamage.value) *
      criticalMultiplier
    )
  }
})

const fullCooldown = computed(() => {
  if (!isJavaEdition.value) return 0
  if (attackSpeed.value === 0) return 0
  return Math.ceil(20 / attackSpeed.value - 0.5)
})

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(Math.max(value, min), max)
}

function sanitizeCanObtainInSurvival() {
  if (usingDirectAM.value && (canObtainInSurvival.value || !isJavaEdition.value)) {
    selectedTool.value = selectedTool.value === 'direct-am' ? 'hand' : 'mace'
  }
  if (canObtainInSurvival.value) {
    strengthLevel.value = clamp(strengthLevel.value, 0, 2)
    weaknessLevel.value = clamp(weaknessLevel.value, 0, 2)
    hasteLevel.value = clamp(hasteLevel.value, 0, 2)
    miningFatigueLevel.value = clamp(miningFatigueLevel.value, 0, 3)
    sharpnessLevel.value = clamp(sharpnessLevel.value, 0, 5)
    smiteLevel.value = clamp(smiteLevel.value, 0, 5)
    baneOfArthropodsLevel.value = clamp(baneOfArthropodsLevel.value, 0, 5)
    impalingLevel.value = clamp(impalingLevel.value, 0, 5)
    densityLevel.value = clamp(densityLevel.value, 0, 5)

    sanitizeEnchantmentState()
    const isSharpness = sharpnessLevel.value > 0
    const isSmite = smiteLevel.value > 0
    const isBaneOfArthropods = baneOfArthropodsLevel.value > 0
    const isDensity = densityLevel.value > 0
    if (isBaneOfArthropods && isDensity) baneOfArthropodsLevel.value = 0
    if (isSmite && isBaneOfArthropods) baneOfArthropodsLevel.value = 0
    if (isSmite && isDensity) smiteLevel.value = 0
    if (isSharpness && isSmite) smiteLevel.value = 0
    if (isSharpness && isBaneOfArthropods) baneOfArthropodsLevel.value = 0
  }
}

function checkEnchantment(
  checkMace: boolean,
  otherPredicate: () => boolean,
  conflictPredicate: () => boolean,
) {
  if (isHand.value) return false
  if (!otherPredicate()) return false
  if (!canObtainInSurvival.value) return true
  return (isGeneralWeapon.value || (checkMace && isMaceItem.value)) && conflictPredicate()
}

function sanitizeEnchantmentState() {
  if (isHand.value) {
    sharpnessLevel.value = 0
    smiteLevel.value = 0
    baneOfArthropodsLevel.value = 0
    impalingLevel.value = 0
    densityLevel.value = 0
  }
  if (!canObtainInSurvival.value) return
  if (isGeneralWeapon.value) {
    impalingLevel.value = 0
    densityLevel.value = 0
  }
  if (isMaceItem.value) {
    sharpnessLevel.value = 0
    impalingLevel.value = 0
  }
  if (isTridentItem.value) {
    sharpnessLevel.value = 0
    smiteLevel.value = 0
    baneOfArthropodsLevel.value = 0
    densityLevel.value = 0
  }
}

function selectOutput() {
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.selectAllChildren(document.getElementById('output')!)
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('meleeDamage.title') }}
    </template>
    <div class="mt-2">
      <CdxTabs v-model:active="edition">
        <CdxTab name="java" :label="t('meleeDamage.java')" />
        <CdxTab name="bedrock" :label="t('meleeDamage.bedrock')" />
      </CdxTabs>

      <CdxCheckbox
        id="can-obtain-in-survival-checkbox"
        v-model="canObtainInSurvival"
        class="mt-2"
        @update:model-value="sanitizeCanObtainInSurvival"
      >
        {{ t('meleeDamage.canObtainInSurvival') }}
      </CdxCheckbox>

      <CalcField>
        <!-- Attacker state panel -->
        <template #heading>
          {{ t('meleeDamage.attacker.title') }}
        </template>

        <div class="flex flex-row flex-wrap gap-4">
          <CdxField class="mt-0">
            <template #label>
              {{ t('meleeDamage.attacker.mobBaseDamage') }}
            </template>
            <CdxTextInput
              id="base-melee-damage-input"
              v-model="baseMeleeDamage"
              class="w-20 min-w-20 font-mono"
              input-type="number"
              min="0"
              max="2048"
              step="0.5"
            />
          </CdxField>

          <CdxField class="mt-0">
            <template #label>
              <span v-html="parseWikitext(t('meleeDamage.attacker.strengthLevel'))" />
            </template>

            <CdxTextInput
              id="strength-level-input"
              v-model="strengthLevel"
              class="w-20 min-w-20 font-mono"
              input-type="number"
              min="0"
              :max="canObtainInSurvival ? 2 : 255"
              step="1"
            />
          </CdxField>

          <CdxField class="mt-0">
            <template #label>
              <span v-html="parseWikitext(t('meleeDamage.attacker.weaknessLevel'))" />
            </template>

            <CdxTextInput
              id="weakness-level-input"
              v-model="weaknessLevel"
              class="w-20 min-w-20 font-mono"
              input-type="number"
              min="0"
              :max="canObtainInSurvival ? 2 : 255"
              step="1"
            />
          </CdxField>

          <CdxField v-if="isJavaEdition" class="mt-0">
            <template #label>
              <span v-html="parseWikitext(t('meleeDamage.attacker.hasteLevel'))" />
            </template>

            <CdxTextInput
              id="haste-level-input"
              v-model="hasteLevel"
              class="w-20 min-w-20 font-mono"
              input-type="number"
              min="0"
              :max="canObtainInSurvival ? 2 : 255"
              step="1"
            />
          </CdxField>

          <CdxField v-if="isJavaEdition" class="mt-0">
            <template #label>
              <span v-html="parseWikitext(t('meleeDamage.attacker.miningFatigueLevel'))" />
            </template>

            <CdxTextInput
              id="mining-fatigue-level-input"
              v-model="miningFatigueLevel"
              class="w-20 min-w-20 font-mono"
              input-type="number"
              min="0"
              :max="canObtainInSurvival ? 3 : 255"
              step="1"
            />
          </CdxField>

          <CdxField v-if="isMaceItem" class="mt-0">
            <template #label>
              <span v-html="parseWikitext(t('meleeDamage.attacker.fallHeight'))" />
            </template>

            <CdxTextInput
              id="fall-height-input"
              v-model="fallHeight"
              class="w-20 min-w-20 font-mono"
              input-type="number"
              min="0"
              step="0.5"
            />
          </CdxField>
        </div>
      </CalcField>

      <CalcField>
        <!-- attack condition panel -->
        <template #heading>
          {{ t('meleeDamage.attackCondition.title') }}
        </template>
        <div class="flex flex-col mt-2">
          <CdxCheckbox v-if="canCritical" id="critical-checkbox" v-model="critical" inline>
            {{ t('meleeDamage.attackCondition.critical') }}
          </CdxCheckbox>
          <CdxField v-if="isJavaEdition">
            <template #label>
              {{ t('meleeDamage.attackCondition.tickAfterLastAttack') }}
            </template>

            <div class="flex gap-2">
              <CdxTextInput
                id="tick-after-last-attack-input"
                v-model="tickAfterLastAttack"
                class="w-24 min-w-24 font-mono"
                input-type="number"
                min="0"
                :max="fullCooldown"
                step="1"
              />
              <CdxButton @click="tickAfterLastAttack = fullCooldown">
                {{ t('meleeDamage.attackCondition.setFullCooldown') }}
              </CdxButton>
            </div>
          </CdxField>
        </div>
      </CalcField>

      <CalcField>
        <!-- Tool state panel -->
        <template #heading>
          {{ t('meleeDamage.tool.title') }}
        </template>
        <div class="flex flex-col gap-2">
          <CdxField class="mt-0">
            <template #label>{{ t('meleeDamage.tool.select') }}</template>

            <CdxSelect
              v-model:selected="selectedTool"
              :menu-items="getToolsMenuItems()"
              @update:selected="sanitizeEnchantmentState"
            >
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
                <div class="flex items-center">
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
          <CdxTable
            v-if="usingDirectAM"
            :caption="t('meleeDamage.tool.modifier.title')"
            :data="attributeModifiers"
            :columns="attributeModifiers.length === 0 ? [] : attributeModifierColumns"
          >
            <template #header>
              <CdxButton
                @click="
                  attributeModifiers.push({
                    uniqueID: Math.random().toString(36).substring(2, 9),
                    attribute: 'generic.attack_damage',
                    operation: 'add_value',
                    amount: 1,
                  })
                "
              >
                {{ t('meleeDamage.tool.modifier.add') }}
              </CdxButton>
            </template>

            <template #item-attribute="{ item, row }">
              <CdxSelect
                :selected="item"
                :menu-items="[
                  {
                    value: 'generic.attack_damage',
                    label: t('meleeDamage.tool.modifier.attribute.damage'),
                  },
                  {
                    value: 'generic.attack_speed',
                    label: t('meleeDamage.tool.modifier.attribute.speed'),
                  },
                ]"
                @update:selected="(value: string) => (row.attribute = value)"
              />
            </template>

            <template #item-operation="{ item, row }">
              <CdxSelect
                :selected="item"
                :menu-items="[
                  {
                    value: 'add_value',
                    label: t('meleeDamage.tool.modifier.operation.add'),
                  },
                  {
                    value: 'add_multiplied_base',
                    label: t('meleeDamage.tool.modifier.operation.multipliedBase'),
                  },
                  {
                    value: 'add_multiplied_total',
                    label: t('meleeDamage.tool.modifier.operation.multipliedTotal'),
                  },
                ]"
                @update:selected="(value: string) => (row.operation = value)"
              />
            </template>

            <template #item-amount="{ item, row }">
              <CdxTextInput
                :model-value="item"
                class="min-w-32"
                input-type="number"
                step="0.5"
                @update:model-value="
                  (value: any) => {
                    row.amount = parseFloat(value)
                    if (Number.isNaN(row.amount)) row.amount = 0
                  }
                "
              />
            </template>

            <template #item-action="{ row }">
              <CdxButton
                weight="quiet"
                action="destructive"
                :aria-label="t('meleeDamage.tool.modifier.remove')"
                @click="
                  () =>
                    attributeModifiers.splice(
                      attributeModifiers.findIndex((m) => m.uniqueID === row.uniqueID),
                      1,
                    )
                "
              >
                <CdxIcon :icon="cdxIconTrash" />
              </CdxButton>
            </template>
          </CdxTable>
          <div class="flex flex-row flex-wrap gap-4">
            <CdxField
              v-if="
                checkEnchantment(
                  false,
                  () => true,
                  () => smiteLevel === 0 && baneOfArthropodsLevel === 0,
                )
              "
              class="mt-0"
            >
              <template #label>
                <span v-html="parseWikitext(t('meleeDamage.tool.sharpnessLevel'))" />
              </template>

              <CdxTextInput
                id="sharpness-level-input"
                v-model="sharpnessLevel"
                class="w-20 min-w-20 font-mono"
                input-type="number"
                min="0"
                :max="canObtainInSurvival ? 5 : 255"
                step="1"
              />
            </CdxField>

            <CdxField
              v-if="
                checkEnchantment(
                  true,
                  () => true,
                  () => sharpnessLevel === 0 && baneOfArthropodsLevel === 0 && densityLevel === 0,
                )
              "
              class="mt-0"
            >
              <template #label>
                <span v-html="parseWikitext(t('meleeDamage.tool.smiteLevel'))" />
              </template>

              <CdxTextInput
                id="smite-level-input"
                v-model="smiteLevel"
                class="w-20 min-w-20 font-mono"
                input-type="number"
                min="0"
                :max="canObtainInSurvival ? 5 : 255"
                step="1"
              />
            </CdxField>
            <CdxField
              v-if="
                checkEnchantment(
                  true,
                  () => true,
                  () => smiteLevel === 0 && sharpnessLevel === 0 && densityLevel === 0,
                )
              "
              class="mt-0"
            >
              <template #label>
                <span v-html="parseWikitext(t('meleeDamage.tool.baneOfArthropodsLevel'))" />
              </template>

              <CdxTextInput
                id="bane-of-arthropods-level-input"
                v-model="baneOfArthropodsLevel"
                class="w-20 min-w-20 font-mono"
                input-type="number"
                min="0"
                :max="canObtainInSurvival ? 5 : 255"
                step="1"
              />
            </CdxField>

            <CdxField v-if="(isTridentItem || !canObtainInSurvival) && !isHand" class="mt-0">
              <template #label>
                <span v-html="parseWikitext(t('meleeDamage.tool.impalingLevel'))" />
              </template>

              <CdxTextInput
                id="impaling-level-input"
                v-model="impalingLevel"
                class="w-20 min-w-20 font-mono"
                input-type="number"
                min="0"
                :max="canObtainInSurvival ? 5 : 255"
                step="1"
              />
            </CdxField>

            <CdxField
              v-if="
                checkEnchantment(
                  true,
                  () => isMaceItem,
                  () => smiteLevel === 0 && baneOfArthropodsLevel === 0,
                )
              "
              class="mt-0"
            >
              <template #label>
                <span v-html="parseWikitext(t('meleeDamage.tool.densityLevel'))" />
              </template>

              <CdxTextInput
                id="density-level-input"
                v-model="densityLevel"
                class="w-20 min-w-20 font-mono"
                input-type="number"
                min="0"
                :max="canObtainInSurvival ? 5 : 255"
                step="1"
              />
            </CdxField>
          </div>
        </div>
      </CalcField>
      <CalcField>
        <!-- Victim state panel -->
        <template #heading>
          {{ t('meleeDamage.victim.title') }}
        </template>
        <div class="flex flex-col gap-2 mt-2">
          <CdxCheckbox id="is-undead-checkbox" v-model="isUndead">
            {{ t('meleeDamage.victim.isUndead') }}
          </CdxCheckbox>
          <CdxCheckbox id="is-arthropod-checkbox" v-model="isArthropod">
            {{ t('meleeDamage.victim.isArthropod') }}
          </CdxCheckbox>
          <CdxCheckbox id="is-water-mob-checkbox" v-model="isWaterMob">
            {{
              isJavaEdition ? t('meleeDamage.victim.isWaterMob') : t('meleeDamage.victim.isInWater')
            }}
          </CdxCheckbox>
        </div>
      </CalcField>
    </div>

    <div class="mt-2 font-bold">
      <I18nT keypath="meleeDamage.finalDamage">
        <template #damage>
          <output id="output" class="text-lg font-mono" @click="selectOutput">{{
            totalAttackDamage.toFixed(2)
          }}</output>
        </template>
      </I18nT>
    </div>
  </CalcField>
</template>
