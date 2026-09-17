import type { KnockbackCall, Vec3 } from '../model/types'
import { je26_3Constants } from '../data/je26_3'
import { createSulfurCubeContext } from '../presets/defaults'
import { createStandingPlayerGeometry } from '../presets/standingPlayer'

export const launchDirectionExperimentProvenance = {
  edition: 'Java Edition',
  version: '26.2',
  sourcePath:
    'notes/in-game-data/sulfur_cube_launch_direction/sulfur_cube_launch_direction_results.csv',
  notes:
    'M1-M9 direct-melee observations; model inputs are reconstructed from the recorded relative positions and aim offsets.',
} as const

export const verticalityExperimentProvenance = {
  edition: 'Java Edition',
  version: '26.2',
  sourcePath:
    'notes/in-game-data/sulfur_cube_knockback_verticality/sulfur_cube_knockback_verticality_analysis.md',
  notes: 'Grounded and airborne absorbed-cube observations in the corrected trial_2 dataset.',
} as const

export interface DirectMeleeExperimentFixture {
  readonly id: string
  readonly attackerFeetPosition: Vec3
  readonly aimPoint: Vec3
  readonly damageArgument: number
  readonly expectedAddedVelocity: Vec3
  readonly expectedDiagnostics: {
    readonly q: number
    readonly horizontalAngleDelta: number
    readonly theta: number
  }
}

const cubeFeetPosition = { x: 0, y: 0, z: 0 } as const

export const directMeleeFixtures: readonly DirectMeleeExperimentFixture[] = [
  {
    id: 'M1_melee_center',
    attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
    aimPoint: { x: 0, y: 0.49, z: 0.48 },
    damageArgument: 1,
    expectedAddedVelocity: { x: 0, y: 0.37799999713897703, z: -0.16500000655651093 },
    expectedDiagnostics: { q: 1, horizontalAngleDelta: 0, theta: 0 },
  },
  {
    id: 'M2_melee_left',
    attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
    aimPoint: { x: -0.4, y: 0.49, z: 0.48 },
    damageArgument: 1,
    expectedAddedVelocity: {
      x: 0.10475331107432428,
      y: 0.37799999713897703,
      z: -0.15375646858958392,
    },
    expectedDiagnostics: {
      q: 0.9072791337966919,
      horizontalAngleDelta: 0.3738119602203369,
      theta: 0,
    },
  },
  {
    id: 'M3_melee_right',
    attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
    aimPoint: { x: 0.4, y: 0.49, z: 0.48 },
    damageArgument: 1,
    expectedAddedVelocity: {
      x: -0.10475798279440335,
      y: 0.37799999713897703,
      z: -0.1537532856722787,
    },
    expectedDiagnostics: {
      q: 0.9072791337966919,
      horizontalAngleDelta: -0.3738119602203369,
      theta: 0,
    },
  },
  {
    id: 'M4_melee_upper',
    attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
    aimPoint: { x: 0, y: 0.88, z: 0.48 },
    damageArgument: 1,
    expectedAddedVelocity: { x: 0, y: 0.37799999713897703, z: -0.42971864342689514 },
    expectedDiagnostics: { q: 0.14119195938110352, horizontalAngleDelta: 0, theta: 0 },
  },
  {
    id: 'M5_melee_lower',
    attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
    aimPoint: { x: 0, y: 0.1, z: 0.48 },
    damageArgument: 1,
    expectedAddedVelocity: { x: 0, y: 0.37799999713897703, z: -0.16500000655651093 },
    expectedDiagnostics: { q: 1, horizontalAngleDelta: 0, theta: 0 },
  },
  {
    id: 'M6_player_high_center',
    attackerFeetPosition: { x: 0, y: 1, z: 1.5 },
    aimPoint: { x: 0, y: 0.49, z: 0.48 },
    damageArgument: 1,
    expectedAddedVelocity: { x: 0, y: 0.1688986301422119, z: -0.30626800656318665 },
    expectedDiagnostics: { q: 1, horizontalAngleDelta: 0, theta: 0.588002622127533 },
  },
  {
    id: 'M7_player_low_center',
    attackerFeetPosition: { x: 0, y: -1, z: 1.5 },
    aimPoint: { x: 0, y: 0.49, z: 0.48 },
    damageArgument: 1,
    expectedAddedVelocity: { x: 0, y: 0.37799999713897703, z: -0.13169263303279877 },
    expectedDiagnostics: {
      q: 0.16932499408721924,
      horizontalAngleDelta: 0,
      theta: -0.588002622127533,
    },
  },
  {
    id: 'M8_damage4_center',
    attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
    aimPoint: { x: 0, y: 0.49, z: 0.48 },
    damageArgument: 4,
    expectedAddedVelocity: { x: 0, y: 0.7559999942779541, z: -0.33000001311302185 },
    expectedDiagnostics: { q: 1, horizontalAngleDelta: 0, theta: 0 },
  },
  {
    id: 'M9_damage9_center',
    attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
    aimPoint: { x: 0, y: 0.49, z: 0.48 },
    damageArgument: 9,
    expectedAddedVelocity: { x: 0, y: 1.1339999914169312, z: -0.49500003457069397 },
    expectedDiagnostics: { q: 1, horizontalAngleDelta: 0, theta: 0 },
  },
]

export const m1TenTickFixture = {
  initialPosition: cubeFeetPosition,
  expectedPosition: { x: 0, y: 0.17658640949186832, z: -1.643333795823736 },
  expectedVelocity: { x: 0, y: -0.4214389490006517, z: -0.16352105456691135 },
} as const

export const verticalityFixture = {
  attackerFeetPosition: { x: 0, y: 0, z: 1.5 },
  aimPoint: { x: 0, y: 0.5, z: 0 },
  existingVelocity: { x: 0, y: -0.079928, z: 0 },
  expectedAddedVelocity: { x: 0, y: 0.378, z: -0.402596 },
} as const

function directionBetween(from: Vec3, to: Vec3): Vec3 {
  const x = to.x - from.x
  const y = to.y - from.y
  const z = to.z - from.z
  const length = Math.sqrt(x * x + y * y + z * z)

  return { x: x / length, y: y / length, z: z / length }
}

export function createFixtureInputs(fixture: DirectMeleeExperimentFixture) {
  const eyePosition = {
    x: fixture.attackerFeetPosition.x,
    y: fixture.attackerFeetPosition.y + je26_3Constants.standingPlayerEyeHeight.value,
    z: fixture.attackerFeetPosition.z,
  }
  const attacker = createStandingPlayerGeometry(
    fixture.attackerFeetPosition,
    directionBetween(eyePosition, fixture.aimPoint),
  )
  const call: KnockbackCall = {
    damageArgument: fixture.damageArgument,
    horizontalBaseDirection: {
      x: fixture.attackerFeetPosition.x - cubeFeetPosition.x,
      z: fixture.attackerFeetPosition.z - cubeFeetPosition.z,
    },
    scaling: { kind: 'ordinaryDamage' },
  }

  return {
    call,
    context: createSulfurCubeContext(attacker, cubeFeetPosition),
  }
}

export function createLookDirection(from: Vec3, to: Vec3): Vec3 {
  return directionBetween(from, to)
}
