import type { NumericBackend } from '../numerics/types'
import type {
  DirectPushOperationResult,
  SulfurCubeKnockbackContext,
  SulfurCubeKnockbackOperation,
  Vec3,
  VelocityOperation,
  VelocityOperationResult,
  VelocityOperationSequenceResult,
} from './types'
import { applySulfurCubeKnockbackCall } from './knockbackCall'
import { addVec3 } from './vectors'

function assertFiniteVec3(vector: Vec3, name: string): void {
  for (const [component, value] of Object.entries(vector)) {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${name}.${component} must be finite`)
    }
  }
}

function cloneVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z }
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
      dimensions: { ...context.cube.dimensions },
    },
    properties: { ...context.properties },
    mechanics: { ...context.mechanics },
  }
}

function cloneSulfurOperation(
  operation: SulfurCubeKnockbackOperation,
): SulfurCubeKnockbackOperation {
  return {
    kind: operation.kind,
    providerId: operation.providerId,
    call: {
      damageArgument: operation.call.damageArgument,
      horizontalBaseDirection: { ...operation.call.horizontalBaseDirection },
      scaling:
        operation.call.scaling.kind === 'ordinaryDamage'
          ? { kind: 'ordinaryDamage' }
          : {
              kind: 'extraKnockbackEffect',
              powerArgument: operation.call.scaling.powerArgument,
            },
    },
    context: cloneContext(operation.context),
    provenance: { ...operation.provenance },
  }
}

export function applyVelocityOperation(
  existingVelocity: Vec3,
  operation: VelocityOperation,
  numerics: NumericBackend,
): VelocityOperationResult {
  assertFiniteVec3(existingVelocity, 'existingVelocity')

  if (operation.kind === 'sulfurCubeKnockbackCall') {
    const knockbackResult = applySulfurCubeKnockbackCall(
      existingVelocity,
      operation.call,
      operation.context,
      numerics,
    )

    return {
      kind: operation.kind,
      operation: cloneSulfurOperation(operation),
      existingVelocity: cloneVec3(existingVelocity),
      addedVelocity: cloneVec3(knockbackResult.addedVelocity),
      resultingVelocity: cloneVec3(knockbackResult.resultingVelocity),
      knockbackResult,
    }
  }

  assertFiniteVec3(operation.addedVelocity, 'operation.addedVelocity')
  const addedVelocity = cloneVec3(operation.addedVelocity)
  const resultingVelocity = addVec3(existingVelocity, addedVelocity)
  const result: DirectPushOperationResult = {
    kind: operation.kind,
    operation: {
      ...operation,
      addedVelocity: cloneVec3(operation.addedVelocity),
      provenance: { ...operation.provenance },
    },
    existingVelocity: cloneVec3(existingVelocity),
    addedVelocity,
    resultingVelocity,
  }

  return result
}

export function applyVelocityOperations(
  initialVelocity: Vec3,
  operations: readonly VelocityOperation[],
  numerics: NumericBackend,
): VelocityOperationSequenceResult {
  assertFiniteVec3(initialVelocity, 'initialVelocity')
  let velocity = cloneVec3(initialVelocity)
  const operationResults = operations.map((operation) => {
    const result = applyVelocityOperation(velocity, operation, numerics)
    velocity = result.resultingVelocity
    return result
  })

  return {
    initialVelocity: cloneVec3(initialVelocity),
    operationResults,
    resultingVelocity: cloneVec3(velocity),
  }
}
