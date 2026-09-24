import type {
  Je26_3PlayerMeleeWeaponType,
  Je26_3ToolMaterialId,
  Je26_3UniformFloorProfileId,
} from '../data/je26_3'

export type NumericFormValue = string | number

export interface DiagnosticFormState {
  readonly cubeFeetX: NumericFormValue
  readonly cubeFeetY: NumericFormValue
  readonly cubeFeetZ: NumericFormValue
  readonly attackerFeetX: NumericFormValue
  readonly attackerFeetY: NumericFormValue
  readonly attackerFeetZ: NumericFormValue
  readonly attackerEyeX: NumericFormValue
  readonly attackerEyeY: NumericFormValue
  readonly attackerEyeZ: NumericFormValue
  readonly aimX: NumericFormValue
  readonly aimY: NumericFormValue
  readonly aimZ: NumericFormValue
  readonly damageArgument: NumericFormValue
  readonly trajectoryTicks: NumericFormValue
  readonly floorProfileId: Je26_3UniformFloorProfileId
}

export interface PlayerMeleeFormState {
  readonly weaponType: Je26_3PlayerMeleeWeaponType
  /** Preserved while Bare hand is selected so changing back restores the material. */
  readonly weaponMaterial: Je26_3ToolMaterialId
  readonly attackStrengthPercent: NumericFormValue
  readonly sprinting: boolean
  readonly criticalHitConditions: boolean
  readonly sharpnessEnabled: boolean
  readonly sharpnessLevel: NumericFormValue
  readonly knockbackEnabled: boolean
  readonly knockbackLevel: NumericFormValue
  readonly allowNonVanillaEnchantmentLevels: boolean
}

export interface SceneAttackSummary {
  readonly weaponLabel: string
  readonly attackStrengthPercent: number
  readonly sharpnessLabel: string | null
  readonly knockbackLabel: string | null
  readonly sharpnessLevel: number | null
  readonly knockbackLevel: number | null
  readonly sprinting: boolean
  readonly criticalHit: boolean
}

/** Purely visual switches for the radial scene; mechanics remain unchanged. */
export interface RadialSceneDisplayOptions {
  readonly velocity: boolean
  readonly cube: boolean
  readonly player: boolean
  readonly aim: boolean
  readonly heightAngle: boolean
  readonly information: boolean
  readonly trajectoryLine: boolean
  readonly trajectory: boolean
  readonly floor: boolean
}
