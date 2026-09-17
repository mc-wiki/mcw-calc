import type { Vec3 } from '../model/types'
import type { NumericBackend } from '../numerics/types'
import type { DiagnosticInputs } from '../presets/diagnostic'
import type { PlayerMeleeInputs } from '../presets/playerMelee'
import type { DiagnosticFormState, NumericFormValue, PlayerMeleeFormState } from './types'
import { je26_3Constants, je26_3PlayerMeleeMechanics } from '../data/je26_3'
import { parseNumericInput } from '../input/numericInput'
import { standardNumerics } from '../numerics/standard'

function stringifyNumber(value: number): string {
  return String(value)
}

export function createPlayerMeleeFormState(inputs: PlayerMeleeInputs): PlayerMeleeFormState {
  return {
    weaponType: inputs.weapon.type,
    weaponMaterial: inputs.weapon.type === 'bareHand' ? 'iron' : inputs.weapon.material,
    attackStrengthPercent: stringifyNumber(inputs.attackStrength * 100),
    sprinting: inputs.sprinting,
    criticalHitConditions: inputs.criticalHitConditions,
    sharpnessEnabled: inputs.sharpness.enabled,
    sharpnessLevel: inputs.sharpness.enabled ? stringifyNumber(inputs.sharpness.level) : '1',
    knockbackEnabled: inputs.knockback.enabled,
    knockbackLevel: inputs.knockback.enabled ? stringifyNumber(inputs.knockback.level) : '1',
    allowNonVanillaEnchantmentLevels:
      (inputs.sharpness.enabled &&
        inputs.sharpness.level > je26_3PlayerMeleeMechanics.ordinarySurvivalSharpnessMaximum) ||
      (inputs.knockback.enabled &&
        inputs.knockback.level > je26_3PlayerMeleeMechanics.ordinarySurvivalKnockbackMaximum),
  }
}

export function parsePlayerMeleeFormState(state: PlayerMeleeFormState): PlayerMeleeInputs {
  const attackStrengthPercent = parseNumber(state.attackStrengthPercent, 'attackStrengthPercent')

  if (attackStrengthPercent < 0 || attackStrengthPercent > 100) {
    throw new RangeError('attackStrengthPercent must be between 0 and 100')
  }

  const parseEnchantment = (
    enabled: boolean,
    value: NumericFormValue,
    field: string,
  ): PlayerMeleeInputs['sharpness'] => {
    if (!enabled) return { enabled: false }

    const level = parseNumber(value, field)
    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel
    ) {
      throw new RangeError(
        `${field} must be an integer from 1 to ${je26_3PlayerMeleeMechanics.maximumDecodedEnchantmentLevel}`,
      )
    }
    return { enabled: true, level }
  }

  return {
    weapon:
      state.weaponType === 'bareHand'
        ? { type: 'bareHand' }
        : { type: state.weaponType, material: state.weaponMaterial },
    attackStrength: attackStrengthPercent / 100,
    sprinting: state.sprinting,
    criticalHitConditions: state.criticalHitConditions,
    sharpness: parseEnchantment(state.sharpnessEnabled, state.sharpnessLevel, 'sharpnessLevel'),
    knockback: parseEnchantment(state.knockbackEnabled, state.knockbackLevel, 'knockbackLevel'),
  }
}

function parseNumber(value: NumericFormValue, field: string): number {
  const parsed = parseNumericInput(value)

  if (parsed === null) {
    throw new RangeError(`${field} must be a finite number`)
  }

  return parsed
}

function interactionNumber(value: number): number {
  const rounded = Math.round(value * 10000) / 10000

  return Object.is(rounded, -0) ? 0 : rounded
}

export function createDiagnosticFormState(inputs: DiagnosticInputs): DiagnosticFormState {
  return {
    cubeFeetX: stringifyNumber(inputs.cubeFeetPosition.x),
    cubeFeetY: stringifyNumber(inputs.cubeFeetPosition.y),
    cubeFeetZ: stringifyNumber(inputs.cubeFeetPosition.z),
    attackerFeetX: stringifyNumber(inputs.attackerFeetPosition.x),
    attackerFeetY: stringifyNumber(inputs.attackerFeetPosition.y),
    attackerFeetZ: stringifyNumber(inputs.attackerFeetPosition.z),
    attackerEyeX: stringifyNumber(inputs.attackerEyePosition.x),
    attackerEyeY: stringifyNumber(inputs.attackerEyePosition.y),
    attackerEyeZ: stringifyNumber(inputs.attackerEyePosition.z),
    aimX: stringifyNumber(inputs.aimPoint.x),
    aimY: stringifyNumber(inputs.aimPoint.y),
    aimZ: stringifyNumber(inputs.aimPoint.z),
    damageArgument: stringifyNumber(inputs.damageArgument),
    trajectoryTicks: stringifyNumber(inputs.trajectoryTicks),
    floorProfileId: inputs.floorProfileId,
  }
}

export function parseDiagnosticFormState(state: DiagnosticFormState): DiagnosticInputs {
  return {
    cubeFeetPosition: {
      x: parseNumber(state.cubeFeetX, 'cubeFeetX'),
      y: parseNumber(state.cubeFeetY, 'cubeFeetY'),
      z: parseNumber(state.cubeFeetZ, 'cubeFeetZ'),
    },
    attackerFeetPosition: {
      x: parseNumber(state.attackerFeetX, 'attackerFeetX'),
      y: parseNumber(state.attackerFeetY, 'attackerFeetY'),
      z: parseNumber(state.attackerFeetZ, 'attackerFeetZ'),
    },
    attackerEyePosition: {
      x: parseNumber(state.attackerEyeX, 'attackerEyeX'),
      y: parseNumber(state.attackerEyeY, 'attackerEyeY'),
      z: parseNumber(state.attackerEyeZ, 'attackerEyeZ'),
    },
    aimPoint: {
      x: parseNumber(state.aimX, 'aimX'),
      y: parseNumber(state.aimY, 'aimY'),
      z: parseNumber(state.aimZ, 'aimZ'),
    },
    damageArgument: parseNumber(state.damageArgument, 'damageArgument'),
    trajectoryTicks: parseNumber(state.trajectoryTicks, 'trajectoryTicks'),
    floorProfileId: state.floorProfileId,
  }
}

export function updateAimPointInFormState(
  state: DiagnosticFormState,
  aimPoint: Vec3,
): DiagnosticFormState {
  return {
    ...state,
    aimX: interactionNumber(aimPoint.x),
    aimY: interactionNumber(aimPoint.y),
    aimZ: interactionNumber(aimPoint.z),
  }
}

export function resetAttackerEyeToStandingPresetInFormState(
  state: DiagnosticFormState,
  numerics: NumericBackend = standardNumerics,
): DiagnosticFormState {
  const inputs = parseDiagnosticFormState(state)
  const eyeHeight = numerics.sourceFloat(je26_3Constants.standingPlayerEyeHeight.value)

  return {
    ...state,
    attackerEyeX: interactionNumber(inputs.attackerFeetPosition.x),
    attackerEyeY: interactionNumber(inputs.attackerFeetPosition.y + eyeHeight),
    attackerEyeZ: interactionNumber(inputs.attackerFeetPosition.z),
  }
}

export function translateAttackerInFormState(
  state: DiagnosticFormState,
  delta: Vec3,
): DiagnosticFormState {
  const inputs = parseDiagnosticFormState(state)

  return createDiagnosticFormState({
    ...inputs,
    attackerFeetPosition: {
      x: interactionNumber(inputs.attackerFeetPosition.x + delta.x),
      y: interactionNumber(inputs.attackerFeetPosition.y + delta.y),
      z: interactionNumber(inputs.attackerFeetPosition.z + delta.z),
    },
    attackerEyePosition: {
      x: interactionNumber(inputs.attackerEyePosition.x + delta.x),
      y: interactionNumber(inputs.attackerEyePosition.y + delta.y),
      z: interactionNumber(inputs.attackerEyePosition.z + delta.z),
    },
    aimPoint: {
      x: interactionNumber(inputs.aimPoint.x + delta.x),
      y: interactionNumber(inputs.aimPoint.y + delta.y),
      z: interactionNumber(inputs.aimPoint.z + delta.z),
    },
  })
}

/**
 * Moves the attacker in X/Z while preserving the signed horizontal angle between
 * their look direction and the attacker-to-cube feet axis. This is a top-down
 * interaction rule only; it does not participate in mechanics evaluation.
 */
export function translateAttackerPreservingCubeBearingInFormState(
  state: DiagnosticFormState,
  delta: Vec3,
): DiagnosticFormState {
  const inputs = parseDiagnosticFormState(state)
  const oldBearing = {
    x: inputs.cubeFeetPosition.x - inputs.attackerFeetPosition.x,
    z: inputs.cubeFeetPosition.z - inputs.attackerFeetPosition.z,
  }
  const newFeet = {
    x: inputs.attackerFeetPosition.x + delta.x,
    y: inputs.attackerFeetPosition.y + delta.y,
    z: inputs.attackerFeetPosition.z + delta.z,
  }
  const newBearing = {
    x: inputs.cubeFeetPosition.x - newFeet.x,
    z: inputs.cubeFeetPosition.z - newFeet.z,
  }
  const oldBearingLength = Math.hypot(oldBearing.x, oldBearing.z)
  const newBearingLength = Math.hypot(newBearing.x, newBearing.z)

  if (oldBearingLength < 1e-9 || newBearingLength < 1e-9) {
    return translateAttackerInFormState(state, delta)
  }

  const rotation = Math.atan2(
    oldBearing.x * newBearing.z - oldBearing.z * newBearing.x,
    oldBearing.x * newBearing.x + oldBearing.z * newBearing.z,
  )
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  const lookOffset = {
    x: inputs.aimPoint.x - inputs.attackerEyePosition.x,
    z: inputs.aimPoint.z - inputs.attackerEyePosition.z,
  }
  const newEyes = {
    x: inputs.attackerEyePosition.x + delta.x,
    y: inputs.attackerEyePosition.y + delta.y,
    z: inputs.attackerEyePosition.z + delta.z,
  }

  return createDiagnosticFormState({
    ...inputs,
    attackerFeetPosition: {
      x: interactionNumber(newFeet.x),
      y: interactionNumber(newFeet.y),
      z: interactionNumber(newFeet.z),
    },
    attackerEyePosition: {
      x: interactionNumber(newEyes.x),
      y: interactionNumber(newEyes.y),
      z: interactionNumber(newEyes.z),
    },
    aimPoint: {
      x: interactionNumber(newEyes.x + lookOffset.x * cosine - lookOffset.z * sine),
      y: interactionNumber(inputs.aimPoint.y + delta.y),
      z: interactionNumber(newEyes.z + lookOffset.x * sine + lookOffset.z * cosine),
    },
  })
}

export function translateAttackerForFeetFormEdit(
  currentState: DiagnosticFormState,
  nextState: DiagnosticFormState,
): DiagnosticFormState {
  const feetFields = ['attackerFeetX', 'attackerFeetY', 'attackerFeetZ'] as const

  if (feetFields.every((field) => currentState[field] === nextState[field])) {
    return nextState
  }

  try {
    const delta = {
      x:
        parseNumber(nextState.attackerFeetX, 'attackerFeetX') -
        parseNumber(currentState.attackerFeetX, 'attackerFeetX'),
      y:
        parseNumber(nextState.attackerFeetY, 'attackerFeetY') -
        parseNumber(currentState.attackerFeetY, 'attackerFeetY'),
      z:
        parseNumber(nextState.attackerFeetZ, 'attackerFeetZ') -
        parseNumber(currentState.attackerFeetZ, 'attackerFeetZ'),
    }
    const translatedState = translateAttackerInFormState(currentState, delta)

    return {
      ...nextState,
      attackerEyeX: translatedState.attackerEyeX,
      attackerEyeY: translatedState.attackerEyeY,
      attackerEyeZ: translatedState.attackerEyeZ,
      aimX: translatedState.aimX,
      aimY: translatedState.aimY,
      aimZ: translatedState.aimZ,
    }
  } catch {
    return nextState
  }
}

export function translateCubeInFormState(
  state: DiagnosticFormState,
  delta: Vec3,
): DiagnosticFormState {
  const inputs = parseDiagnosticFormState(state)

  return createDiagnosticFormState({
    ...inputs,
    cubeFeetPosition: {
      x: interactionNumber(inputs.cubeFeetPosition.x + delta.x),
      y: interactionNumber(inputs.cubeFeetPosition.y + delta.y),
      z: interactionNumber(inputs.cubeFeetPosition.z + delta.z),
    },
  })
}
