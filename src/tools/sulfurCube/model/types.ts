export interface Vec2 {
  readonly x: number
  readonly y: number
}

export interface Vec3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** A vector in Minecraft's world-horizontal X/Z plane. */
export interface HorizontalVector {
  readonly x: number
  readonly z: number
}

export interface EntityDimensions {
  readonly width: number
  readonly height: number
}

export interface AttackerGeometry {
  readonly feetPosition: Vec3
  readonly eyePosition: Vec3
  readonly lookDirection: Vec3
}

export interface CubeGeometry {
  readonly feetPosition: Vec3
  readonly dimensions: EntityDimensions
}

export interface CubeDerivedGeometry {
  readonly center: Vec3
  readonly top: Vec3
  readonly bottom: Vec3
}

export interface CubeMechanicsProperties {
  readonly horizontalPower: number
  readonly verticalPower: number
  readonly knockbackResistance: number
}

export interface CubeMotionProperties {
  readonly bounciness: number
  readonly airDragModifier: number
  readonly frictionModifier: number
}

export interface CubeLaunchProperties extends CubeMechanicsProperties, CubeMotionProperties {}

export interface SulfurCubeMechanicsParameters {
  readonly horizontalHitAngleScale: number
  readonly verticalHitAngleScale: number
  readonly verticalPositionAngleScale: number
  readonly horizontalResultScale: number
  readonly verticalResultScale: number
  readonly resultClampMinimum: number
  readonly resultClampMaximum: number
  readonly vectorNormalizationThreshold: number
}

export type KnockbackCallScaling =
  | { readonly kind: 'ordinaryDamage' }
  | { readonly kind: 'extraKnockbackEffect'; readonly powerArgument: number }

export interface KnockbackCall {
  /** The damage value passed into this particular knockback call. */
  readonly damageArgument: number
  readonly horizontalBaseDirection: HorizontalVector
  readonly scaling: KnockbackCallScaling
}

export interface SulfurCubeKnockbackContext {
  readonly attacker: AttackerGeometry
  readonly cube: CubeGeometry
  readonly properties: CubeMechanicsProperties
  readonly mechanics: SulfurCubeMechanicsParameters
}

export interface KnockbackCallInputSnapshot {
  readonly existingVelocity: Vec3
  readonly call: KnockbackCall
  readonly context: SulfurCubeKnockbackContext
}

export interface KnockbackCallDiagnostics {
  readonly cubeCenter: Vec3
  readonly cubeTop: Vec3
  readonly cubeBottom: Vec3
  readonly normalizedLookDirection: Vec3
  readonly eyeToCenterDirection: Vec3
  readonly eyeToTopDirection: Vec3
  readonly eyeToBottomDirection: Vec3
  readonly horizontalCross: number
  readonly horizontalDot: number
  readonly horizontalAngleDelta: number
  readonly horizontalRotationAngle: number
  readonly originalHorizontalDirection: HorizontalVector
  readonly transformedHorizontalDirection: HorizontalVector
  readonly transformedHorizontalLength: number
  readonly normalizedHorizontalDirection: HorizontalVector
  readonly q: number
  readonly transferredPowerRatio: number
  readonly h0: number
  readonly v0: number
  readonly h1: number
  readonly v1: number
  readonly feetDelta: Vec3
  readonly feetHorizontalDistance: number
  readonly theta: number
  readonly powerRotationAngle: number
  readonly h2: number
  readonly v2: number
  readonly horizontalRatio: number
  readonly verticalRatio: number
  readonly maxRatio: number
  readonly capFactor: number
  readonly h3: number
  readonly v3: number
  readonly effectFactor: number
  readonly damageSquareRoot: number
  readonly damageAndEffectMultiplier: number
  readonly resistanceFactor: number
  readonly m: number
  readonly hM: number
  readonly vM: number
  readonly horizontalBeforeClamp: number
  readonly verticalBeforeClamp: number
  readonly horizontalResult: number
  readonly verticalResult: number
}

export interface KnockbackCallResult {
  readonly input: KnockbackCallInputSnapshot
  readonly diagnostics: KnockbackCallDiagnostics
  readonly addedVelocity: Vec3
  readonly resultingVelocity: Vec3
}

export interface AttackSequenceResult {
  readonly initialVelocity: Vec3
  readonly callResults: readonly KnockbackCallResult[]
  readonly resultingVelocity: Vec3
}

export type SulfurCubeDirectionProviderId =
  | 'nonProjectileSourcePosition'
  | 'callerYaw'
  | 'projectileMotion'
  | 'potionPosition'
  | 'fireworkPosition'

export interface VelocityOperationProvenance {
  readonly sourceFamily: string
  readonly reason: string
  readonly damageSourceType: string | null
}

export interface SulfurCubeKnockbackOperation {
  readonly kind: 'sulfurCubeKnockbackCall'
  readonly providerId: SulfurCubeDirectionProviderId
  readonly call: KnockbackCall
  /** Every call owns its independently sampled mechanics context. */
  readonly context: SulfurCubeKnockbackContext
  readonly provenance: VelocityOperationProvenance
}

export interface DirectPushOperation {
  readonly kind: 'directPush'
  readonly providerId: string
  readonly addedVelocity: Vec3
  readonly provenance: VelocityOperationProvenance
}

export type VelocityOperation = SulfurCubeKnockbackOperation | DirectPushOperation

export interface SulfurCubeKnockbackOperationResult {
  readonly kind: 'sulfurCubeKnockbackCall'
  readonly operation: SulfurCubeKnockbackOperation
  readonly existingVelocity: Vec3
  readonly addedVelocity: Vec3
  readonly resultingVelocity: Vec3
  readonly knockbackResult: KnockbackCallResult
}

export interface DirectPushOperationResult {
  readonly kind: 'directPush'
  readonly operation: DirectPushOperation
  readonly existingVelocity: Vec3
  readonly addedVelocity: Vec3
  readonly resultingVelocity: Vec3
}

export type VelocityOperationResult = SulfurCubeKnockbackOperationResult | DirectPushOperationResult

export interface VelocityOperationSequenceResult {
  readonly initialVelocity: Vec3
  readonly operationResults: readonly VelocityOperationResult[]
  readonly resultingVelocity: Vec3
}

export interface TrajectoryAssumptions {
  readonly gravity: number
  readonly drag: number
  readonly movementCutoff: number
}

export interface TrajectoryTick {
  readonly tick: number
  readonly startingPosition: Vec3
  readonly startingVelocity: Vec3
  readonly effectiveVelocity: Vec3
  readonly resultingPosition: Vec3
  readonly resultingVelocity: Vec3
}

export interface TrajectoryResult {
  readonly initialPosition: Vec3
  readonly initialVelocity: Vec3
  readonly assumptions: TrajectoryAssumptions
  readonly ticks: readonly TrajectoryTick[]
  readonly resultingPosition: Vec3
  readonly resultingVelocity: Vec3
}

export interface FlatFloorTrajectoryAssumptions extends TrajectoryAssumptions {
  /** Top surface of the infinite level floor, equal to the initial feet Y. */
  readonly floorY: number
  /** Decoded friction value of the assumed ordinary full block. */
  readonly floorBlockFriction: number
  /** Effective entity friction modifier resolved from the selected cube properties. */
  readonly entityFrictionModifier: number
  /** Horizontal post-move factor used only by the first update, which begins on ground. */
  readonly initialGroundHorizontalFactor: number
}

export interface FlatFloorTrajectoryTick {
  readonly tick: number
  readonly startingPosition: Vec3
  readonly startingVelocity: Vec3
  readonly effectiveVelocity: Vec3
  readonly appliedMovement: Vec3
  readonly resultingPosition: Vec3
  /** Null on first floor contact because this result ends at contact. */
  readonly resultingVelocity: Vec3 | null
  readonly firstFloorContact: boolean
}

export interface FlatFloorContact {
  readonly tick: number
  readonly position: Vec3
  readonly horizontalDistance: number
  readonly maximumFeetY: number
  readonly effectiveVelocity: Vec3
  readonly appliedMovement: Vec3
  readonly verticalMovementFraction: number
}

export interface FlatFloorTrajectoryResult {
  readonly initialPosition: Vec3
  readonly initialVelocity: Vec3
  readonly assumptions: FlatFloorTrajectoryAssumptions
  readonly ticks: readonly FlatFloorTrajectoryTick[]
  readonly resultingPosition: Vec3
  readonly resultingVelocity: Vec3 | null
  readonly contact: FlatFloorContact | null
  /** X/Z displacement from the initial feet position to the simulated endpoint. */
  readonly horizontalDistance: number
  readonly maximumFeetY: number
}

export type UniformFloorAfterTravel = 'none' | 'slimeStepOn'

export interface UniformFloorProfile {
  readonly id: string
  readonly surfaceHeightWithinBlock: number
  readonly friction: number
  readonly bounceRestitution: number
  readonly speedFactor: number
  readonly suppressesBounce: boolean
  readonly afterTravel: UniformFloorAfterTravel
}

export interface UniformFloorTrajectoryAssumptions {
  readonly gravity: number
  readonly baseAirDrag: number
  readonly movementCutoff: number
  readonly positionCommitThreshold: number
  readonly movementBlockSampleOffset: number
  readonly floorY: number
  readonly cube: CubeMotionProperties
  readonly floor: UniformFloorProfile
  readonly entitySuppressesBounce: boolean
  /** The motion-only simulator assumes an Explosive cube has no active fuse. */
  readonly noActiveExplosiveFuse: true
}

export interface UniformFloorState {
  readonly tick: number
  readonly feetPosition: Vec3
  readonly velocity: Vec3
  readonly onGround: boolean
  readonly supportingFloor: boolean
}

export type BounceSuppressionReason =
  | 'belowGravityThreshold'
  | 'entitySuppressesBounce'
  | 'floorSuppressesBounce'
  | 'zeroEffectiveRestitution'

export interface UniformFloorCollisionDiagnostics {
  readonly geometricTouch: boolean
  readonly floorCollision: boolean
  readonly verticalCollision: boolean
  readonly verticalCollisionBelow: boolean
  readonly verticalMovementFraction: number | null
}

export interface UniformFloorReboundDiagnostics {
  readonly eligible: boolean
  readonly restitution: number
  readonly partialContactDrag: number | null
  readonly postCollisionVerticalVelocity: number
  readonly suppressionReason: BounceSuppressionReason | null
  readonly emittedBounceEvent: boolean
  readonly willVisiblyTakeOffNextTick: boolean
}

export interface UniformFloorTick {
  readonly start: UniformFloorState
  readonly effectiveVelocity: Vec3
  readonly startGroundFriction: number
  readonly airDrag: number
  readonly horizontalTravelFactor: number
  readonly appliedMovement: Vec3
  readonly commitsPosition: boolean
  readonly endBlockSpeedFactor: number
  readonly collision: UniformFloorCollisionDiagnostics
  readonly rebound: UniformFloorReboundDiagnostics
  readonly afterTravelHorizontalScale: number | null
  readonly end: UniformFloorState
  readonly arcNumber: number | null
  readonly airborneContactNumber: number | null
}

export interface UniformFloorTrajectoryResult {
  readonly initialState: UniformFloorState
  readonly assumptions: UniformFloorTrajectoryAssumptions
  readonly ticks: readonly UniformFloorTick[]
  readonly status: 'settled' | 'truncated'
  readonly endpoint: UniformFloorState
  readonly firstGeometricTouch: UniformFloorTick | null
  readonly firstFloorCollision: UniformFloorTick | null
  readonly airborneContactCount: number
  readonly floorCollisionTickCount: number
  readonly bounceEventCount: number
  readonly arcCount: number
  readonly horizontalDisplacement: number
  readonly maximumDiscreteFeetY: number
  readonly requestedMaximumTicks: number
}

export interface LaunchSummary {
  readonly horizontalSpeed: number
  readonly totalSpeed: number
  readonly elevationAngle: number
  readonly horizontalDirection: Vec2
}
