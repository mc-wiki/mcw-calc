import type { AttackerGeometry, Vec3 } from '../model/types'
import type { NumericBackend } from '../numerics/types'
import { je26_3Constants } from '../data/je26_3'
import { standardNumerics } from '../numerics/standard'

export function createStandingPlayerGeometry(
  feetPosition: Vec3,
  lookDirection: Vec3,
  numerics: NumericBackend = standardNumerics,
): AttackerGeometry {
  return {
    feetPosition: { ...feetPosition },
    eyePosition: {
      x: feetPosition.x,
      y: feetPosition.y + numerics.sourceFloat(je26_3Constants.standingPlayerEyeHeight.value),
      z: feetPosition.z,
    },
    lookDirection: { ...lookDirection },
  }
}
