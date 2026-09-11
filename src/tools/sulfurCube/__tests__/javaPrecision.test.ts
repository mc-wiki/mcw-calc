import type { Je26_2ToolMaterialId, Je26_2UniformFloorProfileId } from '../data/je26_2'
import type { DiagnosticInputs } from '../presets/diagnostic'
import type { PlayerMeleeEvaluation, PlayerMeleeInputs } from '../presets/playerMelee'
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { je26_2Constants } from '../data/je26_2'
import { normalizeVec3 } from '../model/vectors'
import { javaPrecisionNumerics, minecraftCos, minecraftSin } from '../numerics/javaPrecision'
import {
  calculateJe26_2ViewVector,
  deriveJe26_2PlayerAim,
  minecraftAtan2,
  minecraftWrapDegreesFloat,
  radiansToDegreesFloat,
} from '../numerics/je26_2PlayerAim'
import { standardNumerics } from '../numerics/standard'
import {
  deriveMinecraftYawDegreesFromAim,
  evaluatePlayerMeleeInputs,
  findDefaultPlayerMeleeTrajectoryTicks,
} from '../presets/playerMelee'
import {
  createDefaultCubePropertySelectionState,
  resolveCubePropertySelection,
  selectCubePropertyBlock,
} from '../resolution'

interface EndpointFixture {
  readonly row: number
  readonly absorbedBlock: string
  readonly weapon: string
  readonly sharpnessLevel: number
  readonly knockbackLevel: number
  readonly floorSurface: string
  readonly cubeFeet: readonly [number, number, number]
  readonly playerFeet: readonly [number, number, number]
  readonly aimPoint: readonly [number, number, number]
  readonly standardEndpoint: readonly [number, number, number]
  readonly observedEndpoint: readonly [number, number, number]
}

interface ExtremeFixture {
  readonly testId: string
  readonly commandDerived: {
    readonly eyePosition: readonly [number, number, number]
    readonly pitchDegrees: number
    readonly yawDegrees: number
    readonly reconstructedLookVector: readonly [number, number, number]
  }
  readonly postHitMotion: readonly [number, number, number]
  readonly observedFinalEndpoint: readonly [number, number, number]
}

interface NumericEdgeFixture {
  readonly sineTable: readonly {
    readonly name: string
    readonly radians: number
    readonly expected: number
  }[]
  readonly wrapDegreesFloat: readonly {
    readonly name: string
    readonly input: number
    readonly expected: number
  }[]
  readonly entityLookAt: readonly {
    readonly name: string
    readonly eyePosition?: readonly [number, number, number]
    readonly aimPoint?: readonly [number, number, number]
    readonly expected: {
      readonly pitch: number
      readonly yaw: number
      readonly look: { readonly x: number; readonly y: number; readonly z: number }
    }
  }[]
  readonly mthSqrtFloat: { readonly input: number; readonly expected: number }
  readonly vec3NormalizeCutoff: {
    readonly floatCutoff: number
    readonly cases: readonly {
      readonly name: string
      readonly component: number
      readonly result: readonly [number, number, number]
    }[]
  }
  readonly twoCallOrderedMelee: {
    readonly initialVelocity: readonly [number, number, number]
    readonly operations: readonly {
      readonly existingVelocity: readonly [number, number, number]
      readonly resultingVelocity: readonly [number, number, number]
    }[]
    readonly finalVelocity: readonly [number, number, number]
  }
  readonly repeatedUniformFloor: {
    readonly status: 'settled' | 'truncated'
    readonly simulatedTickCount: number
    readonly arcCount: number
    readonly airborneContactCount: number
    readonly floorCollisionTickCount: number
    readonly bounceEventCount: number
    readonly endpointFeetPosition: readonly [number, number, number]
    readonly endpointVelocity: readonly [number, number, number]
    readonly endpointOnGround: boolean
  }
}

const fixtureUrl = new URL('./fixtures/je26_2MeleeEndpointValidation.csv', import.meta.url)
const extremeFixtureUrl = new URL('./fixtures/je26_2MeleeExtremeValidation.json', import.meta.url)
const numericEdgeFixtureUrl = new URL(
  './fixtures/je26_2NumericEdgeValidation.json',
  import.meta.url,
)

function parseFixtureCsv(): readonly EndpointFixture[] {
  const [headerLine, ...lines] = fs.readFileSync(fixtureUrl, 'utf8').trim().split(/\r?\n/)
  const headers = headerLine!.split(',')

  return lines.map((line) => {
    const columns = Object.fromEntries(
      line.split(',').map((value, index) => [headers[index]!, value]),
    )
    const number = (key: string) => Number(columns[key])

    return {
      row: number('row'),
      absorbedBlock: columns.absorbed_block!,
      weapon: columns.weapon!,
      sharpnessLevel: number('sharpness_level'),
      knockbackLevel: number('knockback_level'),
      floorSurface: columns.floor_surface!,
      cubeFeet: [number('cube_feet_x'), number('cube_feet_y'), number('cube_feet_z')],
      playerFeet: [number('player_feet_x'), number('player_feet_y'), number('player_feet_z')],
      aimPoint: [number('aim_point_x'), number('aim_point_y'), number('aim_point_z')],
      standardEndpoint: [
        number('predicted_final_cube_feet_x'),
        number('predicted_final_cube_feet_y'),
        number('predicted_final_cube_feet_z'),
      ],
      observedEndpoint: [
        number('actual_final_cube_feet_x'),
        number('actual_final_cube_feet_y'),
        number('actual_final_cube_feet_z'),
      ],
    }
  })
}

const endpointFixtures = parseFixtureCsv()
const extremeFixtures = (
  JSON.parse(fs.readFileSync(extremeFixtureUrl, 'utf8')) as { readonly rows: ExtremeFixture[] }
).rows
const numericEdgeFixtures = JSON.parse(
  fs.readFileSync(numericEdgeFixtureUrl, 'utf8'),
) as NumericEdgeFixture

function floorProfile(blockId: string): Je26_2UniformFloorProfileId {
  if (blockId === 'minecraft:slime_block') return 'slime_block'
  if (blockId === 'minecraft:honey_block') return 'honey_block'
  if (blockId === 'minecraft:packed_ice') return 'ice_0_98'
  if (blockId === 'minecraft:blue_ice') return 'blue_ice'
  if (blockId === 'minecraft:soul_sand') return 'soul_sand'
  if (blockId.endsWith('_bed')) return 'bed'
  return 'ordinary_full_block'
}

function weaponChoice(itemId: string): PlayerMeleeInputs['weapon'] {
  if (itemId === 'none') return { type: 'bareHand' }

  const match = /^minecraft:(wooden|stone|copper|golden|iron|diamond|netherite)_(sword|axe)$/.exec(
    itemId,
  )
  if (match === null) throw new RangeError(`unknown fixture weapon: ${itemId}`)

  return {
    type: match[2] as 'sword' | 'axe',
    material: match[1] as Je26_2ToolMaterialId,
  }
}

function createEvaluationInputs(
  fixture: EndpointFixture,
  standingEyeHeight: number,
): { diagnostic: DiagnosticInputs; melee: PlayerMeleeInputs } {
  const [playerX, playerY, playerZ] = fixture.playerFeet

  return {
    diagnostic: {
      cubeFeetPosition: {
        x: fixture.cubeFeet[0],
        y: fixture.cubeFeet[1],
        z: fixture.cubeFeet[2],
      },
      attackerFeetPosition: { x: playerX, y: playerY, z: playerZ },
      attackerEyePosition: {
        x: playerX,
        y: playerY + standingEyeHeight,
        z: playerZ,
      },
      aimPoint: {
        x: fixture.aimPoint[0],
        y: fixture.aimPoint[1],
        z: fixture.aimPoint[2],
      },
      damageArgument: 1,
      trajectoryTicks: 0,
      floorProfileId: floorProfile(fixture.floorSurface),
    },
    melee: {
      weapon: weaponChoice(fixture.weapon),
      attackStrength: 1,
      sprinting: false,
      criticalHitConditions: false,
      sharpness:
        fixture.sharpnessLevel === 0
          ? { enabled: false }
          : { enabled: true, level: fixture.sharpnessLevel },
      knockback:
        fixture.knockbackLevel === 0
          ? { enabled: false }
          : { enabled: true, level: fixture.knockbackLevel },
    },
  }
}

function resolvedProperties(blockId: string) {
  const resolution = resolveCubePropertySelection(
    selectCubePropertyBlock(createDefaultCubePropertySelectionState(), blockId),
  )

  if (resolution.values === null) {
    throw new RangeError(`fixture block did not resolve: ${blockId}`)
  }
  return resolution.values
}

function evaluationFor(fixture: EndpointFixture, mode: 'standard' | 'java'): PlayerMeleeEvaluation {
  const numerics = mode === 'java' ? javaPrecisionNumerics : standardNumerics
  const eyeHeight =
    mode === 'java'
      ? Math.fround(je26_2Constants.standingPlayerEyeHeight.value)
      : je26_2Constants.standingPlayerEyeHeight.value
  const { diagnostic, melee } = createEvaluationInputs(fixture, eyeHeight)
  const properties = resolvedProperties(fixture.absorbedBlock)
  const javaAim =
    mode === 'java'
      ? deriveJe26_2PlayerAim(diagnostic.attackerEyePosition, diagnostic.aimPoint)
      : null
  const yaw =
    javaAim?.yawDegrees ?? deriveMinecraftYawDegreesFromAim(diagnostic, 0, standardNumerics)
  const trajectoryTicks = findDefaultPlayerMeleeTrajectoryTicks(
    diagnostic,
    melee,
    yaw,
    numerics,
    properties,
    javaAim?.lookDirection,
  )
  return evaluatePlayerMeleeInputs(
    { ...diagnostic, trajectoryTicks },
    melee,
    yaw,
    numerics,
    properties,
    javaAim?.lookDirection,
  )
}

function endpointFor(fixture: EndpointFixture, mode: 'standard' | 'java') {
  return evaluationFor(fixture, mode).trajectory.endpoint.feetPosition
}

function vectorTuple(vector: { readonly x: number; readonly y: number; readonly z: number }) {
  return [vector.x, vector.y, vector.z]
}

describe('java-precision numerics for JE 26.2', () => {
  it('uses source Float32 boundaries without changing Java double primitives', () => {
    expect(javaPrecisionNumerics.sourceFloat(1 / 3)).toBe(Math.fround(1 / 3))
    expect(javaPrecisionNumerics.sqrt(2)).toBe(Math.sqrt(2))
    expect(
      Math.fround(javaPrecisionNumerics.sqrt(Math.fround(numericEdgeFixtures.mthSqrtFloat.input))),
    ).toBe(numericEdgeFixtures.mthSqrtFloat.expected)
  })

  it('reproduces the quantized sine table, including negative lookup indices', () => {
    expect(minecraftSin(0)).toBe(0)
    expect(minecraftCos(0)).toBe(1)
    expect(minecraftCos(-1)).toBe(0.540252149105072)

    for (const fixture of numericEdgeFixtures.sineTable) {
      expect(minecraftSin(fixture.radians), fixture.name).toBe(fixture.expected)
    }
  })

  it('reproduces float wrapDegrees at and around its branch boundary', () => {
    for (const fixture of numericEdgeFixtures.wrapDegreesFloat) {
      expect(minecraftWrapDegreesFloat(fixture.input), fixture.name).toBe(fixture.expected)
    }
  })

  it('keeps the Mth atan2 approximation inside the command-facing adapter', () => {
    expect(minecraftAtan2(1, 1)).toBe(0.7853981366411399)
    expect(javaPrecisionNumerics.atan2(1, 1)).toBe(Math.PI / 4)
  })

  it("uses Entity.lookAt bytecode's pre-rounded radians-to-degrees factor", () => {
    expect(radiansToDegreesFloat).toBe(57.2957763671875)
  })

  it('reconstructs Entity lookAt rotation and calculateViewVector', () => {
    const fixture = numericEdgeFixtures.entityLookAt.find(({ name }) => name === 'general')!
    const eyePosition = fixture.eyePosition!
    const aimPoint = fixture.aimPoint!
    const result = deriveJe26_2PlayerAim(
      { x: eyePosition[0], y: eyePosition[1], z: eyePosition[2] },
      { x: aimPoint[0], y: aimPoint[1], z: aimPoint[2] },
    )

    expect(result.pitchDegrees).toBe(fixture.expected.pitch)
    expect(result.yawDegrees).toBe(fixture.expected.yaw)
    expect(result.lookDirection).toEqual(fixture.expected.look)
    expect(calculateJe26_2ViewVector(result.pitchDegrees, result.yawDegrees)).toEqual(
      result.lookDirection,
    )
  })

  it('preserves the source vertical-look and signed-zero branch behavior', () => {
    const vertical = numericEdgeFixtures.entityLookAt.find(({ name }) => name === 'vertical-up')!
    const eyePosition = vertical.eyePosition!
    const aimPoint = vertical.aimPoint!

    expect(
      deriveJe26_2PlayerAim(
        { x: eyePosition[0], y: eyePosition[1], z: eyePosition[2] },
        { x: aimPoint[0], y: aimPoint[1], z: aimPoint[2] },
      ),
    ).toEqual({
      pitchDegrees: vertical.expected.pitch,
      yawDegrees: vertical.expected.yaw,
      lookDirection: vertical.expected.look,
    })

    const signedZero = numericEdgeFixtures.entityLookAt.find(
      ({ name }) => name === 'signed-zero-horizontal-components',
    )!
    const signedZeroResult = deriveJe26_2PlayerAim(
      { x: 0, y: Math.fround(1.62), z: 0 },
      { x: -0, y: Math.fround(1.62), z: -0 },
    )
    expect(Object.is(signedZeroResult.pitchDegrees, -0)).toBe(true)
    expect(signedZeroResult.yawDegrees).toBe(signedZero.expected.yaw)
    expect(signedZeroResult.lookDirection.x).toBe(signedZero.expected.look.x)
    expect(Object.is(signedZeroResult.lookDirection.y, -0)).toBe(true)
    expect(signedZeroResult.lookDirection.z).toBe(signedZero.expected.look.z)
    expect(Object.is(minecraftAtan2(-0, 1), 0)).toBe(true)
    expect(Object.is(minecraftAtan2(0, -0), 0)).toBe(true)
  })

  it('uses the Float32 Vec3 normalization cutoff with the source strict comparison', () => {
    const { floatCutoff, cases } = numericEdgeFixtures.vec3NormalizeCutoff

    for (const fixture of cases) {
      expect(
        vectorTuple(
          normalizeVec3({ x: fixture.component, y: 0, z: 0 }, javaPrecisionNumerics, floatCutoff),
        ),
        fixture.name,
      ).toEqual(fixture.result)
    }
  })
})

describe('in-game melee endpoint validation for JE 26.2', () => {
  it('contains all 100 completed experiment rows', () => {
    expect(endpointFixtures).toHaveLength(100)
    expect(endpointFixtures.map(({ row }) => row)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1),
    )
  })

  it('keeps Standard-mode endpoints exactly stable', () => {
    for (const fixture of endpointFixtures) {
      const endpoint = endpointFor(fixture, 'standard')

      expect(endpoint.x, `row ${fixture.row} X`).toBe(fixture.standardEndpoint[0])
      expect(endpoint.y, `row ${fixture.row} Y`).toBe(fixture.standardEndpoint[1])
      expect(endpoint.z, `row ${fixture.row} Z`).toBe(fixture.standardEndpoint[2])
    }
  })

  it('matches all observed Java endpoints at full stored precision', () => {
    for (const fixture of endpointFixtures) {
      const endpoint = endpointFor(fixture, 'java')

      expect(endpoint.x, `row ${fixture.row} X`).toBe(fixture.observedEndpoint[0])
      expect(endpoint.y, `row ${fixture.row} Y`).toBe(fixture.observedEndpoint[1])
      expect(endpoint.z, `row ${fixture.row} Z`).toBe(fixture.observedEndpoint[2])
    }
  })

  it.each(extremeFixtures)('locks command and launch intermediates for $testId', (extreme) => {
    const fixture = endpointFixtures[Number(extreme.testId.slice(1)) - 1]!
    const { diagnostic } = createEvaluationInputs(
      fixture,
      Math.fround(je26_2Constants.standingPlayerEyeHeight.value),
    )
    const aim = deriveJe26_2PlayerAim(diagnostic.attackerEyePosition, diagnostic.aimPoint)
    const evaluation = evaluationFor(fixture, 'java')

    expect(vectorTuple(diagnostic.attackerEyePosition)).toEqual(extreme.commandDerived.eyePosition)
    expect(aim.pitchDegrees).toBe(extreme.commandDerived.pitchDegrees)
    expect(aim.yawDegrees).toBe(extreme.commandDerived.yawDegrees)
    expect(vectorTuple(aim.lookDirection)).toEqual(extreme.commandDerived.reconstructedLookVector)
    expect(vectorTuple(evaluation.launchVelocity)).toEqual(extreme.postHitMotion)
    expect(vectorTuple(evaluation.trajectory.endpoint.feetPosition)).toEqual(
      extreme.observedFinalEndpoint,
    )
  })

  it('locks row 44 two-call ordering and repeated-floor diagnostics', () => {
    const evaluation = evaluationFor(endpointFixtures[43]!, 'java')
    const ordered = numericEdgeFixtures.twoCallOrderedMelee
    const floor = numericEdgeFixtures.repeatedUniformFloor

    expect(vectorTuple(evaluation.operationSequence.initialVelocity)).toEqual(
      ordered.initialVelocity,
    )
    expect(
      evaluation.operationSequence.operationResults.map((result) => ({
        existingVelocity: vectorTuple(result.existingVelocity),
        resultingVelocity: vectorTuple(result.resultingVelocity),
      })),
    ).toEqual(
      ordered.operations.map((operation) => ({
        existingVelocity: operation.existingVelocity,
        resultingVelocity: operation.resultingVelocity,
      })),
    )
    expect(vectorTuple(evaluation.operationSequence.resultingVelocity)).toEqual(
      ordered.finalVelocity,
    )

    expect(evaluation.trajectory.status).toBe(floor.status)
    expect(evaluation.trajectory.ticks).toHaveLength(floor.simulatedTickCount)
    expect(evaluation.trajectory.arcCount).toBe(floor.arcCount)
    expect(evaluation.trajectory.airborneContactCount).toBe(floor.airborneContactCount)
    expect(evaluation.trajectory.floorCollisionTickCount).toBe(floor.floorCollisionTickCount)
    expect(evaluation.trajectory.bounceEventCount).toBe(floor.bounceEventCount)
    expect(vectorTuple(evaluation.trajectory.endpoint.feetPosition)).toEqual(
      floor.endpointFeetPosition,
    )
    expect(vectorTuple(evaluation.trajectory.endpoint.velocity)).toEqual(floor.endpointVelocity)
    expect(evaluation.trajectory.endpoint.onGround).toBe(floor.endpointOnGround)
  })
})
