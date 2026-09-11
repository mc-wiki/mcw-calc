import type {
  AttackerGeometry,
  CubeGeometry,
  CubeLaunchProperties,
  CubeMechanicsProperties,
  HorizontalVector,
  KnockbackCall,
  SulfurCubeKnockbackContext,
  TrajectoryAssumptions,
  UniformFloorProfile,
  UniformFloorTrajectoryAssumptions,
  Vec3,
} from '../model/types'
import type { NumericBackend } from '../numerics/types'
import {
  bouncyArchetype,
  je26_2Constants,
  je26_2KnockbackMechanics,
  je26_2UniformFloorProfiles,
} from '../data/je26_2'
import { computeModifiedFriction } from '../model/trajectory'
import { standardNumerics } from '../numerics/standard'

export interface SulfurCubeScenario {
  readonly initialVelocity: Vec3
  readonly call: KnockbackCall
  readonly context: SulfurCubeKnockbackContext
}

export function createAdultSulfurCubeGeometry(
  feetPosition: Vec3,
  numerics: NumericBackend = standardNumerics,
): CubeGeometry {
  const baseDimensions = je26_2Constants.sulfurCubeBaseDimensions.value
  const runtimeSize = numerics.sourceFloat(je26_2Constants.adultSulfurCubeRuntimeSize.value)

  return {
    feetPosition: { ...feetPosition },
    dimensions: {
      width: numerics.sourceFloat(numerics.sourceFloat(baseDimensions.width) * runtimeSize),
      height: numerics.sourceFloat(numerics.sourceFloat(baseDimensions.height) * runtimeSize),
    },
  }
}

export function createSulfurCubeContext(
  attacker: AttackerGeometry,
  cubeFeetPosition: Vec3,
  numerics: NumericBackend = standardNumerics,
  properties: CubeMechanicsProperties = createBouncyCubeLaunchProperties(),
): SulfurCubeKnockbackContext {
  return {
    attacker,
    cube: createAdultSulfurCubeGeometry(cubeFeetPosition, numerics),
    properties: { ...properties },
    mechanics: je26_2KnockbackMechanics,
  }
}

export function createSulfurCubeScenario(
  attacker: AttackerGeometry,
  cubeFeetPosition: Vec3,
  horizontalBaseDirection: HorizontalVector,
  damageArgument: number,
  numerics: NumericBackend = standardNumerics,
  properties: CubeLaunchProperties = createBouncyCubeLaunchProperties(),
): SulfurCubeScenario {
  return {
    initialVelocity: createRestingGroundVelocity(properties, numerics),
    call: {
      damageArgument,
      horizontalBaseDirection: { ...horizontalBaseDirection },
      scaling: { kind: 'ordinaryDamage' },
    },
    context: createSulfurCubeContext(attacker, cubeFeetPosition, numerics, properties),
  }
}

/**
 * Stored DeltaMovement at a normal tick boundary for an absorbed sulfur cube
 * resting on supporting ground. Collision prevents actual downward displacement,
 * but LivingEntity.travelInAir still stores gravity followed by the cube's
 * omnidirectional air drag. See provenance.restingGroundMotion.
 */
export function createRestingGroundVelocity(
  properties: Pick<CubeLaunchProperties, 'airDragModifier'>,
  numerics: NumericBackend = standardNumerics,
): Vec3 {
  const airDrag = computeModifiedFriction(
    je26_2Constants.baseAirDrag.value,
    properties.airDragModifier,
    numerics,
  )

  return {
    x: 0,
    y: -je26_2Constants.defaultGravity.value * airDrag,
    z: 0,
  }
}

export function createBouncyCubeLaunchProperties(): CubeLaunchProperties {
  return {
    horizontalPower: bouncyArchetype.knockbackModifiers.horizontalPower.value,
    verticalPower: bouncyArchetype.knockbackModifiers.verticalPower.value,
    knockbackResistance: bouncyArchetype.effectiveProperties.knockbackResistance.value,
    bounciness: bouncyArchetype.effectiveProperties.bounciness.value,
    airDragModifier: bouncyArchetype.effectiveProperties.airDragModifier.value,
    frictionModifier: bouncyArchetype.effectiveProperties.frictionModifier.value,
  }
}

export function createTrajectoryAssumptions(
  airDragModifier: number,
  numerics: NumericBackend,
): TrajectoryAssumptions {
  return {
    gravity: je26_2Constants.defaultGravity.value,
    drag: computeModifiedFriction(je26_2Constants.baseAirDrag.value, airDragModifier, numerics),
    movementCutoff: je26_2Constants.movementCutoff.value,
  }
}

export function createBouncyTrajectoryAssumptions(numerics: NumericBackend): TrajectoryAssumptions {
  return createTrajectoryAssumptions(
    bouncyArchetype.effectiveProperties.airDragModifier.value,
    numerics,
  )
}

export function createUniformFloorTrajectoryAssumptions(
  floorY: number,
  properties: Pick<CubeLaunchProperties, 'bounciness' | 'airDragModifier' | 'frictionModifier'>,
  floor: UniformFloorProfile = je26_2UniformFloorProfiles.ordinary_full_block,
): UniformFloorTrajectoryAssumptions {
  return {
    gravity: je26_2Constants.defaultGravity.value,
    baseAirDrag: je26_2Constants.baseAirDrag.value,
    movementCutoff: je26_2Constants.movementCutoff.value,
    positionCommitThreshold: je26_2Constants.entityMovementPositionCommitThreshold.value,
    movementBlockSampleOffset: je26_2Constants.movementBlockSampleOffset.value,
    floorY,
    cube: { ...properties },
    floor,
    entitySuppressesBounce: false,
    noActiveExplosiveFuse: true,
  }
}
