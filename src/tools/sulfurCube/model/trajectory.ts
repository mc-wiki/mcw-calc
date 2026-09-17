import type { NumericBackend } from '../numerics/types'
import type {
  BounceSuppressionReason,
  FlatFloorContact,
  FlatFloorTrajectoryAssumptions,
  FlatFloorTrajectoryResult,
  FlatFloorTrajectoryTick,
  TrajectoryAssumptions,
  TrajectoryResult,
  TrajectoryTick,
  UniformFloorState,
  UniformFloorTick,
  UniformFloorTrajectoryAssumptions,
  UniformFloorTrajectoryResult,
  Vec3,
} from './types'
import { addVec3 } from './vectors'

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function cutMovementComponent(value: number, cutoff: number): number {
  return Math.abs(value) < cutoff ? 0 : value
}

function squaredLength(vector: Vec3): number {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z
}

export function shouldCommitResolvedMovement(
  requestedMovement: Vec3,
  resolvedMovement: Vec3,
  threshold: number,
): boolean {
  const requestedLengthSquared = squaredLength(requestedMovement)
  const resolvedLengthSquared = squaredLength(resolvedMovement)

  return (
    resolvedLengthSquared > threshold || requestedLengthSquared - resolvedLengthSquared < threshold
  )
}

export function computeModifiedFriction(
  friction: number,
  modifier: number,
  numerics: NumericBackend,
): number {
  assertFiniteNumber(friction, 'friction')
  assertFiniteNumber(modifier, 'modifier')

  const sourceFriction = numerics.sourceFloat(friction)
  const sourceModifier = numerics.sourceFloat(modifier)
  const difference = numerics.sourceFloat(1 - sourceFriction)
  const scaledDifference = numerics.sourceFloat(difference * sourceModifier)
  const modified = numerics.sourceFloat(1 - scaledDifference)

  return numerics.sourceFloat(numerics.clamp(modified, 0, 1))
}

export function simulateFreeFlightTrajectory(
  initialPosition: Vec3,
  initialVelocity: Vec3,
  tickCount: number,
  assumptions: TrajectoryAssumptions,
): TrajectoryResult {
  if (!Number.isInteger(tickCount) || tickCount < 0) {
    throw new RangeError('tickCount must be a nonnegative integer')
  }

  for (const [name, value] of Object.entries({
    initialPositionX: initialPosition.x,
    initialPositionY: initialPosition.y,
    initialPositionZ: initialPosition.z,
    initialVelocityX: initialVelocity.x,
    initialVelocityY: initialVelocity.y,
    initialVelocityZ: initialVelocity.z,
    gravity: assumptions.gravity,
    drag: assumptions.drag,
    movementCutoff: assumptions.movementCutoff,
  })) {
    assertFiniteNumber(value, name)
  }

  if (assumptions.movementCutoff < 0) {
    throw new RangeError('movementCutoff must not be negative')
  }

  let position = { ...initialPosition }
  let velocity = { ...initialVelocity }
  const ticks: TrajectoryTick[] = []

  for (let index = 0; index < tickCount; index += 1) {
    const startingPosition = { ...position }
    const startingVelocity = { ...velocity }
    const effectiveVelocity = {
      x: cutMovementComponent(velocity.x, assumptions.movementCutoff),
      y: cutMovementComponent(velocity.y, assumptions.movementCutoff),
      z: cutMovementComponent(velocity.z, assumptions.movementCutoff),
    }
    position = addVec3(position, effectiveVelocity)
    velocity = {
      x: effectiveVelocity.x * assumptions.drag,
      y: (effectiveVelocity.y - assumptions.gravity) * assumptions.drag,
      z: effectiveVelocity.z * assumptions.drag,
    }
    ticks.push({
      tick: index + 1,
      startingPosition,
      startingVelocity,
      effectiveVelocity,
      resultingPosition: { ...position },
      resultingVelocity: { ...velocity },
    })
  }

  return {
    initialPosition: { ...initialPosition },
    initialVelocity: { ...initialVelocity },
    assumptions: { ...assumptions },
    ticks,
    resultingPosition: { ...position },
    resultingVelocity: { ...velocity },
  }
}

function horizontalDistanceBetween(first: Vec3, second: Vec3): number {
  return Math.hypot(second.x - first.x, second.z - first.z)
}

function createImmediateFloorContact(
  initialPosition: Vec3,
  initialVelocity: Vec3,
  assumptions: FlatFloorTrajectoryAssumptions,
): FlatFloorTrajectoryResult {
  const effectiveVelocity = {
    x: cutMovementComponent(initialVelocity.x, assumptions.movementCutoff),
    y: cutMovementComponent(initialVelocity.y, assumptions.movementCutoff),
    z: cutMovementComponent(initialVelocity.z, assumptions.movementCutoff),
  }
  const zeroMovement = { x: 0, y: 0, z: 0 }
  const contact: FlatFloorContact = {
    tick: 0,
    position: { ...initialPosition },
    horizontalDistance: 0,
    maximumFeetY: initialPosition.y,
    effectiveVelocity,
    appliedMovement: zeroMovement,
    verticalMovementFraction: 0,
  }

  return {
    initialPosition: { ...initialPosition },
    initialVelocity: { ...initialVelocity },
    assumptions: { ...assumptions },
    ticks: [],
    resultingPosition: { ...initialPosition },
    resultingVelocity: null,
    contact,
    horizontalDistance: 0,
    maximumFeetY: initialPosition.y,
  }
}

/**
 * Simulates the source-audited first flight arc above an infinite level floor.
 * The first update begins with onGround=true, so its horizontal post-move
 * velocity uses floor friction. The result stops at first return and deliberately
 * omits post-contact rebound.
 */
export function simulateFlatFloorFirstContactTrajectory(
  initialPosition: Vec3,
  initialVelocity: Vec3,
  maximumTickCount: number,
  assumptions: FlatFloorTrajectoryAssumptions,
): FlatFloorTrajectoryResult {
  if (!Number.isInteger(maximumTickCount) || maximumTickCount < 0) {
    throw new RangeError('maximumTickCount must be a nonnegative integer')
  }

  for (const [name, value] of Object.entries({
    initialPositionX: initialPosition.x,
    initialPositionY: initialPosition.y,
    initialPositionZ: initialPosition.z,
    initialVelocityX: initialVelocity.x,
    initialVelocityY: initialVelocity.y,
    initialVelocityZ: initialVelocity.z,
    gravity: assumptions.gravity,
    drag: assumptions.drag,
    movementCutoff: assumptions.movementCutoff,
    floorY: assumptions.floorY,
    floorBlockFriction: assumptions.floorBlockFriction,
    entityFrictionModifier: assumptions.entityFrictionModifier,
    initialGroundHorizontalFactor: assumptions.initialGroundHorizontalFactor,
  })) {
    assertFiniteNumber(value, name)
  }

  if (assumptions.movementCutoff < 0) {
    throw new RangeError('movementCutoff must not be negative')
  }
  if (initialPosition.y !== assumptions.floorY) {
    throw new RangeError('initialPosition.y must equal assumptions.floorY')
  }

  const initialEffectiveY = cutMovementComponent(initialVelocity.y, assumptions.movementCutoff)

  if (initialEffectiveY <= 0) {
    return createImmediateFloorContact(initialPosition, initialVelocity, assumptions)
  }

  let position = { ...initialPosition }
  let velocity = { ...initialVelocity }
  let maximumFeetY = initialPosition.y
  let contact: FlatFloorContact | null = null
  const ticks: FlatFloorTrajectoryTick[] = []

  for (let index = 0; index < maximumTickCount; index += 1) {
    const startingPosition = { ...position }
    const startingVelocity = { ...velocity }
    const effectiveVelocity = {
      x: cutMovementComponent(velocity.x, assumptions.movementCutoff),
      y: cutMovementComponent(velocity.y, assumptions.movementCutoff),
      z: cutMovementComponent(velocity.z, assumptions.movementCutoff),
    }
    const touchesFloor =
      effectiveVelocity.y < 0 && position.y + effectiveVelocity.y <= assumptions.floorY
    const appliedMovement = {
      x: effectiveVelocity.x,
      y: touchesFloor ? assumptions.floorY - position.y : effectiveVelocity.y,
      z: effectiveVelocity.z,
    }
    position = addVec3(position, appliedMovement)
    maximumFeetY = Math.max(maximumFeetY, position.y)

    if (touchesFloor) {
      const horizontalDistance = horizontalDistanceBetween(initialPosition, position)
      const verticalMovementFraction =
        effectiveVelocity.y === 0 ? 0 : appliedMovement.y / effectiveVelocity.y

      contact = {
        tick: index + 1,
        position: { ...position },
        horizontalDistance,
        maximumFeetY,
        effectiveVelocity,
        appliedMovement,
        verticalMovementFraction,
      }
      ticks.push({
        tick: index + 1,
        startingPosition,
        startingVelocity,
        effectiveVelocity,
        appliedMovement,
        resultingPosition: { ...position },
        resultingVelocity: null,
        firstFloorContact: true,
      })
      break
    }

    const horizontalFactor =
      index === 0 ? assumptions.initialGroundHorizontalFactor : assumptions.drag
    velocity = {
      x: effectiveVelocity.x * horizontalFactor,
      y: (effectiveVelocity.y - assumptions.gravity) * assumptions.drag,
      z: effectiveVelocity.z * horizontalFactor,
    }
    ticks.push({
      tick: index + 1,
      startingPosition,
      startingVelocity,
      effectiveVelocity,
      appliedMovement,
      resultingPosition: { ...position },
      resultingVelocity: { ...velocity },
      firstFloorContact: false,
    })
  }

  return {
    initialPosition: { ...initialPosition },
    initialVelocity: { ...initialVelocity },
    assumptions: { ...assumptions },
    ticks,
    resultingPosition: { ...position },
    resultingVelocity: contact === null ? { ...velocity } : null,
    contact,
    horizontalDistance: horizontalDistanceBetween(initialPosition, position),
    maximumFeetY,
  }
}

function assertUniformFloorAssumptions(
  state: UniformFloorState,
  assumptions: UniformFloorTrajectoryAssumptions,
): void {
  for (const [name, value] of Object.entries({
    tick: state.tick,
    feetPositionX: state.feetPosition.x,
    feetPositionY: state.feetPosition.y,
    feetPositionZ: state.feetPosition.z,
    velocityX: state.velocity.x,
    velocityY: state.velocity.y,
    velocityZ: state.velocity.z,
    gravity: assumptions.gravity,
    baseAirDrag: assumptions.baseAirDrag,
    movementCutoff: assumptions.movementCutoff,
    positionCommitThreshold: assumptions.positionCommitThreshold,
    movementBlockSampleOffset: assumptions.movementBlockSampleOffset,
    floorY: assumptions.floorY,
    cubeBounciness: assumptions.cube.bounciness,
    cubeAirDragModifier: assumptions.cube.airDragModifier,
    cubeFrictionModifier: assumptions.cube.frictionModifier,
    floorSurfaceHeight: assumptions.floor.surfaceHeightWithinBlock,
    floorFriction: assumptions.floor.friction,
    floorBounceRestitution: assumptions.floor.bounceRestitution,
    floorSpeedFactor: assumptions.floor.speedFactor,
  })) {
    assertFiniteNumber(value, name)
  }

  if (!Number.isInteger(state.tick) || state.tick < 0) {
    throw new RangeError('state.tick must be a nonnegative integer')
  }
  if (assumptions.movementCutoff < 0) {
    throw new RangeError('movementCutoff must not be negative')
  }
  if (assumptions.positionCommitThreshold < 0) {
    throw new RangeError('positionCommitThreshold must not be negative')
  }
  if (assumptions.gravity < 0) {
    throw new RangeError('gravity must not be negative')
  }
  if (assumptions.cube.bounciness < 0 || assumptions.cube.bounciness > 1) {
    throw new RangeError('cube.bounciness must be between 0 and 1')
  }
  if (assumptions.floor.bounceRestitution < 0 || assumptions.floor.bounceRestitution > 1) {
    throw new RangeError('floor.bounceRestitution must be between 0 and 1')
  }
  if (assumptions.floor.surfaceHeightWithinBlock < 0) {
    throw new RangeError('floor.surfaceHeightWithinBlock must not be negative')
  }
}

function bounceSuppressionReason(
  effectiveVerticalVelocity: number,
  assumptions: UniformFloorTrajectoryAssumptions,
  effectiveRestitution: number,
): BounceSuppressionReason | null {
  if (-effectiveVerticalVelocity <= assumptions.gravity) {
    return 'belowGravityThreshold'
  }
  if (assumptions.entitySuppressesBounce) {
    return 'entitySuppressesBounce'
  }
  if (assumptions.floor.suppressesBounce) {
    return 'floorSuppressesBounce'
  }
  if (effectiveRestitution === 0) {
    return 'zeroEffectiveRestitution'
  }

  return null
}

function usesEndingFloorSpeedFactor(
  endFeetY: number,
  endOnGround: boolean,
  assumptions: UniformFloorTrajectoryAssumptions,
): boolean {
  if (assumptions.floor.speedFactor === 1) {
    return false
  }

  const influenceHeight =
    assumptions.movementBlockSampleOffset + 1 - assumptions.floor.surfaceHeightWithinBlock

  return endOnGround || endFeetY - assumptions.floorY < influenceHeight
}

/**
 * Advances one JE 26.3 movement tick over an infinite, uniform horizontal floor.
 * The optional numbering fields are presentation diagnostics supplied by the
 * trajectory wrapper; they do not affect the transition.
 */
export function advanceUniformFloorState(
  state: UniformFloorState,
  assumptions: UniformFloorTrajectoryAssumptions,
  numerics: NumericBackend,
  arcNumber: number | null = null,
  airborneContactNumber: number | null = null,
): UniformFloorTick {
  assertUniformFloorAssumptions(state, assumptions)

  const effectiveVelocity = {
    x: cutMovementComponent(state.velocity.x, assumptions.movementCutoff),
    y: cutMovementComponent(state.velocity.y, assumptions.movementCutoff),
    z: cutMovementComponent(state.velocity.z, assumptions.movementCutoff),
  }
  const airDrag = computeModifiedFriction(
    assumptions.baseAirDrag,
    assumptions.cube.airDragModifier,
    numerics,
  )
  const startGroundFriction = state.onGround
    ? computeModifiedFriction(
        assumptions.floor.friction,
        assumptions.cube.frictionModifier,
        numerics,
      )
    : numerics.sourceFloat(1)
  const horizontalTravelFactor = numerics.sourceFloat(startGroundFriction * airDrag)
  const requestedEndY = state.feetPosition.y + effectiveVelocity.y
  const floorCollision = effectiveVelocity.y < 0 && requestedEndY < assumptions.floorY
  const geometricTouch =
    effectiveVelocity.y < 0 && !floorCollision && requestedEndY === assumptions.floorY
  const appliedMovement = {
    x: effectiveVelocity.x,
    y: floorCollision ? assumptions.floorY - state.feetPosition.y : effectiveVelocity.y,
    z: effectiveVelocity.z,
  }
  const commitsPosition = shouldCommitResolvedMovement(
    effectiveVelocity,
    appliedMovement,
    assumptions.positionCommitThreshold,
  )
  const endFeetPosition = commitsPosition
    ? addVec3(state.feetPosition, appliedMovement)
    : { ...state.feetPosition }
  const verticalMovementFraction = floorCollision ? appliedMovement.y / effectiveVelocity.y : null
  const eligible =
    floorCollision &&
    -effectiveVelocity.y > assumptions.gravity &&
    !assumptions.entitySuppressesBounce &&
    !assumptions.floor.suppressesBounce
  const restitution = eligible
    ? Math.max(assumptions.cube.bounciness, assumptions.floor.bounceRestitution)
    : 0
  const partialContactDrag =
    floorCollision && restitution > 0 && verticalMovementFraction !== null
      ? 1 + verticalMovementFraction * (airDrag - 1)
      : null
  const postCollisionVerticalVelocity = floorCollision
    ? restitution > 0 && partialContactDrag !== null && verticalMovementFraction !== null
      ? (verticalMovementFraction * assumptions.gravity - effectiveVelocity.y) *
        partialContactDrag *
        restitution
      : 0
    : effectiveVelocity.y
  const endOnGround = floorCollision
  const endBlockSpeedFactor = usesEndingFloorSpeedFactor(
    endFeetPosition.y,
    endOnGround,
    assumptions,
  )
    ? assumptions.floor.speedFactor
    : 1
  let resultingVelocity = {
    x: effectiveVelocity.x * endBlockSpeedFactor * horizontalTravelFactor,
    y: (postCollisionVerticalVelocity - assumptions.gravity) * airDrag,
    z: effectiveVelocity.z * endBlockSpeedFactor * horizontalTravelFactor,
  }
  let afterTravelHorizontalScale: number | null = null

  if (
    assumptions.floor.afterTravel === 'slimeStepOn' &&
    endOnGround &&
    Math.abs(resultingVelocity.y) < 0.1 &&
    !assumptions.entitySuppressesBounce
  ) {
    afterTravelHorizontalScale = 0.4 + Math.abs(resultingVelocity.y) * 0.2
    resultingVelocity = {
      ...resultingVelocity,
      x: resultingVelocity.x * afterTravelHorizontalScale,
      z: resultingVelocity.z * afterTravelHorizontalScale,
    }
  }

  const suppressionReason = floorCollision
    ? bounceSuppressionReason(effectiveVelocity.y, assumptions, restitution)
    : null
  const end: UniformFloorState = {
    tick: state.tick + 1,
    feetPosition: endFeetPosition,
    velocity: resultingVelocity,
    onGround: endOnGround,
    supportingFloor: endOnGround,
  }

  return {
    start: {
      ...state,
      feetPosition: { ...state.feetPosition },
      velocity: { ...state.velocity },
    },
    effectiveVelocity,
    startGroundFriction,
    airDrag,
    horizontalTravelFactor,
    appliedMovement,
    commitsPosition,
    endBlockSpeedFactor,
    collision: {
      geometricTouch,
      floorCollision,
      verticalCollision: floorCollision,
      verticalCollisionBelow: floorCollision,
      verticalMovementFraction,
    },
    rebound: {
      eligible,
      restitution,
      partialContactDrag,
      postCollisionVerticalVelocity,
      suppressionReason,
      emittedBounceEvent: floorCollision && restitution > 0,
      willVisiblyTakeOffNextTick:
        floorCollision && resultingVelocity.y >= assumptions.movementCutoff,
    },
    afterTravelHorizontalScale,
    end,
    arcNumber,
    airborneContactNumber,
  }
}

function sameUniformFloorState(first: UniformFloorState, second: UniformFloorState): boolean {
  return (
    first.feetPosition.x === second.feetPosition.x &&
    first.feetPosition.y === second.feetPosition.y &&
    first.feetPosition.z === second.feetPosition.z &&
    first.velocity.x === second.velocity.x &&
    first.velocity.y === second.velocity.y &&
    first.velocity.z === second.velocity.z &&
    first.onGround === second.onGround &&
    first.supportingFloor === second.supportingFloor
  )
}

/**
 * Simulates repeated arcs until the state is a deterministic fixed point or
 * the required safety horizon is reached.
 */
export function simulateRepeatedUniformFloorTrajectory(
  initialState: UniformFloorState,
  maximumTickCount: number,
  assumptions: UniformFloorTrajectoryAssumptions,
  numerics: NumericBackend,
): UniformFloorTrajectoryResult {
  if (!Number.isInteger(maximumTickCount) || maximumTickCount < 0) {
    throw new RangeError('maximumTickCount must be a nonnegative integer')
  }
  if (initialState.feetPosition.y < assumptions.floorY) {
    throw new RangeError('initial state must not begin below the uniform floor')
  }

  assertUniformFloorAssumptions(initialState, assumptions)

  let state: UniformFloorState = {
    ...initialState,
    feetPosition: { ...initialState.feetPosition },
    velocity: { ...initialState.velocity },
  }
  let currentArc: number | null = initialState.feetPosition.y > assumptions.floorY ? 1 : null
  let arcCount = currentArc ?? 0
  let airborneContactCount = 0
  let floorCollisionTickCount = 0
  let bounceEventCount = 0
  let maximumDiscreteFeetY = initialState.feetPosition.y
  let firstGeometricTouch: UniformFloorTick | null = null
  let firstFloorCollision: UniformFloorTick | null = null
  let status: UniformFloorTrajectoryResult['status'] = 'truncated'
  const ticks: UniformFloorTick[] = []

  for (let index = 0; index < maximumTickCount; index += 1) {
    const effectiveVerticalVelocity = cutMovementComponent(
      state.velocity.y,
      assumptions.movementCutoff,
    )

    if (
      currentArc === null &&
      state.feetPosition.y === assumptions.floorY &&
      effectiveVerticalVelocity > 0
    ) {
      arcCount += 1
      currentArc = arcCount
    }

    const provisionalTick = advanceUniformFloorState(state, assumptions, numerics, currentArc, null)
    const isAirborneContact =
      provisionalTick.collision.floorCollision && !provisionalTick.start.onGround

    if (isAirborneContact) {
      airborneContactCount += 1
    }

    const tick: UniformFloorTick = {
      ...provisionalTick,
      airborneContactNumber: isAirborneContact ? airborneContactCount : null,
    }

    ticks.push(tick)
    maximumDiscreteFeetY = Math.max(maximumDiscreteFeetY, tick.end.feetPosition.y)

    if (tick.collision.geometricTouch && firstGeometricTouch === null) {
      firstGeometricTouch = tick
    }
    if (tick.collision.floorCollision) {
      floorCollisionTickCount += 1
      firstFloorCollision ??= tick
      currentArc = null
    }
    if (tick.rebound.emittedBounceEvent) {
      bounceEventCount += 1
    }

    state = tick.end

    const lookahead = advanceUniformFloorState(state, assumptions, numerics)
    if (sameUniformFloorState(state, lookahead.end)) {
      status = 'settled'
      break
    }
  }

  return {
    initialState: {
      ...initialState,
      feetPosition: { ...initialState.feetPosition },
      velocity: { ...initialState.velocity },
    },
    assumptions,
    ticks,
    status,
    endpoint: state,
    firstGeometricTouch,
    firstFloorCollision,
    airborneContactCount,
    floorCollisionTickCount,
    bounceEventCount,
    arcCount,
    horizontalDisplacement: horizontalDistanceBetween(
      initialState.feetPosition,
      state.feetPosition,
    ),
    maximumDiscreteFeetY,
    requestedMaximumTicks: maximumTickCount,
  }
}
