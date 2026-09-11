export type ProvenanceSourceKind = 'decompiledBehavior' | 'extractedData'

export interface ProvenanceRecord {
  readonly edition: 'Java Edition'
  readonly version: '26.2'
  readonly sourceKind: ProvenanceSourceKind
  readonly sourcePath: string
  readonly locator: string
  readonly notes?: string
}

export const provenance = {
  sulfurCubeKnockback: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/monster/cubemob/SulfurCube.java',
    locator:
      'applyHorizontalHitAngleScale, applyVerticalHitAnglePowerTransfer, applyVerticalPositionAnglePowerRotation, knockback (local lines 770-878)',
  },
  ordinaryKnockbackCall: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/LivingEntity.java',
    locator: 'dealDefaultKnockback (local lines 1290-1305)',
    notes:
      'The absorbed immune-damage path forwards its incoming float damage argument at SulfurCube.hurtServer local lines 243-263. The sulfurCubeBlockImmunity tag includes player_attack. The damage passed to knockback is not defined as health lost.',
  },
  extraKnockbackCall: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/player/Player.java',
    locator: 'causeExtraKnockback (local lines 1121-1157)',
    notes:
      'The complete primary-player-melee caller path is recorded by playerMeleeDamage and playerMeleeKnockback; this entry preserves the separate-call behavior and direction source.',
  },
  playerMeleeDamage: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/player/Player.java',
    locator:
      'attack and getAttackStrengthScale (local lines 951-1005, 1032-1049, 1207-1209, 1816-1827)',
    notes:
      'Defines Float32 attack-strength damage scaling, critical eligibility and multiplier, item/enchantment damage ordering, and the total damageArgument passed to target knockback.',
  },
  playerMeleeKnockback: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/player/Player.java',
    locator: 'attack and causeExtraKnockback (local lines 962-989 and 1121-1149)',
    notes:
      'LivingEntity.getKnockback folds effective ATTACK_KNOCKBACK and enchantments before dividing by two at LivingEntity.java local lines 1540-1544. An eligible sprint contributes 0.5F to the one combined extra-call K.',
  },
  playerMeleeSharpness: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath: 'versions/26.2/extracted/data/minecraft/enchantment/sharpness.json',
    locator: 'minecraft:damage effect LevelBasedValue.Linear base 1 and per_level_above_first 0.5',
    notes:
      'Player.attack obtains the enchantment-only damage difference before multiplying it by attack strength. Item enchantment levels decode through 255.',
  },
  playerMeleeWeaponPresets: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/item/Items.java',
    locator:
      'sword and axe registrations (local lines 981-1043); Player base attributes are in Player.java local lines 206-208; ToolMaterial.java local lines 26 and 97-103 and AxeItem.java local lines 17-24 fold item modifiers',
    notes:
      'The 15 reader presets expose already-folded main-hand ATTACK_DAMAGE and ATTACK_SPEED attributes. Recovery period is 20 / effective ATTACK_SPEED. None adds base ATTACK_KNOCKBACK.',
  },
  playerMeleeEnchantmentAvailability: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath: 'versions/26.2/extracted/data/minecraft/enchantment/',
    locator:
      'sharpness.json and knockback.json supported_items, primary_items, slots, and max_level; referenced enchantable item tags',
    notes:
      'Sharpness I-V is ordinarily supported on swords and axes (axes through anvil application). Knockback I-II is supported on swords, but not axes. Empty-hand enchantments are model-level hypothetical configurations.',
  },
  playerMeleeReach: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/client/player/LocalPlayer.java',
    locator: 'pick and raycastHitResult (local lines 1238-1288)',
    notes:
      'Ordinary Survival entity reach is a strict 3-block eye-ray entry test. ProjectileUtil.java local lines 109-145 supplies pick-radius and inside-picking behavior; AABB.java local lines 294-399 supplies the 1e-7 clipping tolerance; absorbed SulfurCube.canBePickedFromInside returns false at local lines 923-930. Block and competing-entity occlusion are not evaluated by the current clear-scene diagnostic.',
  },
  playerBowArrowShot: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/item/BowItem.java',
    locator: 'releaseUsing and getPowerForTime (local lines 26-82)',
    notes:
      'Defines the source-float draw curve, 0.1 release gate, nominal launch speed and full-draw critical flag. Current impact motion remains a separately sampled projectile value.',
  },
  playerBowArrowDamage: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/projectile/arrow/AbstractArrow.java',
    locator: 'onHitEntity (local lines 425-505)',
    notes:
      'Defines impact-speed sampling, Power-modified stored base damage, ceiling, explicit critical random addition, int-to-float damageArgument, owner-backed arrow damage source and post-success operation order.',
  },
  playerBowArrowPunch: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/projectile/arrow/AbstractArrow.java',
    locator: 'doKnockback (local lines 520-530)',
    notes:
      'Punch is a separate additive push after accepted arrow damage. The copied firing weapon supplies K; current horizontal projectile motion supplies direction; the complete push is omitted when that direction normalizes to zero.',
  },
  playerBowArrowEnchantments: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath: 'versions/26.2/extracted/data/minecraft/enchantment/power.json',
    locator:
      'Power effect, supported bow item and maximum level; Punch uses the sibling punch.json definition',
    notes:
      'Power modifies stored damage before impact-speed multiplication. Punch supplies the later direct-push K. Item enchantment data can decode levels through 255, while ordinary Survival maxima are Power V and Punch II.',
  },
  bouncyArchetype: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath: 'versions/26.2/extracted/data/minecraft/sulfur_cube_archetype/bouncy.json',
    locator: 'attribute_modifiers, buoyant, items, knockback_modifiers (local lines 2-45)',
  },
  sulfurCubeArchetypeCodec: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/SulfurCubeArchetype.java',
    locator:
      'DIRECT_CODEC and nested AttributeEntry, ContactDamage, ExplosionData, KnockbackModifiers, and SoundSettings codecs (local lines 23-126)',
    notes:
      'Defines required fields, optional defaults, Java numeric codec boundaries, and decoded runtime field types.',
  },
  sulfurCubeArchetypeRegistryOrder: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/resources/ResourceManagerRegistryLoadTask.java',
    locator: 'load, identifier sort before registry registration (local lines 40-67)',
    notes:
      'MappedRegistry.register appends holders to byId and registry iteration follows byId in MappedRegistry.java local lines 88-120 and 202-204.',
  },
  sulfurCubeArchetypeApplication: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/monster/cubemob/SulfurCube.java',
    locator:
      'matchingArchetypes and collectEquipmentChanges reset/application fold (local lines 274-282 and 366-419)',
    notes:
      'Establishes ordered candidate matching, default special state, OR/append/overwrite behavior, and ignored unavailable attributes.',
  },
  sulfurCubeBlockImmunity: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath:
      'versions/26.2/extracted/data/minecraft/tags/damage_type/sulfur_cube_with_block_immune_to.json',
    locator: 'values, including minecraft:player_attack (local lines 2-26)',
  },
  attributeDefaults: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/ai/attributes/Attributes.java',
    locator:
      'AIR_DRAG_MODIFIER, BOUNCINESS, EXPLOSION_KNOCKBACK_RESISTANCE, FRICTION_MODIFIER, GRAVITY, KNOCKBACK_RESISTANCE (local lines 10-12, 31, 38-40, 52-63)',
  },
  attributeFolding: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/ai/attributes/AttributeInstance.java',
    locator: 'calculateValue (local lines 148-165)',
  },
  attributeSanitization: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/ai/attributes/RangedAttribute.java',
    locator: 'sanitizeValue (local lines 34-37)',
  },
  sulfurCubeDimensions: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/EntityTypes.java',
    locator: 'EntityTypes.SULFUR_CUBE (local lines 943-946)',
  },
  sulfurCubeRuntimeSize: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath:
      'versions/26.2/decompiled/src/net/minecraft/world/entity/monster/cubemob/AbstractCubeMob.java',
    locator: 'getDefaultDimensions (local lines 257-260)',
    notes:
      'SulfurCube.setSpawnSize uses runtime size 2 for adults at SulfurCube.java local lines 668-674. EntityDimensions.scale performs float multiplication at EntityDimensions.java local lines 25-38.',
  },
  standingPlayerEyeHeight: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/Avatar.java',
    locator:
      'DEFAULT_EYE_HEIGHT and STANDING_DIMENSIONS (local lines 16-23); corroborated by EntityTypes.PLAYER (EntityTypes.java local lines 1136-1146)',
  },
  vectorNormalization: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/phys/Vec3.java',
    locator: 'normalize (local lines 83-86)',
  },
  vectorRotation: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/phys/Vec2.java',
    locator: 'rotate (local lines 82-86)',
    notes:
      'Mth.sin/cos use a 65,536-entry float table at Mth.java local lines 35-59. Java precision reproduces the table; Standard intentionally defers that quantization.',
  },
  javaPrecisionTrigonometry: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/util/Mth.java',
    locator:
      'SIN table, sin, cos, sqrt(float), wrapDegrees(float), atan2 and fastInvSqrt (local lines 25-59, 216-227 and 391-456)',
    notes:
      'The Java-precision backend applies Math.fround only at audited source-float boundaries. Mth.atan2 is not the backend atan2: it is confined to command-facing Entity.lookAt conversion.',
  },
  commandFacingPlayerAim: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/Entity.java',
    locator:
      'calculateViewVector and lookAt (local lines 1972-1980 and 3662-3673); Mth helpers are recorded by javaPrecisionTrigonometry',
    notes:
      'Reproduces the validation protocol execute anchored-eyes facing conversion from the distinct eye and aim-point inputs into float pitch/yaw and a quantized view vector. Entity.lookAt bytecode multiplies Mth.atan2 by the pre-rounded Float32 RAD_TO_DEG value loaded as double 57.2957763671875 before d2f.',
  },
  meleeEndpointValidation: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'extractedData',
    sourcePath:
      'notes/in-game-data/sulfur_cube_endpoint/command_storage.dat and protocol-iterations/je26_2-melee-accuracy-matrix-accurate',
    locator: '100 completed player-melee rows, each with 40 stable endpoint samples',
    notes:
      'The tracked fixtures retain full-precision observed endpoints, exact Standard outputs, focused command/launch intermediates and numerical edge cases. Java precision matches all stored X/Y/Z endpoint components exactly.',
  },
  airTravel: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/LivingEntity.java',
    locator:
      'computeModifiedFriction, travelInAir, handleRelativeFrictionAndCalculateMovement, aiStep (local lines 515-517, 2460-2486, 2666-2675, 3050-3073)',
    notes:
      'Absorbed sulfur cubes use omnidirectional air drag through SulfurCube.omnidirectionalAirMover (local lines 426-429).',
  },
  restingGroundMotion: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/LivingEntity.java',
    locator:
      'travelInAir and aiStep (local lines 2460-2486 and 3050-3073); SulfurCube.omnidirectionalAirMover (SulfurCube.java local lines 426-429)',
    notes:
      'After a grounded movement is collision-clipped, travelInAir stores (0 - effective gravity) multiplied by modified 0.91F air drag. A later accepted player hit reads this existing DeltaMovement in SulfurCube.knockback before adding launch velocity.',
  },
  flatFloorContact: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/Entity.java',
    locator:
      'move, collide, and applyEffectsFromBlocks (local lines 717-862 and 1143-1268); floor-friction selection occurs in LivingEntity.travelInAir local lines 2460-2485',
    notes:
      'The first launch update begins on ground and uses supporting-block friction for its post-move horizontal velocity. The narrow reader model assumes an ordinary full block with decoded friction 0.6000000238418579 and stops at first return before rebound.',
  },
  repeatedUniformFloorMotion: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/entity/Entity.java',
    locator:
      'move, collide, updateSupportingBlock, applyEffectsFromBlocks, pushEntities and checkFallDamage (local lines 717-862 and 1143-1268); LivingEntity.travelInAir and computeModifiedFriction (local lines 2460-2492)',
    notes:
      'Defines strict per-component movement cutoff, the separate 1.0e-7 squared-length position-commit gate, movement/collision ordering, retained onGround state on a rebound tick, floor speed-factor sampling, gravity and omnidirectional drag. The reader model is intentionally restricted to an infinite uniform horizontal floor.',
  },
  uniformFloorProperties: {
    edition: 'Java Edition',
    version: '26.2',
    sourceKind: 'decompiledBehavior',
    sourcePath: 'versions/26.2/decompiled/src/net/minecraft/world/level/block/Blocks.java',
    locator:
      'ordinary, slime, honey, ice, blue ice, soul sand and bed block registrations; BlockBehaviour.Properties friction, speedFactor and jumpFactor values',
    notes:
      'Collision heights are supplied by each block shape. Bed restitution is defined by BedBlock.fallOn/bounceUp, slime restitution and its late horizontal stepOn scale by SlimeBlock, and honey bounce suppression by HoneyBlock.',
  },
} as const satisfies Record<string, ProvenanceRecord>

export type ProvenanceId = keyof typeof provenance

export interface SourcedValue<T> {
  readonly value: T
  readonly provenance: readonly ProvenanceId[]
  readonly derivation?: string
}

export function sourcedValue<T>(
  value: T,
  sourceIds: readonly ProvenanceId[],
  derivation?: string,
): SourcedValue<T> {
  return derivation === undefined
    ? { value, provenance: sourceIds }
    : { value, provenance: sourceIds, derivation }
}
