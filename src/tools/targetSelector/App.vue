<script setup lang="ts">
import CalcField from '@/components/CalcField.vue'
import { entityFamilies } from '@/tools/targetSelector/data/entity_families.ts'
import { javaEntityTypes } from '@/tools/targetSelector/data/entity_types_java.ts'
import { bedrockEntityTypes } from '@/tools/targetSelector/data/entity_types_bedrock.ts'
import { permissions } from '@/tools/targetSelector/data/permissions.ts'
import { parseWikitext } from '@/utils/i18n'
import { copyToClipboard } from '@/utils/iframe.ts'
import { wikiImg } from '@/utils/image.ts'
import {
  CdxButton,
  CdxCheckbox,
  CdxField,
  CdxLookup,
  CdxMultiselectLookup,
  CdxSelect,
  CdxTab,
  CdxTabs,
  CdxTextInput,
  CdxToggleSwitch,
  type ChipInputItem,
  type MenuItemData,
  type MenuItemValue,
} from '@wikimedia/codex'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface RangeParam {
  min?: number
  max?: number
  jeName: string
  beMinName: string
  beMaxName: string
}

const edition = ref<'java' | 'bedrock'>('java')

const type = ref<'@s' | '@p' | '@r' | '@a' | '@n' | '@e' | '@initiator'>('@s')
const limit = ref()
const sort = ref('')
const posX = ref()
const posY = ref()
const posZ = ref()
const distance = ref<RangeParam>({ jeName: 'distance', beMinName: 'rm', beMaxName: 'r' })
const dx = ref()
const dy = ref()
const dz = ref()
const xRotation = ref<RangeParam>({ jeName: 'x_rotation', beMinName: 'rxm', beMaxName: 'rx' })
const yRotation = ref<RangeParam>({ jeName: 'y_rotation', beMinName: 'rym', beMaxName: 'ry' })
const entityType = ref('')
const entityTypeChips = ref<ChipInputItem[]>([])
const entityTypeItems = ref<MenuItemData[]>(getEntityTypes())
const entityTypeInputValue = ref('')
const entityTypeNegated = ref<boolean>(false)
const entityName = ref('')
const entityNameNegated = ref<boolean>(false)
const entityFamily = ref('')
const entityFamilyNegated = ref<boolean>(false)
const predicate = ref('')
const predicateNegated = ref<boolean>(false)
const nbt = ref('')
const nbtNegated = ref<boolean>(false)
const hasitem = ref('')
const scores = ref('')
const tag = ref('')
const tagNegated = ref<boolean>(false)
const team = ref('')
const teamNegated = ref<boolean>(false)
const level = ref<RangeParam>({ jeName: 'level', beMinName: 'lm', beMaxName: 'l' })
const gameMode = ref('')
const gameModeNegated = ref<boolean>(false)
const advancements = ref('')
const haspermissionChips = ref<ChipInputItem[]>([])
const haspermissionItems = ref<MenuItemValue[]>([])
const haspermission = ref<{ [key: string]: boolean }>({})

const isPlayer = () => {
  return (
    ['@p', '@r', '@a', '@initiator'].includes(type.value) ||
    !entityType.value ||
    entityType.value === 'minecraft:player'
  )
}

const isNotPlayer = () => {
  return ['@s', '@n', '@e'].includes(type.value)
}

function getTargetTypes() {
  const items = [
    { label: t('targetSelector.type.s'), value: '@s' },
    { label: t('targetSelector.type.p'), value: '@p' },
    { label: t('targetSelector.type.r'), value: '@r' },
    { label: t('targetSelector.type.a'), value: '@a' },
    { label: t('targetSelector.type.n'), value: '@n' },
    { label: t('targetSelector.type.e'), value: '@e' },
    { label: t('targetSelector.type.initiator'), value: '@initiator' },
  ]
  if (edition.value === 'bedrock') {
    return items.filter((item) => item.value !== '@n')
  }
  return items.filter((item) => item.value !== '@initiator')
}

function getEntityTypes() {
  const entityTypes = edition.value === 'java' ? javaEntityTypes : bedrockEntityTypes
  const items = [
    {
      label: t('targetSelector.none'),
      value: '',
      thumbnail: { url: wikiImg('BlockSprite_barrier') },
    },
  ]
  Object.entries(entityTypes).map(([name, image]) =>
    items.push({
      label: name, // t("entity." + name),
      value: `minecraft:${name}`,
      thumbnail: {
        url: wikiImg(image),
      },
    }),
  )
  return items
}

function getEntityFamilies() {
  const items = [
    {
      label: t('targetSelector.none'),
      value: '',
    },
  ]
  entityFamilies.map((name) =>
    items.push({
      label: name,
      value: name,
    }),
  )
  return items
}

function getGameModes() {
  return [
    {
      label: t('targetSelector.none'),
      value: '',
      thumbnail: { url: wikiImg('BlockSprite_barrier') },
    },
    {
      label: t('targetSelector.gamemode.survival'),
      value: 'survival',
      thumbnail: { url: wikiImg('EnvSprite_survival') },
    },
    {
      label: t('targetSelector.gamemode.creative'),
      value: 'creative',
      thumbnail: { url: wikiImg('EnvSprite_creative') },
    },
    {
      label: t('targetSelector.gamemode.adventure'),
      value: 'adventure',
      thumbnail: { url: wikiImg('EnvSprite_adventure') },
    },
    {
      label: t('targetSelector.gamemode.spectator'),
      value: 'spectator',
      thumbnail: { url: wikiImg('EnvSprite_spectator') },
    },
  ]
}

function toQuotedStringParam(str: string) {
  if (str.includes(' ') || str.includes(',') || str.includes('=')) {
    return `"${str}"`
  }
  return str
}

function addRangeParam(range: RangeParam, params: string[]) {
  const min = range.min || ''
  const max = range.max || ''

  if (edition.value === 'java') {
    const finalValue = min === max ? min : `${min}..${max}`
    params.push(`${range.jeName}=${finalValue}`)
  } else {
    if (min) params.push(`${range.beMinName}=${min}`)
    if (max) params.push(`${range.beMaxName}=${max}`)
  }
}

const finalSelector = computed(() => {
  let finalSelector = type.value

  const params: string[] = []

  if (limit.value) {
    const key = edition.value === 'java' ? 'limit' : 'c'
    params.push(`${key}=${limit.value}`)
  }

  if (edition.value === 'java' && sort.value) {
    params.push(`sort=${sort.value}`)
  }

  if (posX.value || posX.value === 0) {
    params.push(`x=${posX.value}`)
  }

  if (posY.value || posY.value === 0) {
    params.push(`y=${posY.value}`)
  }

  if (posZ.value || posZ.value === 0) {
    params.push(`z=${posZ.value}`)
  }

  if (dx.value || dx.value === 0) {
    params.push(`dx=${dx.value}`)
  }

  if (dy.value || dy.value === 0) {
    params.push(`dy=${dy.value}`)
  }

  if (dz.value || dz.value === 0) {
    params.push(`dz=${dz.value}`)
  }

  if (distance.value.min || distance.value.max) {
    addRangeParam(distance.value, params)
  }

  if (xRotation.value.min || xRotation.value.max) {
    addRangeParam(xRotation.value, params)
  }

  if (yRotation.value.min || yRotation.value.max) {
    addRangeParam(yRotation.value, params)
  }

  if (isNotPlayer() && (entityType.value || entityTypeInputValue.value)) {
    const comparison = entityTypeNegated.value ? '=!' : '='
    const value = entityType.value ?? entityTypeInputValue.value
    params.push(`type${comparison}${value}`)
  }

  if (entityName.value) {
    const comparison = entityNameNegated.value ? '=!' : '='
    params.push(`name${comparison}${toQuotedStringParam(entityName.value)}`)
  }

  if (edition.value === 'bedrock' && entityFamily.value) {
    const comparison = entityFamilyNegated.value ? '=!' : '='
    params.push(`family${comparison}${entityFamily.value}`)
  }

  if (edition.value === 'java' && predicate.value) {
    const comparison = predicateNegated.value ? '=!' : '='
    params.push(`predicate${comparison}${predicate.value}`)
  }

  if (edition.value === 'java' && nbt.value) {
    const comparison = nbtNegated.value ? '=!' : '='
    params.push(`nbt${comparison}${nbt.value}`)
  }

  if (edition.value === 'bedrock' && hasitem.value) {
    params.push(`hasitem=${hasitem.value}`)
  }

  if (scores.value) {
    params.push(`scores=${scores.value}`)
  }

  if (tag.value) {
    const comparison = tagNegated.value ? '=!' : '='
    params.push(`tag${comparison}${tag.value}`)
  }

  if (edition.value === 'java' && team.value) {
    const comparison = teamNegated.value ? '=!' : '='
    params.push(`team${comparison}${toQuotedStringParam(team.value)}`)
  }

  if (isPlayer()) {
    if (level.value.min || level.value.max) {
      addRangeParam(level.value, params)
    }

    if (gameMode.value) {
      const key = edition.value === 'java' ? 'gamemode' : 'm'
      const comparison = gameModeNegated.value ? '=!' : '='
      params.push(`${key}${comparison}${gameMode.value}`)
    }

    if (edition.value === 'java' && advancements.value) {
      params.push(`advancements=${advancements.value}`)
    }

    if (edition.value === 'bedrock' && haspermissionItems.value.length > 0) {
      let permStr = '{'
      haspermissionItems.value.forEach((perm, index) => {
        const status = haspermission.value[perm] ? 'enabled' : 'disabled'
        permStr += `${perm}=${status}`
        if (index !== haspermissionItems.value.length - 1) permStr += ','
      })
      permStr += '}'
      params.push(`haspermission=${permStr}`)
    }
  }

  if (params.length > 0) {
    finalSelector += '['
    params.forEach((param, index) => {
      finalSelector += param
      if (index !== params.length - 1) finalSelector += ','
    })
    finalSelector += ']'
  }

  return finalSelector
})

function onEditionChange(edition: 'java' | 'bedrock') {
  if (edition === 'bedrock') {
    if (type.value === '@n') type.value = '@s'
  } else {
    if (type.value === '@initiator') type.value = '@s'
  }

  entityTypeItems.value = getEntityTypes()
  if (!entityTypeItems.value.map(element => element.value).includes(entityType.value)) {
    entityType.value = ""
  }
}

const copyText = ref(t('targetSelector.copy'))

async function copySelector() {
  copyToClipboard(finalSelector.value!)

  copyText.value = t('targetSelector.copied')
  setTimeout(() => {
    copyText.value = t('targetSelector.copy')
  }, 1000)
}
</script>

<template>
  <CalcField>
    <template #heading>
      {{ t('targetSelector.title') }}
    </template>

    <CdxTabs v-model:active="edition" @update:active="onEditionChange">
      <CdxTab name="java" :label="t('targetSelector.java')" />
      <CdxTab name="bedrock" :label="t('targetSelector.bedrock')" />
    </CdxTabs>

    <!-- Base selection -->
    <div class="flex flex-row flex-wrap gap-x-6 items-baseline mt-4">
      <CdxField>
        <template #label>{{ t('targetSelector.type') }}</template>
        <CdxSelect v-model:selected="type" :menu-items="getTargetTypes()" />
      </CdxField>

      <CdxField>
        <template #label>{{ t('targetSelector.limit') }}</template>
        <CdxTextInput v-model="limit" input-type="number" min="1" />
      </CdxField>

      <CdxField v-if="edition === 'java'">
        <template #label>{{ t('targetSelector.sort') }}</template>
        <CdxSelect
          v-model:selected="sort"
          :menu-items="[
            { label: t('targetSelector.sort.default'), value: '' },
            { label: t('targetSelector.sort.nearest'), value: 'nearest' },
            { label: t('targetSelector.sort.furthest'), value: 'furthest' },
            { label: t('targetSelector.sort.random'), value: 'random' },
            { label: t('targetSelector.sort.arbitrary'), value: 'arbitrary' },
          ]"
        />
      </CdxField>
    </div>

    <!-- Position -->
    <div class="flex flex-row flex-wrap gap-x-12 mt-4">
      <CdxField>
        <template #label>{{ t('targetSelector.pos') }}</template>
        <div class="flex flex-row gap-2">
          <p>{{ t('targetSelector.pos.x') }}</p>
          <CdxTextInput v-model="posX" class="min-w-24" input-type="number" />
          <p>{{ t('targetSelector.pos.y') }}</p>
          <CdxTextInput v-model="posY" class="min-w-24" input-type="number" />
          <p>{{ t('targetSelector.pos.z') }}</p>
          <CdxTextInput v-model="posZ" class="min-w-24" input-type="number" />
        </div>
      </CdxField>
    </div>

    <!-- Distance -->
    <div class="flex flex-row flex-wrap gap-x-12 mt-4">
      <CdxField>
        <template #label>{{ t('targetSelector.distance') }}</template>
        <div class="flex flex-row gap-2">
          <p>{{ t('targetSelector.min') }}</p>
          <CdxTextInput
            v-model="distance.min"
            class="min-w-24"
            input-type="number"
            min="0"
            :max="distance.max"
          />
          <p>{{ t('targetSelector.max') }}</p>
          <CdxTextInput
            v-model="distance.max"
            class="min-w-24"
            input-type="number"
            :min="distance.min"
          />
        </div>
      </CdxField>

      <CdxField>
        <template #label>{{ t('targetSelector.volume') }}</template>
        <div class="flex flex-row gap-2">
          <p>{{ t('targetSelector.dx') }}</p>
          <CdxTextInput v-model="dx" class="min-w-24" input-type="number" />
          <p>{{ t('targetSelector.dy') }}</p>
          <CdxTextInput v-model="dy" class="min-w-24" input-type="number" />
          <p>{{ t('targetSelector.dz') }}</p>
          <CdxTextInput v-model="dz" class="min-w-24" input-type="number" />
        </div>
      </CdxField>
    </div>

    <!-- Rotation -->
    <div class="flex flex-row flex-wrap gap-x-12 mt-4">
      <CdxField>
        <template #label>{{ t('targetSelector.x_rotation') }}</template>
        <div class="flex flex-row gap-2">
          <p>{{ t('targetSelector.min') }}</p>
          <CdxTextInput
            v-model="xRotation.min"
            class="min-w-24"
            input-type="number"
            min="-90"
            :max="xRotation.max"
          />
          <p>{{ t('targetSelector.max') }}</p>
          <CdxTextInput
            v-model="xRotation.max"
            class="min-w-24"
            input-type="number"
            :min="xRotation.min"
            max="90"
          />
        </div>
      </CdxField>

      <CdxField>
        <template #label>{{ t('targetSelector.y_rotation') }}</template>
        <div class="flex flex-row gap-2">
          <p>{{ t('targetSelector.min') }}</p>
          <CdxTextInput
            v-model="yRotation.min"
            class="min-w-24"
            input-type="number"
            min="-180"
            :max="yRotation.max"
          />
          <p>{{ t('targetSelector.max') }}</p>
          <CdxTextInput
            v-model="yRotation.max"
            class="min-w-24"
            input-type="number"
            :min="yRotation.min"
            max="180"
          />
        </div>
      </CdxField>
    </div>

    <!-- Entity info -->
    <div class="flex flex-row flex-wrap gap-x-6 mt-4">
      <CdxField v-if="isNotPlayer()">
        <template #label>{{ t('targetSelector.entityType') }}</template>
        <CdxLookup 
		      v-model:input-chips="entityTypeChips"
		      v-model:selected="entityType"
		      v-model:input-value="entityTypeInputValue"
		      :menu-items="entityTypeItems"
          :menu-config="{ visibleItemLimit: 5 }"
          @input="
            (value:string) =>
              entityTypeItems = getEntityTypes().filter( ( item ) => t(item.label).includes( value ) || item.value.includes( value ))
            ">

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
        </CdxLookup>
        <CdxCheckbox v-model="entityTypeNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>

      <CdxField>
        <template #label>{{ t('targetSelector.name') }}</template>
        <CdxTextInput v-model="entityName" input-type="text" />
        <CdxCheckbox v-model="entityNameNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>

      <CdxField v-if="edition === 'bedrock'">
        <template #label><span v-html="parseWikitext(t('targetSelector.family'))" /></template>
        <CdxSelect v-model:selected="entityFamily" :menu-items="getEntityFamilies()" />
        <CdxCheckbox v-model="entityFamilyNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>
    </div>

    <!-- Entity data -->
    <div class="flex flex-row flex-wrap gap-x-6 mt-4">
      <CdxField v-if="edition === 'java'">
        <template #label><span v-html="parseWikitext(t('targetSelector.predicate'))" /></template>
        <CdxTextInput v-model="predicate" input-type="text" />
        <CdxCheckbox v-model="predicateNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>

      <CdxField v-if="edition === 'java'">
        <template #label><span v-html="parseWikitext(t('targetSelector.nbt'))" /></template>
        <CdxTextInput v-model="nbt" input-type="text" />
        <CdxCheckbox v-model="nbtNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>

      <CdxField v-if="edition === 'bedrock'">
        <template #label>{{ t('targetSelector.hasitem') }}</template>
        <CdxTextInput v-model="hasitem" input-type="text" />
      </CdxField>
    </div>

    <!-- Scoreboard-related -->
    <div class="flex flex-row flex-wrap gap-x-6 mt-4">
      <CdxField>
        <template #label>{{ t('targetSelector.scores') }}</template>
        <CdxTextInput v-model="scores" input-type="text" />
      </CdxField>

      <CdxField style="max-width: min-content">
        <template #label>{{ t('targetSelector.tag') }}</template>
        <CdxTextInput v-model="tag" input-type="text" />
        <CdxCheckbox v-model="tagNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>

      <CdxField v-if="edition === 'java'">
        <template #label>{{ t('targetSelector.team') }}</template>
        <CdxTextInput v-model="team" input-type="text" />
        <CdxCheckbox v-model="teamNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>
    </div>

    <!-- Player-specific -->
    <div v-if="isPlayer()" class="flex flex-row flex-wrap gap-x-6 mt-4">
      <CdxField>
        <template #label>{{ t('targetSelector.level') }}</template>
        <div class="flex flex-row gap-4">
          <p>{{ t('targetSelector.min') }}</p>
          <CdxTextInput
            v-model="level.min"
            class="min-w-24"
            input-type="number"
            min="0"
            :max="level.max"
          />
          <p>{{ t('targetSelector.max') }}</p>
          <CdxTextInput v-model="level.max" class="min-w-24" input-type="number" :min="level.min" />
        </div>
      </CdxField>

      <CdxField>
        <template #label>{{ t('targetSelector.gamemode') }}</template>
        <CdxSelect v-model:selected="gameMode" :menu-items="getGameModes()">
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
        <CdxCheckbox v-model="gameModeNegated" class="mt-2">
          {{ t('targetSelector.negated') }}
        </CdxCheckbox>
      </CdxField>

      <CdxField v-if="edition === 'java'">
        <template #label>{{ t('targetSelector.advancements') }}</template>
        <CdxTextInput v-model="advancements" input-type="text" />
      </CdxField>

      <CdxField v-if="edition === 'bedrock'" style="max-width: 256px">
        <template #label>{{ t('targetSelector.haspermission') }}</template>
        <CdxMultiselectLookup
          v-model:input-chips="haspermissionChips"
          v-model:selected="haspermissionItems"
          :menu-items="
            permissions.map((perm) => {
              return { label: perm, value: perm }
            })
          "
          :menu-config="{ visibleItemLimit: 5 }"
          @update:selected="
            (sel: string[]) => {
              sel.forEach((item) => {
                if (!(item in haspermission)) {
                  haspermission[item] = true
                }
              })
            }
          "
        />
        <div v-for="perm in haspermissionItems" :key="perm">
          <CdxToggleSwitch v-model="haspermission[perm]" class="mt-2" :align-switch="true">
            {{ perm }}
          </CdxToggleSwitch>
        </div>
      </CdxField>
    </div>

    <CdxField>
      <template #label>{{ t('targetSelector.selector') }}</template>
      <div class="grid grid-cols-[1fr_auto] gap-x-6">
        <CdxTextInput v-model="finalSelector" input-type="text" :disabled="true" />
        <CdxButton @click="copySelector()">
          {{ copyText }}
        </CdxButton>
      </div>
    </CdxField>
  </CalcField>
</template>
