import type { HorizontalVector, SulfurCubeDirectionProviderId, Vec3 } from '../model/types'
import type { NumericBackend } from '../numerics/types'

export type ImplementedPlayerDirectionProviderId = SulfurCubeDirectionProviderId

export interface NonProjectileSourcePositionConfiguration {
  readonly kind: 'implemented'
  readonly providerId: 'nonProjectileSourcePosition'
  /** Null reproduces DamageSource.getSourcePosition() being absent. */
  readonly sourcePosition: Vec3 | null
  readonly cubeFeetPosition: Vec3
}

export interface ProjectileMotionConfiguration {
  readonly kind: 'implemented'
  readonly providerId: 'projectileMotion'
  readonly projectileMotion: Vec3
}

export interface ProjectilePositionConfiguration {
  readonly kind: 'implemented'
  readonly providerId: 'potionPosition' | 'fireworkPosition'
  readonly projectileFeetPosition: Vec3
  readonly cubeFeetPosition: Vec3
}

export interface CallerYawConfiguration {
  readonly kind: 'implemented'
  readonly providerId: 'callerYaw'
  readonly callerYawDegrees: number
}

export type ImplementedDirectionProviderConfiguration =
  | NonProjectileSourcePositionConfiguration
  | ProjectileMotionConfiguration
  | ProjectilePositionConfiguration
  | CallerYawConfiguration

export interface UnsupportedDirectionProviderConfiguration {
  readonly kind: 'unsupported'
  readonly requestedProviderId: string
  readonly reason: 'providerNotImplemented' | 'outsidePlayerActionScope'
}

export type DirectionProviderConfiguration =
  | ImplementedDirectionProviderConfiguration
  | UnsupportedDirectionProviderConfiguration

export interface DirectionProviderMechanicsParameters {
  readonly degreesToRadians: number
}

export interface DirectionProviderIssue {
  readonly path: string
  readonly code: 'nonFinite' | 'invalidMechanics'
  readonly message: string
}

export type DirectionProviderFormula =
  | 'sourcePositionMinusCubeFeet'
  | 'negativeProjectileMotion'
  | 'projectilePositionMinusCubeFeet'
  | 'callerYaw'

export interface DirectionProviderDiagnostics {
  readonly sourceVersion: 'Java Edition 26.3'
  readonly providerId: ImplementedPlayerDirectionProviderId
  readonly formula: DirectionProviderFormula
  readonly sampledConfiguration: ImplementedDirectionProviderConfiguration
  readonly sourcePositionAvailable: boolean | null
  readonly collisionPointUsed: false
}

export interface SuccessfulDirectionProviderResolution {
  readonly status: 'success'
  readonly providerId: ImplementedPlayerDirectionProviderId
  readonly horizontalBaseDirection: HorizontalVector
  readonly diagnostics: DirectionProviderDiagnostics
}

export interface UnsupportedDirectionProviderResolution {
  readonly status: 'unsupported'
  readonly requestedProviderId: string
  readonly reason: UnsupportedDirectionProviderConfiguration['reason']
  readonly diagnostics: null
}

export interface InvalidDirectionProviderResolution {
  readonly status: 'invalid'
  readonly providerId: ImplementedPlayerDirectionProviderId
  readonly issues: readonly DirectionProviderIssue[]
  readonly diagnostics: null
}

export type DirectionProviderResolution =
  | SuccessfulDirectionProviderResolution
  | UnsupportedDirectionProviderResolution
  | InvalidDirectionProviderResolution

function cloneVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z }
}

function cloneConfiguration(
  configuration: ImplementedDirectionProviderConfiguration,
): ImplementedDirectionProviderConfiguration {
  switch (configuration.providerId) {
    case 'nonProjectileSourcePosition':
      return {
        ...configuration,
        sourcePosition:
          configuration.sourcePosition === null ? null : cloneVec3(configuration.sourcePosition),
        cubeFeetPosition: cloneVec3(configuration.cubeFeetPosition),
      }
    case 'projectileMotion':
      return { ...configuration, projectileMotion: cloneVec3(configuration.projectileMotion) }
    case 'potionPosition':
    case 'fireworkPosition':
      return {
        ...configuration,
        projectileFeetPosition: cloneVec3(configuration.projectileFeetPosition),
        cubeFeetPosition: cloneVec3(configuration.cubeFeetPosition),
      }
    case 'callerYaw':
      return { ...configuration }
  }
}

function addFiniteIssue(issues: DirectionProviderIssue[], value: number, path: string): void {
  if (!Number.isFinite(value)) {
    issues.push({ path, code: 'nonFinite', message: `${path} must be finite` })
  }
}

function addFiniteVec3Issues(issues: DirectionProviderIssue[], vector: Vec3, path: string): void {
  addFiniteIssue(issues, vector.x, `${path}.x`)
  addFiniteIssue(issues, vector.y, `${path}.y`)
  addFiniteIssue(issues, vector.z, `${path}.z`)
}

function validateConfiguration(
  configuration: ImplementedDirectionProviderConfiguration,
  mechanics: DirectionProviderMechanicsParameters,
): DirectionProviderIssue[] {
  const issues: DirectionProviderIssue[] = []

  switch (configuration.providerId) {
    case 'nonProjectileSourcePosition':
      if (configuration.sourcePosition !== null) {
        addFiniteVec3Issues(issues, configuration.sourcePosition, 'sourcePosition')
      }
      addFiniteVec3Issues(issues, configuration.cubeFeetPosition, 'cubeFeetPosition')
      break
    case 'projectileMotion':
      addFiniteVec3Issues(issues, configuration.projectileMotion, 'projectileMotion')
      break
    case 'potionPosition':
    case 'fireworkPosition':
      addFiniteVec3Issues(issues, configuration.projectileFeetPosition, 'projectileFeetPosition')
      addFiniteVec3Issues(issues, configuration.cubeFeetPosition, 'cubeFeetPosition')
      break
    case 'callerYaw':
      addFiniteIssue(issues, configuration.callerYawDegrees, 'callerYawDegrees')
      if (!Number.isFinite(mechanics.degreesToRadians)) {
        issues.push({
          path: 'mechanics.degreesToRadians',
          code: 'invalidMechanics',
          message: 'mechanics.degreesToRadians must be finite',
        })
      }
      break
  }

  return issues
}

function resolveDirection(
  configuration: ImplementedDirectionProviderConfiguration,
  mechanics: DirectionProviderMechanicsParameters,
  numerics: NumericBackend,
): {
  readonly direction: HorizontalVector
  readonly formula: DirectionProviderFormula
  readonly sourcePositionAvailable: boolean | null
} {
  switch (configuration.providerId) {
    case 'nonProjectileSourcePosition':
      if (configuration.sourcePosition === null) {
        return {
          direction: { x: 0, z: 0 },
          formula: 'sourcePositionMinusCubeFeet',
          sourcePositionAvailable: false,
        }
      }
      return {
        direction: {
          x: configuration.sourcePosition.x - configuration.cubeFeetPosition.x,
          z: configuration.sourcePosition.z - configuration.cubeFeetPosition.z,
        },
        formula: 'sourcePositionMinusCubeFeet',
        sourcePositionAvailable: true,
      }
    case 'projectileMotion':
      return {
        direction: {
          x: -configuration.projectileMotion.x,
          z: -configuration.projectileMotion.z,
        },
        formula: 'negativeProjectileMotion',
        sourcePositionAvailable: null,
      }
    case 'potionPosition':
    case 'fireworkPosition':
      return {
        direction: {
          x: configuration.projectileFeetPosition.x - configuration.cubeFeetPosition.x,
          z: configuration.projectileFeetPosition.z - configuration.cubeFeetPosition.z,
        },
        formula: 'projectilePositionMinusCubeFeet',
        sourcePositionAvailable: true,
      }
    case 'callerYaw': {
      const yawRadians = numerics.sourceFloat(
        numerics.sourceFloat(configuration.callerYawDegrees) *
          numerics.sourceFloat(mechanics.degreesToRadians),
      )
      return {
        direction: {
          x: numerics.sourceFloat(numerics.sin(yawRadians)),
          z: numerics.sourceFloat(-numerics.cos(yawRadians)),
        },
        formula: 'callerYaw',
        sourcePositionAvailable: null,
      }
    }
  }
}

export function resolveDirectionProvider(
  configuration: DirectionProviderConfiguration,
  mechanics: DirectionProviderMechanicsParameters,
  numerics: NumericBackend,
): DirectionProviderResolution {
  if (configuration.kind === 'unsupported') {
    return {
      status: 'unsupported',
      requestedProviderId: configuration.requestedProviderId,
      reason: configuration.reason,
      diagnostics: null,
    }
  }

  const issues = validateConfiguration(configuration, mechanics)
  if (issues.length > 0) {
    return {
      status: 'invalid',
      providerId: configuration.providerId,
      issues,
      diagnostics: null,
    }
  }

  const resolved = resolveDirection(configuration, mechanics, numerics)
  return {
    status: 'success',
    providerId: configuration.providerId,
    horizontalBaseDirection: resolved.direction,
    diagnostics: {
      sourceVersion: 'Java Edition 26.3',
      providerId: configuration.providerId,
      formula: resolved.formula,
      sampledConfiguration: cloneConfiguration(configuration),
      sourcePositionAvailable: resolved.sourcePositionAvailable,
      collisionPointUsed: false,
    },
  }
}
