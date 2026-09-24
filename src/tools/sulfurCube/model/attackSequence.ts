import type { NumericBackend } from '../numerics/types'
import type { AttackSequenceResult, KnockbackCall, SulfurCubeKnockbackContext, Vec3 } from './types'
import { applySulfurCubeKnockbackCall } from './knockbackCall'

export function applySulfurCubeAttackSequence(
  initialVelocity: Vec3,
  calls: readonly KnockbackCall[],
  context: SulfurCubeKnockbackContext,
  numerics: NumericBackend,
): AttackSequenceResult {
  let velocity = { ...initialVelocity }
  const callResults = calls.map((call) => {
    const result = applySulfurCubeKnockbackCall(velocity, call, context, numerics)
    velocity = result.resultingVelocity
    return result
  })

  return {
    initialVelocity: { ...initialVelocity },
    callResults,
    resultingVelocity: { ...velocity },
  }
}
