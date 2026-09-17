import type { UniformFloorState } from '../model/types'
import type { NumericBackend } from '../numerics/types'
import { describe, expect, it } from 'vitest'
import { je26_3UniformFloorProfiles } from '../data/je26_3'
import {
  advanceUniformFloorState,
  shouldCommitResolvedMovement,
  simulateRepeatedUniformFloorTrajectory,
} from '../model/trajectory'
import { standardNumerics } from '../numerics/standard'
import { createUniformFloorTrajectoryAssumptions } from '../presets/defaults'

const sourceFloatNumerics: NumericBackend = Object.freeze({
  ...standardNumerics,
  id: 'fixture-source-float',
  sourceFloat: Math.fround,
})

interface AcceptedFixture {
  readonly id: string
  readonly cube: readonly [number, number, number, boolean]
  readonly floor: keyof typeof je26_3UniformFloorProfiles
  readonly maximumTicks: number
  readonly status: 'settled' | 'truncated'
  readonly tickCount: number
  readonly airborneContacts: number
  readonly floorCollisions: number
  readonly bounceEvents: number
  readonly maximumFeetY: number
  readonly horizontalDisplacement: number
  readonly endpoint: readonly [number, number, number]
  readonly velocity: readonly [number, number, number]
  readonly onGround: boolean
  readonly initialPosition: readonly [number, number, number]
  readonly initialVelocity: readonly [number, number, number]
  readonly initialOnGround: boolean
}

const acceptedFixtures: readonly AcceptedFixture[] = [
  {
    id: 'bouncy_ordinary_multiple_contacts',
    cube: [0.8999999761581421, 0.30000001192092896, 0.009999999776482582, false],
    floor: 'ordinary_full_block',
    maximumTicks: 120,
    status: 'settled',
    tickCount: 59,
    airborneContacts: 8,
    floorCollisions: 34,
    bounceEvents: 7,
    maximumFeetY: 0.3597481054448251,
    horizontalDisplacement: 5.436280221501688,
    endpoint: [4.866529651407512, 0, -2.4228148502644453],
    velocity: [0, -0.07992800235748292, 0],
    onGround: true,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  {
    id: 'bouncy_slime_block_restitution_wins',
    cube: [0.8999999761581421, 0.30000001192092896, 0.009999999776482582, false],
    floor: 'slime_block',
    maximumTicks: 200,
    status: 'truncated',
    tickCount: 200,
    airborneContacts: 36,
    floorCollisions: 36,
    bounceEvents: 36,
    maximumFeetY: 0.3597481054448251,
    horizontalDisplacement: 17.153725291978542,
    endpoint: [15.342758328088578, 0.1195149516730086, -7.671379164044289],
    velocity: [0.01692602412091166, -0.12004139577591978, -0.00846301206045583],
    onGround: false,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  {
    id: 'bouncy_honey_suppresses_bounce',
    cube: [0.8999999761581421, 0.30000001192092896, 0.009999999776482582, false],
    floor: 'honey_block',
    maximumTicks: 30,
    status: 'settled',
    tickCount: 6,
    airborneContacts: 1,
    floorCollisions: 1,
    bounceEvents: 0,
    maximumFeetY: 0.3597481054448251,
    horizontalDisplacement: 0.3502535129004438,
    endpoint: [0.3141689993186078, 0, -0.15483979839255138],
    velocity: [0, -0.07992800235748292, 0],
    onGround: true,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  {
    id: 'sticky_ordinary_fixed_ground_cycle',
    cube: [0, 2, 0.009999999776482582, false],
    floor: 'ordinary_full_block',
    maximumTicks: 60,
    status: 'settled',
    tickCount: 9,
    airborneContacts: 1,
    floorCollisions: 4,
    bounceEvents: 0,
    maximumFeetY: 0.3597481054448251,
    horizontalDisplacement: 0.49997916473025433,
    endpoint: [0.4471949598681656, 0, -0.2235974799340828],
    velocity: [0, -0.07992800235748292, 0],
    onGround: true,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  {
    id: 'slow_bouncy_ordinary',
    cube: [0.6000000238418579, 0.30000001192092896, 0.05000000074505806, false],
    floor: 'ordinary_full_block',
    maximumTicks: 80,
    status: 'settled',
    tickCount: 42,
    airborneContacts: 3,
    floorCollisions: 33,
    bounceEvents: 2,
    maximumFeetY: 0.3587424378469659,
    horizontalDisplacement: 3.3321497613363555,
    endpoint: [2.9845624167439793, 0, -1.4817588240105977],
    velocity: [0, -0.07964000225067139, 0],
    onGround: true,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  {
    id: 'sliding_ordinary_nonzero_xz',
    cube: [0.10000000149011612, 0.05000000074505806, 0.009999999776482582, false],
    floor: 'ordinary_full_block',
    maximumTicks: 50,
    status: 'truncated',
    tickCount: 50,
    airborneContacts: 1,
    floorCollisions: 45,
    bounceEvents: 1,
    maximumFeetY: 0.3597481054448251,
    horizontalDisplacement: 7.629594149455754,
    endpoint: [6.824116463567102, 0, -3.412058231783551],
    velocity: [0.0770286693098623, -0.07992800235748292, -0.03851433465493115],
    onGround: true,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  {
    id: 'sliding_ice_horizontal',
    cube: [0.10000000149011612, 0.05000000074505806, 0.009999999776482582, false],
    floor: 'ice_0_98',
    maximumTicks: 50,
    status: 'truncated',
    tickCount: 50,
    airborneContacts: 1,
    floorCollisions: 45,
    bounceEvents: 1,
    maximumFeetY: 0.3597481054448251,
    horizontalDisplacement: 10.724676164997659,
    endpoint: [9.592441976642606, 0, -4.796220988321303],
    velocity: [0.1827787451655304, -0.07992800235748292, -0.0913893725827652],
    onGround: true,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  {
    id: 'sliding_soul_sand_speed_factor',
    cube: [0.10000000149011612, 0.05000000074505806, 0.009999999776482582, false],
    floor: 'soul_sand',
    maximumTicks: 50,
    status: 'settled',
    tickCount: 7,
    airborneContacts: 1,
    floorCollisions: 2,
    bounceEvents: 1,
    maximumFeetY: 0.3597481054448251,
    horizontalDisplacement: 0.3646456341665789,
    endpoint: [0.3271427515279724, 0, -0.16107159476286878],
    velocity: [0, -0.07992800235748292, 0],
    onGround: true,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
  ...(
    [
      ['gravity_threshold_below', -0.079999999, 1, 0, 1],
      ['gravity_threshold_exact', -0.08, 1, 0, 1],
      ['gravity_threshold_above', -0.080000001, 3, 1, 2],
    ] as const
  ).map(
    ([id, initialY, tickCount, airborneContacts, floorCollisions]): AcceptedFixture => ({
      id,
      cube: [1, 0.30000001192092896, 1.7999999523162842, false],
      floor: 'ordinary_full_block',
      maximumTicks: 3,
      status: 'settled',
      tickCount,
      airborneContacts,
      floorCollisions,
      bounceEvents: id === 'gravity_threshold_above' ? 1 : 0,
      maximumFeetY: 0,
      horizontalDisplacement: 0,
      endpoint: [0, 0, 0],
      velocity: [0, -0.06704000473022462, 0],
      onGround: true,
      initialPosition: [0, 0, 0],
      initialVelocity: [0, initialY, 0],
      initialOnGround: true,
    }),
  ),
  ...(
    [
      ['movement_cutoff_below', 0.002999999999, 0, 0],
      ['movement_cutoff_exact', 0.003, 0.003, 0.004242640687119286],
      ['movement_cutoff_above', 0.003000000001, 0.003000000001, 0.004242640688533499],
    ] as const
  ).map(
    ([id, component, maximumFeetY, horizontalDisplacement]): AcceptedFixture => ({
      id,
      cube: [0.8999999761581421, 0.30000001192092896, 0.009999999776482582, false],
      floor: 'ordinary_full_block',
      maximumTicks: 4,
      status: 'settled',
      tickCount: 2,
      airborneContacts: 1,
      floorCollisions: 1,
      bounceEvents: 0,
      maximumFeetY,
      horizontalDisplacement,
      endpoint: maximumFeetY === 0 ? [0, 0, 0] : [component, 0, -component],
      velocity: [0, -0.07992800235748292, 0],
      onGround: true,
      initialPosition: [0, 0, 0],
      initialVelocity: [component, component, -component],
      initialOnGround: true,
    }),
  ),
  {
    id: 'exact_geometric_touch_then_clip',
    cube: [0.8999999761581421, 0.30000001192092896, 0.009999999776482582, false],
    floor: 'ordinary_full_block',
    maximumTicks: 4,
    status: 'truncated',
    tickCount: 4,
    airborneContacts: 1,
    floorCollisions: 1,
    bounceEvents: 1,
    maximumFeetY: 0.1,
    horizontalDisplacement: 0.21661501098909874,
    endpoint: [0.1937463558073955, 0.0817805341179166, -0.09687317790369775],
    velocity: [0.04384181900308438, -0.07992800235748292, -0.02192090950154219],
    onGround: false,
    initialPosition: [0, 0.1, 0],
    initialVelocity: [0.05, -0.1, -0.025],
    initialOnGround: false,
  },
  {
    id: 'combined_existing_and_added_velocity',
    cube: [0.8999999761581421, 0.30000001192092896, 0.009999999776482582, false],
    floor: 'ordinary_full_block',
    maximumTicks: 80,
    status: 'truncated',
    tickCount: 80,
    airborneContacts: 8,
    floorCollisions: 8,
    bounceEvents: 8,
    maximumFeetY: 1.8145918062841524,
    horizontalDisplacement: 19.657499946243608,
    endpoint: [17.06748951963793, 0.21668717239918872, -9.75285115407883],
    velocity: [0.10306942346976203, -0.08770893945955315, -0.058896813411292624],
    onGround: false,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.35, 0.5, -0.2],
    initialOnGround: true,
  },
  {
    id: 'valid_custom_perpetual_bounce_bounded',
    cube: [1, 0, 0, false],
    floor: 'slime_block',
    maximumTicks: 100,
    status: 'truncated',
    tickCount: 100,
    airborneContacts: 14,
    floorCollisions: 14,
    bounceEvents: 14,
    maximumFeetY: 0.36,
    horizontalDisplacement: 22.360679774997855,
    endpoint: [19.99999999999996, 0.32, -9.99999999999998],
    velocity: [0.2, 0.04000000000000001, -0.1],
    onGround: false,
    initialPosition: [0, 0, 0],
    initialVelocity: [0.2, 0.2, -0.1],
    initialOnGround: true,
  },
]

function expectVectorClose(
  actual: { readonly x: number; readonly y: number; readonly z: number },
  expected: readonly [number, number, number],
): void {
  expect(actual.x).toBeCloseTo(expected[0], 9)
  expect(actual.y).toBeCloseTo(expected[1], 9)
  expect(actual.z).toBeCloseTo(expected[2], 9)
}

describe('entity movement position-commit gate', () => {
  it('uses strict resolved-length and removed-length comparisons', () => {
    expect(
      shouldCommitResolvedMovement({ x: 2, y: 0, z: 0 }, { x: Math.sqrt(0.5), y: 0, z: 0 }, 1),
    ).toBe(false)
    expect(shouldCommitResolvedMovement({ x: 2, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 1)).toBe(false)
    expect(
      shouldCommitResolvedMovement({ x: 2, y: 0, z: 0 }, { x: Math.sqrt(2), y: 0, z: 0 }, 1),
    ).toBe(true)

    expect(
      shouldCommitResolvedMovement({ x: Math.sqrt(0.5), y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1),
    ).toBe(true)
    expect(shouldCommitResolvedMovement({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1)).toBe(false)
    expect(
      shouldCommitResolvedMovement({ x: Math.sqrt(2), y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1),
    ).toBe(false)
  })

  it('retains position while continuing collision and fixed-point processing', () => {
    const feetY = 0.000286935569256741
    const assumptions = createUniformFloorTrajectoryAssumptions(0, {
      bounciness: 0,
      frictionModifier: 1,
      airDragModifier: 1,
    })
    const initialState: UniformFloorState = {
      tick: 0,
      feetPosition: { x: 0, y: feetY, z: 0 },
      velocity: { x: 0, y: -0.01, z: 0 },
      onGround: false,
      supportingFloor: false,
    }
    const tick = advanceUniformFloorState(initialState, assumptions, sourceFloatNumerics)

    expect(tick.appliedMovement.y).toBeCloseTo(-feetY, 15)
    expect(tick.commitsPosition).toBe(false)
    expect(tick.collision).toMatchObject({
      floorCollision: true,
      verticalCollision: true,
      verticalCollisionBelow: true,
    })
    expect(tick.end.feetPosition).toEqual(initialState.feetPosition)
    expect(tick.end.onGround).toBe(true)
    expect(tick.end.velocity.y).toBeLessThan(0)

    const trajectory = simulateRepeatedUniformFloorTrajectory(
      initialState,
      2,
      assumptions,
      sourceFloatNumerics,
    )
    expect(trajectory.status).toBe('settled')
    expect(trajectory.ticks).toHaveLength(1)
    expect(trajectory.endpoint.feetPosition).toEqual(initialState.feetPosition)
  })
})

describe('repeated uniform-floor trajectory for JE 26.3', () => {
  it.each(acceptedFixtures)('matches the accepted $id summary fixture', (fixture) => {
    const [bounciness, frictionModifier, airDragModifier, entitySuppressesBounce] = fixture.cube
    const initialState: UniformFloorState = {
      tick: 0,
      feetPosition: {
        x: fixture.initialPosition[0],
        y: fixture.initialPosition[1],
        z: fixture.initialPosition[2],
      },
      velocity: {
        x: fixture.initialVelocity[0],
        y: fixture.initialVelocity[1],
        z: fixture.initialVelocity[2],
      },
      onGround: fixture.initialOnGround,
      supportingFloor: fixture.initialOnGround,
    }
    const assumptions = {
      ...createUniformFloorTrajectoryAssumptions(
        0,
        { bounciness, frictionModifier, airDragModifier },
        je26_3UniformFloorProfiles[fixture.floor],
      ),
      entitySuppressesBounce,
    }
    const result = simulateRepeatedUniformFloorTrajectory(
      initialState,
      fixture.maximumTicks,
      assumptions,
      sourceFloatNumerics,
    )

    expect(result.status).toBe(fixture.status)
    expect(result.ticks).toHaveLength(fixture.tickCount)
    expect(result.airborneContactCount).toBe(fixture.airborneContacts)
    expect(result.floorCollisionTickCount).toBe(fixture.floorCollisions)
    expect(result.bounceEventCount).toBe(fixture.bounceEvents)
    expect(result.maximumDiscreteFeetY).toBeCloseTo(fixture.maximumFeetY, 9)
    expect(result.horizontalDisplacement).toBeCloseTo(fixture.horizontalDisplacement, 9)
    expectVectorClose(result.endpoint.feetPosition, fixture.endpoint)
    expectVectorClose(result.endpoint.velocity, fixture.velocity)
    expect(result.endpoint.onGround).toBe(fixture.onGround)
  })

  it('keeps exact geometric equality distinct from a clipped collision', () => {
    const fixture = acceptedFixtures.find(({ id }) => id === 'exact_geometric_touch_then_clip')!
    const assumptions = createUniformFloorTrajectoryAssumptions(0, {
      bounciness: fixture.cube[0],
      frictionModifier: fixture.cube[1],
      airDragModifier: fixture.cube[2],
    })
    const result = simulateRepeatedUniformFloorTrajectory(
      {
        tick: 0,
        feetPosition: { x: 0, y: 0.1, z: 0 },
        velocity: { x: 0.05, y: -0.1, z: -0.025 },
        onGround: false,
        supportingFloor: false,
      },
      2,
      assumptions,
      sourceFloatNumerics,
    )

    expect(result.ticks[0]?.collision).toMatchObject({
      geometricTouch: true,
      floorCollision: false,
    })
    expect(result.ticks[1]?.collision).toMatchObject({
      geometricTouch: false,
      floorCollision: true,
    })
  })

  it('uses floor friction on the tick immediately following a rebound', () => {
    const assumptions = createUniformFloorTrajectoryAssumptions(0, {
      bounciness: 0.9,
      frictionModifier: 0.3,
      airDragModifier: 0.01,
    })
    const collision = advanceUniformFloorState(
      {
        tick: 0,
        feetPosition: { x: 0, y: 0.01, z: 0 },
        velocity: { x: 0.2, y: -0.2, z: 0 },
        onGround: false,
        supportingFloor: false,
      },
      assumptions,
      sourceFloatNumerics,
    )
    const takeoff = advanceUniformFloorState(collision.end, assumptions, sourceFloatNumerics)

    expect(collision.end.onGround).toBe(true)
    expect(collision.end.velocity.y).toBeGreaterThan(0)
    expect(takeoff.startGroundFriction).toBeLessThan(1)
    expect(takeoff.end.onGround).toBe(false)
  })

  it('does not mistake the former 200-tick UI horizon for Bouncy-on-slime settlement', () => {
    const assumptions = createUniformFloorTrajectoryAssumptions(
      0,
      {
        bounciness: 0.8999999761581421,
        frictionModifier: 0.30000001192092896,
        airDragModifier: 0.009999999776482582,
      },
      je26_3UniformFloorProfiles.slime_block,
    )
    const initialState: UniformFloorState = {
      tick: 0,
      feetPosition: { x: 0, y: 0, z: 0 },
      velocity: { x: 0.2, y: 0.2, z: -0.1 },
      onGround: true,
      supportingFloor: true,
    }

    expect(
      simulateRepeatedUniformFloorTrajectory(initialState, 200, assumptions, sourceFloatNumerics)
        .status,
    ).toBe('truncated')

    const settled = simulateRepeatedUniformFloorTrajectory(
      initialState,
      300,
      assumptions,
      sourceFloatNumerics,
    )

    expect(settled.status).toBe('settled')
    expect(settled.ticks).toHaveLength(260)
  })
})
