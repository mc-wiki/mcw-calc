import type { HorizontalVector, Vec3 } from '../model/types'

export const standardDirectionTolerance = 1e-9
// Standard mode deliberately omits the source float boundaries and sine table.
// This matches the tolerance already used for the recorded launch experiments.
export const javaDirectionFixtureTolerance = 0.00015

export interface DirectHorizontalDirectionFixture {
  readonly id: string
  readonly lookDirection: Vec3
  readonly cubeCenterOffset: HorizontalVector
  readonly baseDirection: HorizontalVector
  readonly expectedAngleDelta: number
  readonly expectedNormalizedDirection: HorizontalVector
}

export const directHorizontalDirectionFixtures = [
  {
    id: 'direct_centered',
    lookDirection: { x: 1, y: 0, z: 0 },
    cubeCenterOffset: { x: 5, z: 0 },
    baseDirection: { x: -5, z: 0 },
    expectedAngleDelta: 0,
    expectedNormalizedDirection: { x: -1, z: 0 },
  },
  {
    id: 'direct_mirror_left',
    lookDirection: { x: Math.sqrt(3) / 2, y: 0, z: 0.5 },
    cubeCenterOffset: { x: 5, z: 0 },
    baseDirection: { x: -5, z: 0 },
    expectedAngleDelta: -Math.PI / 6,
    expectedNormalizedDirection: {
      x: -0.6691306063588582,
      z: 0.7431448254773942,
    },
  },
  {
    id: 'direct_mirror_right',
    lookDirection: { x: Math.sqrt(3) / 2, y: 0, z: -0.5 },
    cubeCenterOffset: { x: 5, z: 0 },
    baseDirection: { x: -5, z: 0 },
    expectedAngleDelta: Math.PI / 6,
    expectedNormalizedDirection: {
      x: -0.6691306063588582,
      z: -0.7431448254773942,
    },
  },
] as const satisfies readonly DirectHorizontalDirectionFixture[]

export interface HorizontalProviderFixture {
  readonly id: string
  readonly providerId:
    | 'nonProjectileSourcePosition'
    | 'projectileMotion'
    | 'potionPosition'
    | 'fireworkPosition'
    | 'callerYaw'
  readonly baseDirection: HorizontalVector
  readonly expectedTransformedDirection: HorizontalVector
  readonly expectedTransformedLength: number
  readonly expectedNormalizedDirection: HorizontalVector
}

export const horizontalProviderSharedGeometry = Object.freeze({
  causingFeet: { x: 0, y: 0, z: 1.5 },
  causingEye: { x: 0, y: 1.6200000047683716, z: 1.5 },
  causingLook: {
    x: -0.2541956305503845,
    y: -0.7179368138313293,
    z: -0.648036539554596,
  },
  cubeFeet: { x: 0, y: 0, z: 0 },
  cubeDimensions: { width: 0.9800000190734863, height: 0.9800000190734863 },
  expectedCross: 0.20303118912031318,
  expectedDot: 0.5175998853100012,
  expectedAngleDelta: 0.3738119602203369,
})

/** Isolates each verified in-scope JE 26.3 base-direction provider at one geometry. */
export const horizontalProviderFixtures = [
  {
    id: 'horizontal_non_projectile_source_position',
    providerId: 'nonProjectileSourcePosition',
    baseDirection: { x: 0, z: 1.5 },
    expectedTransformedDirection: { x: -0.8445613384246826, z: 1.2396435737609863 },
    expectedTransformedLength: 1.5000000147762003,
    expectedNormalizedDirection: { x: -0.5630408867367185, z: 0.8264290410330035 },
  },
  {
    id: 'horizontal_base_projectile_motion',
    providerId: 'projectileMotion',
    baseDirection: { x: 0, z: 1 },
    expectedTransformedDirection: { x: -0.5630409121513367, z: 0.8264290690422058 },
    expectedTransformedLength: 1.0000000374570874,
    expectedNormalizedDirection: { x: -0.5630408910614648, z: 0.8264290380865811 },
  },
  {
    id: 'horizontal_thrown_potion_position',
    providerId: 'potionPosition',
    baseDirection: { x: -0.25, z: 0.8 },
    expectedTransformedDirection: { x: -0.657039999961853, z: 0.5203830003738403 },
    expectedTransformedLength: 0.8381527477900148,
    expectedNormalizedDirection: { x: -0.7839143899418003, z: 0.6208689308076022 },
  },
  {
    id: 'horizontal_firework_position',
    providerId: 'fireworkPosition',
    baseDirection: { x: -0.25, z: 0.8 },
    expectedTransformedDirection: { x: -0.657039999961853, z: 0.5203830003738403 },
    expectedTransformedLength: 0.8381527477900148,
    expectedNormalizedDirection: { x: -0.7839143899418003, z: 0.6208689308076022 },
  },
  {
    id: 'horizontal_caller_yaw',
    providerId: 'callerYaw',
    baseDirection: { x: 0.3651667833328247, z: 0.9309421181678772 },
    expectedTransformedDirection: { x: -0.22237402200698853, z: 0.9749614596366882 },
    expectedTransformedLength: 1.0000000267202327,
    expectedNormalizedDirection: { x: -0.22237401606510307, z: 0.9749614335854918 },
  },
] as const satisfies readonly HorizontalProviderFixture[]

export interface ProjectileDirectionFixture {
  readonly id: string
  readonly ownerFeet: Vec3
  readonly ownerEye: Vec3
  readonly ownerYawDegrees: number
  readonly ownerPitchDegrees: number
  readonly projectileFeet: Vec3
  readonly projectileMotion: Vec3
  readonly cubeFeet: Vec3
  readonly damageArgument: number
  readonly expectedAngleDelta: number
  readonly expectedNormalizedDirection: HorizontalVector
  readonly expectedAddedVelocity: Vec3
}

/**
 * Player-owned arrow observations P1-P11 from the accepted JE 26.2 source audit.
 * The projectile-motion provider resolves base X/Z as negative current motion.
 * Recorded provenance: notes/in-game-data/sulfur_cube_launch_direction/.
 */
export const playerOwnedArrowDirectionFixtures = [
  {
    id: 'P1_center_owner_neutral',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.5, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.17819091081619262, z: -0.7000356912612915 },
  },
  {
    id: 'P2_left_owner_neutral',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.9, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.17819091081619262, z: -0.7000356912612915 },
  },
  {
    id: 'P3_right_owner_neutral',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.1, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.17819091081619262, z: -0.7000356912612915 },
  },
  {
    id: 'P4_upper_owner_neutral',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.5, y: -19.12, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.17819091081619262, z: -0.7000356912612915 },
  },
  {
    id: 'P5_lower_owner_neutral',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.5, y: -19.9, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.17819091081619262, z: -0.7000356912612915 },
  },
  {
    id: 'P6_center_owner_yaw150',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: 150,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.5, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: 0.5236626863479614,
    expectedNormalizedDirection: { x: -0.7432004127894859, z: 0.669068865237008 },
    expectedAddedVelocity: {
      x: 0.5202668147127649,
      y: 0.17819091081619262,
      z: -0.4683720855775968,
    },
  },
  {
    id: 'P7_center_owner_yaw_minus150',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -150,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.5, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -0.5236626863479614,
    expectedNormalizedDirection: { x: 0.743235861135443, z: 0.6690294871844263 },
    expectedAddedVelocity: {
      x: -0.5202916298201311,
      y: 0.17819091081619262,
      z: -0.46834451953533723,
    },
  },
  {
    id: 'P8_center_owner_pitch_up',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: -30,
    projectileFeet: { x: -34.5, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.17819091081619262, z: -0.7000356912612915 },
  },
  {
    id: 'P9_center_owner_pitch_down',
    ownerFeet: { x: -34.5, y: -20, z: 118.5 },
    ownerEye: { x: -34.5, y: -18.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 30,
    projectileFeet: { x: -34.5, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.5345727324485778, z: -0.23334525525569916 },
  },
  {
    id: 'P10_center_owner_high',
    ownerFeet: { x: -34.5, y: -18, z: 118.5 },
    ownerEye: { x: -34.5, y: -16.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.5, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: -0.36630699634552, z: -0.7000356912612915 },
  },
  {
    id: 'P11_center_owner_low',
    ownerFeet: { x: -34.5, y: -22, z: 118.5 },
    ownerEye: { x: -34.5, y: -20.37999999523163, z: 118.5 },
    ownerYawDegrees: -180,
    ownerPitchDegrees: 0,
    projectileFeet: { x: -34.5, y: -19.51, z: 113.8 },
    projectileMotion: { x: 0, y: 0, z: -1 },
    cubeFeet: { x: -34.5, y: -20, z: 112.5 },
    damageArgument: 2,
    expectedAngleDelta: -1.2246468525851679e-16,
    expectedNormalizedDirection: { x: -0, z: 1 },
    expectedAddedVelocity: { x: 0, y: 0.534572696685791, z: -0.1386663019657135 },
  },
] as const satisfies readonly ProjectileDirectionFixture[]
