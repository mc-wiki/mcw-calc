import type { DiagnosticInputs } from '../presets/diagnostic'
import { defaultUniformFloorProfileId } from '../presets/diagnostic'

export type RecordedLaunchPresetId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8' | 'M9'

export interface RecordedLaunchPreset {
  readonly id: RecordedLaunchPresetId
  readonly inputs: DiagnosticInputs
}

const sharedFeet = { x: 0, y: 0, z: 1.5 } as const
const sharedEyes = { x: 0, y: 1.62, z: 1.5 } as const
const sharedAim = { x: 0, y: 0.49, z: 0.48 } as const
const sharedCubeFeet = { x: 0, y: 0, z: 0 } as const
const standardTrajectoryTicks = 15

/** Recorded direct-melee runs from the JE 26.2 launch-direction experiment. */
export const recordedLaunchPresets: readonly RecordedLaunchPreset[] = [
  {
    id: 'M1',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: sharedAim,
      damageArgument: 1,
      trajectoryTicks: standardTrajectoryTicks,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M2',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: -0.4, y: 0.49, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardTrajectoryTicks,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M3',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: 0.4, y: 0.49, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardTrajectoryTicks,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M4',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: 0, y: 0.88, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardTrajectoryTicks,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M5',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: { x: 0, y: 0.1, z: 0.48 },
      damageArgument: 1,
      trajectoryTicks: standardTrajectoryTicks,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M6',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: { x: 0, y: 1, z: 1.5 },
      attackerEyePosition: { x: 0, y: 2.62, z: 1.5 },
      aimPoint: sharedAim,
      damageArgument: 1,
      trajectoryTicks: 11,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M7',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: { x: 0, y: -1, z: 1.5 },
      attackerEyePosition: { x: 0, y: 0.62, z: 1.5 },
      aimPoint: sharedAim,
      damageArgument: 1,
      trajectoryTicks: standardTrajectoryTicks,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M8',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: sharedAim,
      damageArgument: 4,
      trajectoryTicks: 23,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
  {
    id: 'M9',
    inputs: {
      cubeFeetPosition: sharedCubeFeet,
      attackerFeetPosition: sharedFeet,
      attackerEyePosition: sharedEyes,
      aimPoint: sharedAim,
      damageArgument: 9,
      trajectoryTicks: 31,
      floorProfileId: defaultUniformFloorProfileId,
    },
  },
]

export function getRecordedLaunchPreset(id: RecordedLaunchPresetId): RecordedLaunchPreset {
  const preset = recordedLaunchPresets.find((candidate) => candidate.id === id)

  if (preset === undefined) {
    throw new RangeError(`unknown recorded launch preset: ${id}`)
  }

  return preset
}
