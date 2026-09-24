import type { NumericBackend } from '../numerics/types'
import type {
  HorizontalVector,
  KnockbackCall,
  KnockbackCallResult,
  SulfurCubeKnockbackContext,
  Vec3,
} from './types'
import { deriveKnockbackGeometry } from './geometry'
import {
  addVec3,
  lengthHorizontalVector,
  normalizeHorizontalVector,
  rotateHorizontalVector,
  rotateVec2,
  scaleVec2,
} from './vectors'

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`)
  }
}

function assertFiniteHorizontalVector(vector: HorizontalVector, name: string): void {
  assertFiniteNumber(vector.x, `${name}.x`)
  assertFiniteNumber(vector.z, `${name}.z`)
}

function assertFiniteVec3(vector: Vec3, name: string): void {
  assertFiniteNumber(vector.x, `${name}.x`)
  assertFiniteNumber(vector.y, `${name}.y`)
  assertFiniteNumber(vector.z, `${name}.z`)
}

function cloneHorizontalVector(vector: HorizontalVector): HorizontalVector {
  return { x: vector.x, z: vector.z }
}

function cloneVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z }
}

function cloneCall(call: KnockbackCall): KnockbackCall {
  return {
    damageArgument: call.damageArgument,
    horizontalBaseDirection: cloneHorizontalVector(call.horizontalBaseDirection),
    scaling:
      call.scaling.kind === 'ordinaryDamage'
        ? { kind: 'ordinaryDamage' }
        : { kind: 'extraKnockbackEffect', powerArgument: call.scaling.powerArgument },
  }
}

function cloneContext(context: SulfurCubeKnockbackContext): SulfurCubeKnockbackContext {
  return {
    attacker: {
      feetPosition: cloneVec3(context.attacker.feetPosition),
      eyePosition: cloneVec3(context.attacker.eyePosition),
      lookDirection: cloneVec3(context.attacker.lookDirection),
    },
    cube: {
      feetPosition: cloneVec3(context.cube.feetPosition),
      dimensions: {
        width: context.cube.dimensions.width,
        height: context.cube.dimensions.height,
      },
    },
    properties: { ...context.properties },
    mechanics: { ...context.mechanics },
  }
}

function deriveEffectFactor(call: KnockbackCall, numerics: NumericBackend): number {
  if (call.scaling.kind === 'ordinaryDamage') {
    return 1
  }

  assertFiniteNumber(call.scaling.powerArgument, 'call.scaling.powerArgument')
  return numerics.sourceFloat(
    numerics.sourceFloat(call.scaling.powerArgument) * numerics.sourceFloat(0.25),
  )
}

export function applySulfurCubeKnockbackCall(
  existingVelocity: Vec3,
  call: KnockbackCall,
  context: SulfurCubeKnockbackContext,
  numerics: NumericBackend,
): KnockbackCallResult {
  assertFiniteVec3(existingVelocity, 'existingVelocity')
  assertFiniteNumber(call.damageArgument, 'call.damageArgument')
  assertFiniteHorizontalVector(call.horizontalBaseDirection, 'call.horizontalBaseDirection')

  if (call.damageArgument < 0) {
    throw new RangeError('call.damageArgument must not be negative')
  }

  for (const [name, value] of Object.entries(context.properties)) {
    assertFiniteNumber(value, `context.properties.${name}`)
  }

  for (const [name, value] of Object.entries(context.mechanics)) {
    assertFiniteNumber(value, `context.mechanics.${name}`)
  }

  if (context.mechanics.resultClampMinimum > context.mechanics.resultClampMaximum) {
    throw new RangeError('result clamp minimum must not exceed its maximum')
  }

  const vectorNormalizationThreshold = numerics.sourceFloat(
    context.mechanics.vectorNormalizationThreshold,
  )
  const geometry = deriveKnockbackGeometry(
    context.attacker,
    context.cube,
    vectorNormalizationThreshold,
    numerics,
  )
  const originalHorizontalDirection = {
    x: numerics.sourceFloat(call.horizontalBaseDirection.x),
    z: numerics.sourceFloat(call.horizontalBaseDirection.z),
  }
  const horizontalRotationAngle = numerics.sourceFloat(
    geometry.horizontalAngleDelta * numerics.sourceFloat(context.mechanics.horizontalHitAngleScale),
  )
  const transformedHorizontalDirection = rotateHorizontalVector(
    originalHorizontalDirection,
    horizontalRotationAngle,
    numerics,
  )
  const transformedHorizontalLength = lengthHorizontalVector(
    transformedHorizontalDirection,
    numerics,
  )
  const normalizedHorizontalDirection = normalizeHorizontalVector(
    transformedHorizontalDirection,
    numerics,
    vectorNormalizationThreshold,
  )

  const h0 = numerics.sourceFloat(context.properties.horizontalPower)
  const v0 = numerics.sourceFloat(context.properties.verticalPower)
  let transferredPowerRatio = Math.abs(
    numerics.sourceFloat(
      geometry.q * numerics.sourceFloat(context.mechanics.verticalHitAngleScale),
    ),
  )
  transferredPowerRatio = numerics.sourceFloat(
    geometry.q < 0 ? -transferredPowerRatio : transferredPowerRatio,
  )
  const h1 = numerics.sourceFloat(h0 * numerics.sourceFloat(1 - transferredPowerRatio))
  const v1 = numerics.sourceFloat(v0 * numerics.sourceFloat(1 + transferredPowerRatio))
  const powerRotationAngle = numerics.sourceFloat(
    numerics.sourceFloat(-geometry.theta) *
      numerics.sourceFloat(context.mechanics.verticalPositionAngleScale),
  )
  const rotatedPower = rotateVec2({ x: h1, y: v1 }, powerRotationAngle, numerics)
  const h2 = rotatedPower.x
  const v2 = rotatedPower.y
  const horizontalRatio = h0 > 0 ? numerics.sourceFloat(Math.abs(h2) / h0) : 0
  const verticalRatio = v0 > 0 ? numerics.sourceFloat(Math.abs(v2) / v0) : 0
  const maxRatio = Math.max(horizontalRatio, verticalRatio)
  const capFactor = maxRatio > 1 ? numerics.sourceFloat(1 / maxRatio) : 1
  const cappedPower = maxRatio > 1 ? scaleVec2(rotatedPower, capFactor) : rotatedPower
  const h3 = numerics.sourceFloat(cappedPower.x)
  const v3 = numerics.sourceFloat(cappedPower.y)

  const effectFactor = deriveEffectFactor(call, numerics)
  const damageSquareRoot = numerics.sourceFloat(
    numerics.sqrt(numerics.sourceFloat(call.damageArgument)),
  )
  const damageAndEffectMultiplier = numerics.sourceFloat(damageSquareRoot * effectFactor)
  const resistanceFactor = numerics.sourceFloat(1 - context.properties.knockbackResistance)
  const m = numerics.sourceFloat(damageAndEffectMultiplier * resistanceFactor)
  const hAfterDamageAndEffect = numerics.sourceFloat(h3 * damageAndEffectMultiplier)
  const vAfterDamageAndEffect = numerics.sourceFloat(v3 * damageAndEffectMultiplier)
  const hM = numerics.sourceFloat(hAfterDamageAndEffect * resistanceFactor)
  const vM = numerics.sourceFloat(vAfterDamageAndEffect * resistanceFactor)
  const horizontalBeforeClamp = numerics.sourceFloat(
    hM * numerics.sourceFloat(context.mechanics.horizontalResultScale),
  )
  const verticalBeforeClamp = vM
  const horizontalResult = numerics.sourceFloat(
    numerics.clamp(
      horizontalBeforeClamp,
      context.mechanics.resultClampMinimum,
      context.mechanics.resultClampMaximum,
    ),
  )
  const clampedVertical = numerics.sourceFloat(
    numerics.clamp(
      verticalBeforeClamp,
      context.mechanics.resultClampMinimum,
      context.mechanics.resultClampMaximum,
    ),
  )
  const verticalResult = clampedVertical * context.mechanics.verticalResultScale
  const addedVelocity = {
    x: -normalizedHorizontalDirection.x * horizontalResult,
    y: verticalResult,
    z: -normalizedHorizontalDirection.z * horizontalResult,
  }
  const resultingVelocity = addVec3(existingVelocity, addedVelocity)

  return {
    input: {
      existingVelocity: cloneVec3(existingVelocity),
      call: cloneCall(call),
      context: cloneContext(context),
    },
    diagnostics: {
      cubeCenter: geometry.center,
      cubeTop: geometry.top,
      cubeBottom: geometry.bottom,
      normalizedLookDirection: geometry.normalizedLookDirection,
      eyeToCenterDirection: geometry.eyeToCenterDirection,
      eyeToTopDirection: geometry.eyeToTopDirection,
      eyeToBottomDirection: geometry.eyeToBottomDirection,
      horizontalCross: geometry.horizontalCross,
      horizontalDot: geometry.horizontalDot,
      horizontalAngleDelta: geometry.horizontalAngleDelta,
      horizontalRotationAngle,
      originalHorizontalDirection,
      transformedHorizontalDirection,
      transformedHorizontalLength,
      normalizedHorizontalDirection,
      q: geometry.q,
      transferredPowerRatio,
      h0,
      v0,
      h1,
      v1,
      feetDelta: geometry.feetDelta,
      feetHorizontalDistance: geometry.feetHorizontalDistance,
      theta: geometry.theta,
      powerRotationAngle,
      h2,
      v2,
      horizontalRatio,
      verticalRatio,
      maxRatio,
      capFactor,
      h3,
      v3,
      effectFactor,
      damageSquareRoot,
      damageAndEffectMultiplier,
      resistanceFactor,
      m,
      hM,
      vM,
      horizontalBeforeClamp,
      verticalBeforeClamp,
      horizontalResult,
      verticalResult,
    },
    addedVelocity,
    resultingVelocity,
  }
}
