import type { Je26_3ArchetypeId } from './archetypes'

/** Source location in the locally extracted JE 26.3 vanilla item-tag data. */
export interface ExtractedItemTagSource {
  readonly tagId: string
  readonly sourcePath: string
  readonly lineStart: number
  readonly lineEnd: number
}

export interface Je26_3ArchetypeMembershipGroup {
  readonly archetypeId: Je26_3ArchetypeId
  readonly rootTag: ExtractedItemTagSource
  readonly itemIds: readonly string[]
}

export interface Je26_3BlockMembershipEntry {
  readonly itemId: string
  /** Candidate ids remain an array because data packs can introduce overlaps. */
  readonly orderedCandidateIds: readonly Je26_3ArchetypeId[]
  readonly rootTagIds: readonly string[]
}

/**
 * Every recursively visited tag that contributes to the vanilla JE 26.3
 * sulfur-cube archetype membership expansion.
 */
export const je26_3RecursiveItemTagSources: readonly ExtractedItemTagSource[] = [
  {
    tagId: 'minecraft:acacia_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/acacia_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:bamboo_blocks',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/bamboo_blocks.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:birch_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/birch_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:cherry_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/cherry_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:coal_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/coal_ores.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:concrete',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/concrete.json',
    lineStart: 1,
    lineEnd: 19,
  },
  {
    tagId: 'minecraft:concrete_powders',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/concrete_powders.json',
    lineStart: 1,
    lineEnd: 19,
  },
  {
    tagId: 'minecraft:copper_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/copper_ores.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:crimson_stems',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/crimson_stems.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:dark_oak_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/dark_oak_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:diamond_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/diamond_ores.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:emerald_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/emerald_ores.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:glazed_terracotta',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/glazed_terracotta.json',
    lineStart: 1,
    lineEnd: 19,
  },
  {
    tagId: 'minecraft:gold_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/gold_ores.json',
    lineStart: 1,
    lineEnd: 6,
  },
  {
    tagId: 'minecraft:iron_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/iron_ores.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:jungle_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/jungle_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:lapis_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/lapis_ores.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/logs.json',
    lineStart: 1,
    lineEnd: 6,
  },
  {
    tagId: 'minecraft:logs_that_burn',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/logs_that_burn.json',
    lineStart: 1,
    lineEnd: 13,
  },
  {
    tagId: 'minecraft:mangrove_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/mangrove_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:moss_blocks',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/moss_blocks.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:oak_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/oak_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:pale_oak_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/pale_oak_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:planks',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/planks.json',
    lineStart: 1,
    lineEnd: 16,
  },
  {
    tagId: 'minecraft:poplar_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/poplar_logs.json',
    lineStart: 1,
    lineEnd: 8,
  },
  {
    tagId: 'minecraft:redstone_ores',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/redstone_ores.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:spruce_logs',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/spruce_logs.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/bouncy',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/bouncy.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/explosive',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/explosive.json',
    lineStart: 1,
    lineEnd: 4,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/fast_flat',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/fast_flat.json',
    lineStart: 1,
    lineEnd: 28,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/fast_sliding',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/fast_sliding.json',
    lineStart: 1,
    lineEnd: 6,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/high_resistance',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/high_resistance.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/hot',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/hot.json',
    lineStart: 1,
    lineEnd: 4,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/light',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/light.json',
    lineStart: 1,
    lineEnd: 4,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/regular',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/regular.json',
    lineStart: 1,
    lineEnd: 15,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/slow_bouncy',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/slow_bouncy.json',
    lineStart: 1,
    lineEnd: 97,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/slow_flat',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/slow_flat.json',
    lineStart: 1,
    lineEnd: 45,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/slow_sliding',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/slow_sliding.json',
    lineStart: 1,
    lineEnd: 9,
  },
  {
    tagId: 'minecraft:sulfur_cube_archetype/sticky',
    sourcePath:
      'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/sticky.json',
    lineStart: 1,
    lineEnd: 4,
  },
  {
    tagId: 'minecraft:sulfur_cube_swallowable',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_swallowable.json',
    lineStart: 1,
    lineEnd: 15,
  },
  {
    tagId: 'minecraft:terracotta',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/terracotta.json',
    lineStart: 1,
    lineEnd: 20,
  },
  {
    tagId: 'minecraft:warped_stems',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/warped_stems.json',
    lineStart: 1,
    lineEnd: 7,
  },
  {
    tagId: 'minecraft:wart_blocks',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/wart_blocks.json',
    lineStart: 1,
    lineEnd: 5,
  },
  {
    tagId: 'minecraft:wool',
    sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/wool.json',
    lineStart: 1,
    lineEnd: 19,
  },
]

export const je26_3SwallowableTagSource: ExtractedItemTagSource = {
  tagId: 'minecraft:sulfur_cube_swallowable',
  sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_swallowable.json',
  lineStart: 1,
  lineEnd: 15,
}

/**
 * Vanilla membership grouped by archetype registry order. The arrays are an
 * audited expansion of the recursive item tags, not a hand-curated block list.
 * Membership is keyed by the absorbed BlockItem identity; block state is not
 * part of this lookup.
 */
export const je26_3BlockMembershipGroups: readonly Je26_3ArchetypeMembershipGroup[] = [
  {
    archetypeId: 'minecraft:bouncy',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/bouncy',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/bouncy.json',
      lineStart: 1,
      lineEnd: 7,
    },
    itemIds: [
      'minecraft:oak_planks',
      'minecraft:spruce_planks',
      'minecraft:birch_planks',
      'minecraft:jungle_planks',
      'minecraft:acacia_planks',
      'minecraft:dark_oak_planks',
      'minecraft:pale_oak_planks',
      'minecraft:crimson_planks',
      'minecraft:warped_planks',
      'minecraft:mangrove_planks',
      'minecraft:bamboo_planks',
      'minecraft:cherry_planks',
      'minecraft:poplar_planks',
      'minecraft:bamboo_mosaic',
      'minecraft:dark_oak_log',
      'minecraft:dark_oak_wood',
      'minecraft:stripped_dark_oak_log',
      'minecraft:stripped_dark_oak_wood',
      'minecraft:pale_oak_log',
      'minecraft:pale_oak_wood',
      'minecraft:stripped_pale_oak_log',
      'minecraft:stripped_pale_oak_wood',
      'minecraft:oak_log',
      'minecraft:oak_wood',
      'minecraft:stripped_oak_log',
      'minecraft:stripped_oak_wood',
      'minecraft:acacia_log',
      'minecraft:acacia_wood',
      'minecraft:stripped_acacia_log',
      'minecraft:stripped_acacia_wood',
      'minecraft:birch_log',
      'minecraft:birch_wood',
      'minecraft:stripped_birch_log',
      'minecraft:stripped_birch_wood',
      'minecraft:jungle_log',
      'minecraft:jungle_wood',
      'minecraft:stripped_jungle_log',
      'minecraft:stripped_jungle_wood',
      'minecraft:spruce_log',
      'minecraft:spruce_wood',
      'minecraft:stripped_spruce_log',
      'minecraft:stripped_spruce_wood',
      'minecraft:mangrove_log',
      'minecraft:mangrove_wood',
      'minecraft:stripped_mangrove_log',
      'minecraft:stripped_mangrove_wood',
      'minecraft:cherry_log',
      'minecraft:cherry_wood',
      'minecraft:stripped_cherry_log',
      'minecraft:stripped_cherry_wood',
      'minecraft:poplar_log',
      'minecraft:poplar_wood',
      'minecraft:stripped_poplar_log',
      'minecraft:stripped_poplar_wood',
      'minecraft:crimson_stem',
      'minecraft:stripped_crimson_stem',
      'minecraft:crimson_hyphae',
      'minecraft:stripped_crimson_hyphae',
      'minecraft:warped_stem',
      'minecraft:stripped_warped_stem',
      'minecraft:warped_hyphae',
      'minecraft:stripped_warped_hyphae',
      'minecraft:bamboo_block',
      'minecraft:stripped_bamboo_block',
    ],
  },
  {
    archetypeId: 'minecraft:explosive',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/explosive',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/explosive.json',
      lineStart: 1,
      lineEnd: 4,
    },
    itemIds: ['minecraft:tnt'],
  },
  {
    archetypeId: 'minecraft:fast_flat',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/fast_flat',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/fast_flat.json',
      lineStart: 1,
      lineEnd: 28,
    },
    itemIds: [
      'minecraft:tube_coral_block',
      'minecraft:brain_coral_block',
      'minecraft:bubble_coral_block',
      'minecraft:fire_coral_block',
      'minecraft:horn_coral_block',
      'minecraft:dead_tube_coral_block',
      'minecraft:dead_brain_coral_block',
      'minecraft:dead_bubble_coral_block',
      'minecraft:dead_fire_coral_block',
      'minecraft:dead_horn_coral_block',
      'minecraft:sponge',
      'minecraft:wet_sponge',
      'minecraft:dried_kelp_block',
      'minecraft:moss_block',
      'minecraft:pale_moss_block',
      'minecraft:resin_block',
      'minecraft:resin_bricks',
      'minecraft:chiseled_resin_bricks',
      'minecraft:melon',
      'minecraft:hay_block',
      'minecraft:pumpkin',
      'minecraft:carved_pumpkin',
      'minecraft:jack_o_lantern',
      'minecraft:ochre_froglight',
      'minecraft:pearlescent_froglight',
      'minecraft:verdant_froglight',
    ],
  },
  {
    archetypeId: 'minecraft:fast_sliding',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/fast_sliding',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/fast_sliding.json',
      lineStart: 1,
      lineEnd: 6,
    },
    itemIds: ['minecraft:blue_ice', 'minecraft:packed_ice', 'minecraft:snow_block'],
  },
  {
    archetypeId: 'minecraft:high_resistance',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/high_resistance',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/high_resistance.json',
      lineStart: 1,
      lineEnd: 5,
    },
    itemIds: ['minecraft:soul_sand', 'minecraft:soul_soil'],
  },
  {
    archetypeId: 'minecraft:hot',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/hot',
      sourcePath: 'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/hot.json',
      lineStart: 1,
      lineEnd: 4,
    },
    itemIds: ['minecraft:magma_block'],
  },
  {
    archetypeId: 'minecraft:light',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/light',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/light.json',
      lineStart: 1,
      lineEnd: 4,
    },
    itemIds: [
      'minecraft:white_wool',
      'minecraft:orange_wool',
      'minecraft:magenta_wool',
      'minecraft:light_blue_wool',
      'minecraft:yellow_wool',
      'minecraft:lime_wool',
      'minecraft:pink_wool',
      'minecraft:gray_wool',
      'minecraft:light_gray_wool',
      'minecraft:cyan_wool',
      'minecraft:purple_wool',
      'minecraft:blue_wool',
      'minecraft:brown_wool',
      'minecraft:green_wool',
      'minecraft:red_wool',
      'minecraft:black_wool',
    ],
  },
  {
    archetypeId: 'minecraft:regular',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/regular',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/regular.json',
      lineStart: 1,
      lineEnd: 15,
    },
    itemIds: [
      'minecraft:white_concrete_powder',
      'minecraft:orange_concrete_powder',
      'minecraft:magenta_concrete_powder',
      'minecraft:light_blue_concrete_powder',
      'minecraft:yellow_concrete_powder',
      'minecraft:lime_concrete_powder',
      'minecraft:pink_concrete_powder',
      'minecraft:gray_concrete_powder',
      'minecraft:light_gray_concrete_powder',
      'minecraft:cyan_concrete_powder',
      'minecraft:purple_concrete_powder',
      'minecraft:blue_concrete_powder',
      'minecraft:brown_concrete_powder',
      'minecraft:green_concrete_powder',
      'minecraft:red_concrete_powder',
      'minecraft:black_concrete_powder',
      'minecraft:mud',
      'minecraft:muddy_mangrove_roots',
      'minecraft:packed_mud',
      'minecraft:coal_block',
      'minecraft:dirt',
      'minecraft:coarse_dirt',
      'minecraft:rooted_dirt',
      'minecraft:podzol',
      'minecraft:grass_block',
      'minecraft:clay',
      'minecraft:bone_block',
    ],
  },
  {
    archetypeId: 'minecraft:slow_bouncy',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/slow_bouncy',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/slow_bouncy.json',
      lineStart: 1,
      lineEnd: 97,
    },
    itemIds: [
      'minecraft:amethyst_block',
      'minecraft:andesite',
      'minecraft:basalt',
      'minecraft:blackstone',
      'minecraft:bricks',
      'minecraft:calcite',
      'minecraft:chiseled_cinnabar',
      'minecraft:chiseled_deepslate',
      'minecraft:chiseled_nether_bricks',
      'minecraft:chiseled_polished_blackstone',
      'minecraft:chiseled_quartz_block',
      'minecraft:chiseled_red_sandstone',
      'minecraft:chiseled_sandstone',
      'minecraft:chiseled_stone_bricks',
      'minecraft:chiseled_sulfur',
      'minecraft:chiseled_tuff',
      'minecraft:chiseled_tuff_bricks',
      'minecraft:cinnabar',
      'minecraft:cinnabar_bricks',
      'minecraft:cobbled_deepslate',
      'minecraft:cobblestone',
      'minecraft:cracked_deepslate_bricks',
      'minecraft:cracked_deepslate_tiles',
      'minecraft:cracked_nether_bricks',
      'minecraft:cracked_polished_blackstone_bricks',
      'minecraft:cracked_stone_bricks',
      'minecraft:crimson_nylium',
      'minecraft:crying_obsidian',
      'minecraft:cut_red_sandstone',
      'minecraft:cut_sandstone',
      'minecraft:dark_prismarine',
      'minecraft:deepslate',
      'minecraft:deepslate_bricks',
      'minecraft:deepslate_tiles',
      'minecraft:diamond_block',
      'minecraft:diorite',
      'minecraft:dripstone_block',
      'minecraft:emerald_block',
      'minecraft:end_stone',
      'minecraft:end_stone_bricks',
      'minecraft:gilded_blackstone',
      'minecraft:glowstone',
      'minecraft:granite',
      'minecraft:lapis_block',
      'minecraft:mossy_cobblestone',
      'minecraft:mossy_stone_bricks',
      'minecraft:mud_bricks',
      'minecraft:nether_bricks',
      'minecraft:netherrack',
      'minecraft:observer',
      'minecraft:obsidian',
      'minecraft:polished_andesite',
      'minecraft:polished_basalt',
      'minecraft:polished_blackstone',
      'minecraft:polished_blackstone_bricks',
      'minecraft:polished_cinnabar',
      'minecraft:polished_deepslate',
      'minecraft:polished_diorite',
      'minecraft:polished_granite',
      'minecraft:polished_sulfur',
      'minecraft:polished_tuff',
      'minecraft:prismarine',
      'minecraft:prismarine_bricks',
      'minecraft:purpur_block',
      'minecraft:purpur_pillar',
      'minecraft:quartz_block',
      'minecraft:quartz_bricks',
      'minecraft:nether_quartz_ore',
      'minecraft:quartz_pillar',
      'minecraft:red_nether_bricks',
      'minecraft:red_sandstone',
      'minecraft:redstone_lamp',
      'minecraft:sandstone',
      'minecraft:sea_lantern',
      'minecraft:smooth_basalt',
      'minecraft:smooth_quartz',
      'minecraft:smooth_red_sandstone',
      'minecraft:smooth_sandstone',
      'minecraft:smooth_stone',
      'minecraft:stone',
      'minecraft:stone_bricks',
      'minecraft:sulfur',
      'minecraft:sulfur_bricks',
      'minecraft:tuff',
      'minecraft:tuff_bricks',
      'minecraft:warped_nylium',
      'minecraft:white_concrete',
      'minecraft:orange_concrete',
      'minecraft:magenta_concrete',
      'minecraft:light_blue_concrete',
      'minecraft:yellow_concrete',
      'minecraft:lime_concrete',
      'minecraft:pink_concrete',
      'minecraft:gray_concrete',
      'minecraft:light_gray_concrete',
      'minecraft:cyan_concrete',
      'minecraft:purple_concrete',
      'minecraft:blue_concrete',
      'minecraft:brown_concrete',
      'minecraft:green_concrete',
      'minecraft:red_concrete',
      'minecraft:black_concrete',
      'minecraft:coal_ore',
      'minecraft:deepslate_coal_ore',
      'minecraft:lapis_ore',
      'minecraft:deepslate_lapis_ore',
      'minecraft:redstone_ore',
      'minecraft:deepslate_redstone_ore',
      'minecraft:diamond_ore',
      'minecraft:deepslate_diamond_ore',
      'minecraft:emerald_ore',
      'minecraft:deepslate_emerald_ore',
      'minecraft:terracotta',
      'minecraft:white_terracotta',
      'minecraft:orange_terracotta',
      'minecraft:magenta_terracotta',
      'minecraft:light_blue_terracotta',
      'minecraft:yellow_terracotta',
      'minecraft:lime_terracotta',
      'minecraft:pink_terracotta',
      'minecraft:gray_terracotta',
      'minecraft:light_gray_terracotta',
      'minecraft:cyan_terracotta',
      'minecraft:purple_terracotta',
      'minecraft:blue_terracotta',
      'minecraft:brown_terracotta',
      'minecraft:green_terracotta',
      'minecraft:red_terracotta',
      'minecraft:black_terracotta',
      'minecraft:white_glazed_terracotta',
      'minecraft:orange_glazed_terracotta',
      'minecraft:magenta_glazed_terracotta',
      'minecraft:light_blue_glazed_terracotta',
      'minecraft:yellow_glazed_terracotta',
      'minecraft:lime_glazed_terracotta',
      'minecraft:pink_glazed_terracotta',
      'minecraft:gray_glazed_terracotta',
      'minecraft:light_gray_glazed_terracotta',
      'minecraft:cyan_glazed_terracotta',
      'minecraft:purple_glazed_terracotta',
      'minecraft:blue_glazed_terracotta',
      'minecraft:brown_glazed_terracotta',
      'minecraft:green_glazed_terracotta',
      'minecraft:red_glazed_terracotta',
      'minecraft:black_glazed_terracotta',
    ],
  },
  {
    archetypeId: 'minecraft:slow_flat',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/slow_flat',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/slow_flat.json',
      lineStart: 1,
      lineEnd: 45,
    },
    itemIds: [
      'minecraft:iron_block',
      'minecraft:gold_block',
      'minecraft:raw_copper_block',
      'minecraft:raw_gold_block',
      'minecraft:raw_iron_block',
      'minecraft:gold_ore',
      'minecraft:nether_gold_ore',
      'minecraft:deepslate_gold_ore',
      'minecraft:iron_ore',
      'minecraft:deepslate_iron_ore',
      'minecraft:copper_ore',
      'minecraft:deepslate_copper_ore',
      'minecraft:netherite_block',
      'minecraft:ancient_debris',
      'minecraft:copper_block',
      'minecraft:exposed_copper',
      'minecraft:weathered_copper',
      'minecraft:oxidized_copper',
      'minecraft:waxed_copper_block',
      'minecraft:waxed_exposed_copper',
      'minecraft:waxed_weathered_copper',
      'minecraft:waxed_oxidized_copper',
      'minecraft:copper_bulb',
      'minecraft:exposed_copper_bulb',
      'minecraft:weathered_copper_bulb',
      'minecraft:oxidized_copper_bulb',
      'minecraft:waxed_copper_bulb',
      'minecraft:waxed_exposed_copper_bulb',
      'minecraft:waxed_weathered_copper_bulb',
      'minecraft:waxed_oxidized_copper_bulb',
      'minecraft:cut_copper',
      'minecraft:exposed_cut_copper',
      'minecraft:weathered_cut_copper',
      'minecraft:oxidized_cut_copper',
      'minecraft:waxed_cut_copper',
      'minecraft:waxed_exposed_cut_copper',
      'minecraft:waxed_weathered_cut_copper',
      'minecraft:waxed_oxidized_cut_copper',
      'minecraft:chiseled_copper',
      'minecraft:exposed_chiseled_copper',
      'minecraft:weathered_chiseled_copper',
      'minecraft:oxidized_chiseled_copper',
      'minecraft:waxed_chiseled_copper',
      'minecraft:waxed_exposed_chiseled_copper',
      'minecraft:waxed_weathered_chiseled_copper',
      'minecraft:waxed_oxidized_chiseled_copper',
    ],
  },
  {
    archetypeId: 'minecraft:slow_sliding',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/slow_sliding',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/slow_sliding.json',
      lineStart: 1,
      lineEnd: 9,
    },
    itemIds: [
      'minecraft:brown_mushroom_block',
      'minecraft:red_mushroom_block',
      'minecraft:mushroom_stem',
      'minecraft:mycelium',
      'minecraft:nether_wart_block',
      'minecraft:warped_wart_block',
      'minecraft:shroomlight',
    ],
  },
  {
    archetypeId: 'minecraft:sticky',
    rootTag: {
      tagId: 'minecraft:sulfur_cube_archetype/sticky',
      sourcePath:
        'versions/26.3/extracted/data/minecraft/tags/item/sulfur_cube_archetype/sticky.json',
      lineStart: 1,
      lineEnd: 4,
    },
    itemIds: ['minecraft:honeycomb_block'],
  },
]

function expandMembershipGroups(
  groups: readonly Je26_3ArchetypeMembershipGroup[],
): readonly Je26_3BlockMembershipEntry[] {
  const entriesByItemId = new Map<
    string,
    {
      readonly itemId: string
      readonly orderedCandidateIds: Je26_3ArchetypeId[]
      readonly rootTagIds: string[]
    }
  >()

  for (const group of groups) {
    for (const itemId of group.itemIds) {
      const existing = entriesByItemId.get(itemId)
      if (existing === undefined) {
        entriesByItemId.set(itemId, {
          itemId,
          orderedCandidateIds: [group.archetypeId],
          rootTagIds: [group.rootTag.tagId],
        })
      } else {
        existing.orderedCandidateIds.push(group.archetypeId)
        existing.rootTagIds.push(group.rootTag.tagId)
      }
    }
  }

  return [...entriesByItemId.values()]
}

export const je26_3BlockMembershipEntries: readonly Je26_3BlockMembershipEntry[] =
  expandMembershipGroups(je26_3BlockMembershipGroups)

export const je26_3SwallowableItemIds: readonly string[] = je26_3BlockMembershipEntries.map(
  ({ itemId }) => itemId,
)

export const je26_3BlockMembershipIndex: Readonly<Record<string, Je26_3BlockMembershipEntry>> =
  Object.fromEntries(je26_3BlockMembershipEntries.map((entry) => [entry.itemId, entry]))
