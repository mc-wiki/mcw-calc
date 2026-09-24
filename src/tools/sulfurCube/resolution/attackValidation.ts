import type { SulfurCubeKnockbackContext, Vec3 } from '../model/types'

export interface AttackConfigurationIssue {
  readonly path: string
  readonly code: 'nonFinite' | 'outOfRange' | 'notInteger' | 'invalidMechanics'
  readonly message: string
}

export function addFiniteIssue(
  issues: AttackConfigurationIssue[],
  value: number,
  path: string,
): void {
  if (!Number.isFinite(value)) {
    issues.push({ path, code: 'nonFinite', message: `${path} must be finite` })
  }
}

export function addFiniteVec3Issues(
  issues: AttackConfigurationIssue[],
  vector: Vec3,
  path: string,
): void {
  addFiniteIssue(issues, vector.x, `${path}.x`)
  addFiniteIssue(issues, vector.y, `${path}.y`)
  addFiniteIssue(issues, vector.z, `${path}.z`)
}

export function validateSulfurCubeKnockbackContext(
  context: SulfurCubeKnockbackContext,
): AttackConfigurationIssue[] {
  const issues: AttackConfigurationIssue[] = []

  addFiniteVec3Issues(issues, context.attacker.feetPosition, 'context.attacker.feetPosition')
  addFiniteVec3Issues(issues, context.attacker.eyePosition, 'context.attacker.eyePosition')
  addFiniteVec3Issues(issues, context.attacker.lookDirection, 'context.attacker.lookDirection')
  addFiniteVec3Issues(issues, context.cube.feetPosition, 'context.cube.feetPosition')
  addFiniteIssue(issues, context.cube.dimensions.width, 'context.cube.dimensions.width')
  addFiniteIssue(issues, context.cube.dimensions.height, 'context.cube.dimensions.height')

  for (const [name, value] of Object.entries(context.properties)) {
    addFiniteIssue(issues, value, `context.properties.${name}`)
  }
  for (const [name, value] of Object.entries(context.mechanics)) {
    addFiniteIssue(issues, value, `context.mechanics.${name}`)
  }

  if (context.cube.dimensions.width <= 0 || context.cube.dimensions.height <= 0) {
    issues.push({
      path: 'context.cube.dimensions',
      code: 'outOfRange',
      message: 'cube dimensions must be positive',
    })
  }
  if (context.mechanics.resultClampMinimum > context.mechanics.resultClampMaximum) {
    issues.push({
      path: 'context.mechanics',
      code: 'invalidMechanics',
      message: 'result clamp minimum must not exceed its maximum',
    })
  }
  if (context.mechanics.vectorNormalizationThreshold < 0) {
    issues.push({
      path: 'context.mechanics.vectorNormalizationThreshold',
      code: 'invalidMechanics',
      message: 'vector normalization threshold must not be negative',
    })
  }

  return issues
}
