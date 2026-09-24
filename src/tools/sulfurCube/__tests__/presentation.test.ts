import { describe, expect, it } from 'vitest'
import {
  createDiagnosticFormState,
  parseDiagnosticFormState,
  resetAttackerEyeToStandingPresetInFormState,
  translateAttackerForFeetFormEdit,
  translateAttackerInFormState,
  translateAttackerPreservingCubeBearingInFormState,
  translateCubeInFormState,
  updateAimPointInFormState,
} from '../components/formState'
import { pointOnProjectedAimAxis } from '../presentation/aimInteraction'
import { createPowerSpacePresentation } from '../presentation/powerSpace'
import {
  createRadialProjection,
  projectPointToRadialPlane,
  projectVectorToRadialPlane,
  radialLateralOffset,
  unprojectPointFromRadialPlane,
} from '../presentation/radialPlane'
import {
  createTopDownScenePresentation,
  topDownAimArcRadius,
  topDownDirectionAdjustmentArcRadius,
  topDownDirectionVectorLength,
  topDownLaunchOffsetArcRadius,
} from '../presentation/topDown'
import {
  aimArrowLength,
  createRadialScenePresentation,
  launchElevationArcRadius,
  launchElevationLabelRadialOffset,
  launchVectorDisplayLength,
  launchVectorMaximumDisplayLength,
  thetaArcRadius,
  thetaLabelHorizontalOffset,
  thetaLabelVerticalOffset,
} from '../presentation/verticalScene'
import {
  clampPointToBoundsFromOrigin,
  createViewportWorldBounds,
  createWorldBounds,
  createWorldToSvgTransform,
  scaleWorldBoundsAroundPoint,
  translateWorldBounds,
} from '../presentation/worldToSvg'
import { evaluateDiagnosticInputs } from '../presets/diagnostic'
import {
  createDefaultPlayerMeleeInputs,
  deriveMinecraftYawDegreesFromAim,
  evaluatePlayerMeleeInputs,
} from '../presets/playerMelee'
import { getRecordedLaunchPreset, recordedLaunchPresets } from './recordedLaunchPresets'

describe('radial-plane presentation', () => {
  it('keeps a visual aim handle on its projected axis without changing the mechanics endpoint', () => {
    const origin = { x: 1, y: 2 }
    const mechanicsEndpoint = { x: 4, y: 6 }

    expect(pointOnProjectedAimAxis(origin, mechanicsEndpoint, 2.5)).toEqual({ x: 2.5, y: 4 })
    expect(mechanicsEndpoint).toEqual({ x: 4, y: 6 })
    expect(pointOnProjectedAimAxis(origin, origin, 5)).toEqual(origin)
    expect(() => pointOnProjectedAimAxis(origin, mechanicsEndpoint, -1)).toThrow(/nonnegative/)
  })

  it('projects the attacker to the left of the cube in the radial view', () => {
    const projection = createRadialProjection({ x: 2, y: 4, z: -3 }, { x: 5, y: 5, z: 1 })

    expect(projection.horizontalAxis.x).toBeCloseTo(-0.6, 12)
    expect(projection.horizontalAxis.y).toBeCloseTo(-0.8, 12)
    expect(projectPointToRadialPlane({ x: 5, y: 5, z: 1 }, projection)).toEqual({ x: -5, y: 1 })
    expect(projectVectorToRadialPlane({ x: -0.6, y: 2, z: -0.8 }, projection)).toEqual({
      x: 1,
      y: 2,
    })
  })

  it('uses a stable fallback axis for coincident horizontal feet positions', () => {
    const projection = createRadialProjection({ x: 1, y: 0, z: 2 }, { x: 1, y: 3, z: 2 })

    expect(projection.horizontalAxis).toEqual({ x: 0, y: 1 })
  })

  it('keeps an explicit radial side while the world-space player crosses the cube', () => {
    const leftProjection = createRadialProjection(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 2 },
      1e-9,
      -1,
    )
    const crossedProjection = createRadialProjection(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -0.5 },
      1e-9,
      1,
      leftProjection.horizontalAxis,
    )

    expect(projectPointToRadialPlane({ x: 0, y: 0, z: 2 }, leftProjection).x).toBe(-2)
    expect(projectPointToRadialPlane({ x: 0, y: 0, z: -0.5 }, crossedProjection).x).toBe(0.5)
    expect(crossedProjection.horizontalAxis).toEqual(leftProjection.horizontalAxis)
  })

  it('round-trips a projected point while preserving its lateral offset', () => {
    const projection = createRadialProjection({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 2 })
    const worldPoint = { x: -0.4, y: 0.49, z: 0.48 }
    const projected = projectPointToRadialPlane(worldPoint, projection)
    const lateralOffset = radialLateralOffset(worldPoint, projection)

    expect(unprojectPointFromRadialPlane(projected, projection, lateralOffset)).toEqual(worldPoint)
  })
})

describe('world-to-SVG presentation', () => {
  const viewport = {
    width: 720,
    height: 420,
    padding: { top: 20, right: 30, bottom: 40, left: 50 },
  } as const

  it('fits points into minimum world bounds with a margin', () => {
    expect(
      createWorldBounds(
        [
          { x: 0, y: 0 },
          { x: 2, y: 1 },
        ],
        4,
        3,
        0.5,
      ),
    ).toEqual({ minX: -1.5, maxX: 3.5, minY: -1.5, maxY: 2.5 })
  })

  it('round-trips fitted SVG coordinates and keeps world Y pointing upward', () => {
    const bounds = { minX: -2, maxX: 6, minY: -3, maxY: 5 }
    const transform = createWorldToSvgTransform(bounds, viewport)
    const bottom = transform.toSvg({ x: 1, y: -2 })
    const top = transform.toSvg({ x: 1, y: 4 })

    expect(top.y).toBeLessThan(bottom.y)
    expect(transform.toWorld(transform.toSvg({ x: 2.5, y: 1.25 }))).toEqual({
      x: 2.5,
      y: 1.25,
    })
  })

  it('rejects invalid bounds instead of leaking infinities into SVG attributes', () => {
    expect(() =>
      createWorldToSvgTransform({ minX: 0, maxX: 0, minY: 0, maxY: 1 }, viewport),
    ).toThrow(/width/)
    expect(() => createWorldBounds([], 4, 4, 1)).toThrow(/point/)
    expect(() => createWorldBounds([{ x: Number.NaN, y: 0 }], 4, 4, 1)).toThrow(/finite/)
  })

  it('pans a fixed camera without changing its scale or dimensions', () => {
    const bounds = { minX: -2, maxX: 6, minY: -3, maxY: 5 }
    const translated = translateWorldBounds(bounds, { x: -1.25, y: 0.5 })

    expect(translated).toEqual({ minX: -3.25, maxX: 4.75, minY: -2.5, maxY: 5.5 })
    expect(createWorldToSvgTransform(translated, viewport).scale).toBe(
      createWorldToSvgTransform(bounds, viewport).scale,
    )
  })

  it('zooms around a fixed world point', () => {
    const bounds = { minX: -2, maxX: 6, minY: -3, maxY: 5 }
    const anchor = { x: 2, y: 1 }
    const zoomed = scaleWorldBoundsAroundPoint(bounds, anchor, 0.5)

    expect(zoomed).toEqual({ minX: 0, maxX: 4, minY: -1, maxY: 3 })
    expect(createWorldToSvgTransform(zoomed, viewport).scale).toBe(
      createWorldToSvgTransform(bounds, viewport).scale * 2,
    )
    expect(() => scaleWorldBoundsAroundPoint(bounds, anchor, 0)).toThrow(/positive/)
  })

  it('maps the SVG wall to world bounds and clamps a point along its source ray', () => {
    const transform = createWorldToSvgTransform({ minX: -2, maxX: 6, minY: -3, maxY: 5 }, viewport)
    const wallBounds = createViewportWorldBounds(transform, 5)
    const origin = transform.toWorld({ x: 360, y: 210 })
    const outside = transform.toWorld({ x: 900, y: 300 })
    const clamped = clampPointToBoundsFromOrigin(origin, outside, wallBounds)
    const clampedSvg = transform.toSvg(clamped)

    expect(clampedSvg.x).toBeCloseTo(viewport.width - 5, 12)
    expect(clampedSvg.y).toBeGreaterThan(5)
    expect(clampedSvg.y).toBeLessThan(viewport.height - 5)
  })
})

describe('radial scene presentation', () => {
  const sceneViewport = {
    width: 720,
    height: 480,
    padding: { top: 36, right: 44, bottom: 46, left: 48 },
  } as const

  it('derives the M1 scene entirely from model inputs and outputs', () => {
    const evaluation = evaluateDiagnosticInputs(getRecordedLaunchPreset('M1').inputs)
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.cube.feet).toEqual({ x: 0, y: 0 })
    expect(scene.cube.width).toBeCloseTo(0.98, 12)
    expect(scene.cube.height).toBeCloseTo(0.98, 12)
    expect(scene.attackerFeet).toEqual({ x: -1.5, y: 0 })
    expect(scene.attackerEyes).toEqual({ x: -1.5, y: 1.62 })
    expect(scene.attackerHitbox).toEqual({
      bottomLeft: { x: -1.8, y: 0 },
      topRight: { x: -1.2, y: 1.8 },
      width: 0.6,
      height: 1.8,
    })
    expect(scene.aimPoint).toEqual({ x: -0.48, y: 0.49 })
    expect(
      Math.hypot(
        scene.aimArrowEnd.x - scene.attackerEyes.x,
        scene.aimArrowEnd.y - scene.attackerEyes.y,
      ),
    ).toBeCloseTo(aimArrowLength, 12)
    expect(scene.aimArrowEnd).not.toEqual(scene.aimPoint)
    expect(scene.reach).toEqual(evaluation.reach)
    const projectedLaunch = projectVectorToRadialPlane(evaluation.launchVelocity, scene.projection)
    const launchSpeed = Math.hypot(projectedLaunch.x, projectedLaunch.y)
    const expectedDisplayLength = launchVectorDisplayLength(launchSpeed)

    expect(scene.launchDisplayLength).toBeCloseTo(expectedDisplayLength, 12)
    expect(Math.hypot(scene.launchEnd.x, scene.launchEnd.y)).toBeCloseTo(expectedDisplayLength, 12)
    expect(scene.launchEnd.x / scene.launchEnd.y).toBeCloseTo(
      projectedLaunch.x / projectedLaunch.y,
      12,
    )
    expect(scene.launchElevationRadians).toBeCloseTo(
      Math.atan2(projectedLaunch.y, Math.abs(projectedLaunch.x)),
      12,
    )
    expect(scene.launchElevationArc).toHaveLength(21)
    expect(scene.launchElevationLabelPoint).not.toBeNull()
    expect(
      Math.hypot(
        scene.launchElevationLabelPoint!.x - scene.cube.feet.x,
        scene.launchElevationLabelPoint!.y - scene.cube.feet.y,
      ),
    ).toBeCloseTo(launchElevationArcRadius + launchElevationLabelRadialOffset, 12)
    expect(scene.trajectory[0].point).toEqual(scene.cube.feet)
    expect(scene.cubeFeetLineStart).toEqual({ x: -3, y: 0 })
    expect(scene.cubeFeetLineEnd).toEqual({ x: 3, y: 0 })
    expect(scene.trajectory).toHaveLength(16)
    expect(scene.trajectory[15].tick).toBe(15)
    const trajectoryEnd = scene.trajectoryEndMarker!
    const finalTick = scene.trajectory[15].point

    expect(trajectoryEnd).toEqual(finalTick)
    expect(scene.trajectoryStatus).toBe('truncated')
    expect(evaluation.trajectory.firstFloorCollision?.end.tick).toBe(9)
    expect(scene.firstBounce).toMatchObject({ status: 'reached', tick: 9 })
    expect(scene.trajectoryDistance.horizontalDistance).toBe(
      evaluation.trajectory.horizontalDisplacement,
    )
  })

  it('expands low velocity arrows with a monotonic bounded display curve', () => {
    const speeds = [0, 0.01, 0.05, 0.25, 1, 4, 64]
    const lengths = speeds.map(launchVectorDisplayLength)

    expect(lengths[0]).toBe(0)
    for (let index = 1; index < lengths.length; index += 1) {
      expect(lengths[index]).toBeGreaterThan(lengths[index - 1]!)
    }
    expect(launchVectorDisplayLength(0.01)).toBeLessThan(0.35)
    expect(launchVectorDisplayLength(64)).toBeGreaterThan(7.5)
    expect(lengths[lengths.length - 1]).toBeLessThanOrEqual(launchVectorMaximumDisplayLength)
    expect(() => launchVectorDisplayLength(-1)).toThrow(/nonnegative/)
    expect(() => launchVectorDisplayLength(Number.NaN)).toThrow(/finite/)
  })

  it('hides the launch-elevation annotation when its rendered vector is too short', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const scene = createRadialScenePresentation(
      evaluateDiagnosticInputs({ ...inputs, damageArgument: 0.000001 }),
    )

    expect(scene.launchDisplayLength).toBeLessThan(launchElevationArcRadius)
    expect(scene.launchElevationArc).toEqual([])
    expect(scene.launchElevationLabelPoint).toBeNull()
    expect(scene.launchElevationRadians).toBeLessThan(0)
  })

  it('anchors the theta arc and label to the attacker-feet angle corner', () => {
    const scene = createRadialScenePresentation(
      evaluateDiagnosticInputs(getRecordedLaunchPreset('M6').inputs),
    )

    expect(scene.thetaArc).toHaveLength(17)

    for (const point of [scene.thetaArc[0], scene.thetaArc[scene.thetaArc.length - 1]]) {
      expect(
        Math.hypot(point.x - scene.attackerFeet.x, point.y - scene.attackerFeet.y),
      ).toBeCloseTo(thetaArcRadius, 12)
    }

    expect(scene.thetaLabelPoint.x).toBeGreaterThan(scene.attackerFeet.x)
    expect(scene.thetaLabelPoint.y).toBeLessThan(scene.attackerFeet.y)
    expect(thetaLabelHorizontalOffset).toBeLessThan(0)
    expect(thetaLabelVerticalOffset).toBeLessThan(0)
  })

  it('draws the full 3D mechanics theta when lateral feet offset is hidden by the plane', () => {
    const baseScene = createRadialScenePresentation(
      evaluateDiagnosticInputs(getRecordedLaunchPreset('M1').inputs),
    )
    const evaluation = evaluateDiagnosticInputs({
      ...getRecordedLaunchPreset('M1').inputs,
      attackerFeetPosition: { x: 2, y: 1, z: 0 },
      attackerEyePosition: { x: 2, y: 2.62, z: 0 },
      aimPoint: { x: 0, y: 0.49, z: 0 },
    })
    const scene = createRadialScenePresentation(evaluation, baseScene.projection)
    const arcStart = scene.thetaArc[0]!
    const arcEnd = scene.thetaArc[scene.thetaArc.length - 1]!
    const startX = arcStart.x - scene.attackerFeet.x
    const startY = arcStart.y - scene.attackerFeet.y
    const endX = arcEnd.x - scene.attackerFeet.x
    const endY = arcEnd.y - scene.attackerFeet.y
    const displayedTheta = Math.atan2(startX * endY - startY * endX, startX * endX + startY * endY)

    expect(scene.attackerFeet.x).toBeCloseTo(scene.cube.feet.x, 12)
    expect(evaluation.callResult.diagnostics.theta).toBeCloseTo(Math.atan2(1, 2), 12)
    expect(displayedTheta).toBeCloseTo(evaluation.callResult.diagnostics.theta, 12)
  })

  it('preserves lateral aim information outside the simplified radial view', () => {
    const evaluation = evaluateDiagnosticInputs(getRecordedLaunchPreset('M2').inputs)
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.aimPoint).toEqual({ x: -0.48, y: 0.49 })
    expect(scene.aimLateralOffset).toBeCloseTo(-0.4, 12)
  })

  it('widens the radial cube projection at diagonal X/Z orientations', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const evaluation = evaluateDiagnosticInputs({
      ...inputs,
      attackerFeetPosition: { x: 2, y: inputs.attackerFeetPosition.y, z: 2 },
      attackerEyePosition: { x: 2, y: inputs.attackerEyePosition.y, z: 2 },
    })
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.cube.minimumWidth).toBeCloseTo(0.98, 12)
    expect(scene.cube.width).toBeCloseTo(scene.cube.minimumWidth * Math.SQRT2, 12)
  })

  it('stops drawing at settlement while preserving the requested maximum length', () => {
    const evaluation = evaluateDiagnosticInputs({
      ...getRecordedLaunchPreset('M1').inputs,
      trajectoryTicks: 200,
    })
    const scene = createRadialScenePresentation(evaluation)

    expect(scene.renderedTrajectoryTicks).toBe(77)
    expect(scene.requestedTrajectoryTicks).toBe(200)
    expect(evaluation.trajectory.ticks).toHaveLength(77)
    expect(evaluation.trajectory.status).toBe('settled')
    expect(evaluation.trajectory.firstFloorCollision?.end.tick).toBe(9)
    expect(scene.trajectoryStatus).toBe('settled')
    expect(scene.bounceEventCount).toBeGreaterThan(0)
    expect(scene.airborneContactCount).toBeGreaterThan(1)
    expect(scene.trajectory.some(({ floorCollision }) => floorCollision)).toBe(true)
    expect(new Set(scene.trajectory.map(({ arcNumber }) => arcNumber).filter(Boolean)).size).toBe(
      scene.airborneContactCount,
    )
    expect(scene.cubeFeetLineEnd.x).toBeGreaterThanOrEqual(
      scene.trajectoryEndMarker?.x ?? Number.NEGATIVE_INFINITY,
    )
  })

  it('can truncate only the drawn trajectory while retaining full-stop metrics', () => {
    const evaluation = evaluateDiagnosticInputs({
      ...getRecordedLaunchPreset('M1').inputs,
      trajectoryTicks: 1000,
    })
    const scene = createRadialScenePresentation(evaluation, undefined, {
      trajectoryTickLimit: 5,
    })

    expect(evaluation.trajectory.status).toBe('settled')
    expect(evaluation.trajectory.ticks).toHaveLength(77)
    expect(scene.renderedTrajectoryTicks).toBe(5)
    expect(scene.requestedTrajectoryTicks).toBe(5)
    expect(scene.trajectoryStatus).toBe('truncated')
    expect(scene.trajectory).toHaveLength(6)
    expect(scene.trajectoryDistance.horizontalDistance).toBe(
      evaluation.trajectory.horizontalDisplacement,
    )
  })

  it('counts a source-emitted tick-one rebound as the first bounce for a downward launch', () => {
    const inputs = { ...getRecordedLaunchPreset('M1').inputs, trajectoryTicks: 3 }
    const base = evaluateDiagnosticInputs(inputs)
    const evaluation = evaluateDiagnosticInputs(inputs, undefined, {
      ...base.properties,
      verticalPower: -1,
    })
    const scene = createRadialScenePresentation(evaluation)

    expect(evaluation.launchVelocity.y).toBeLessThan(0)
    expect(evaluation.trajectory.ticks[0]?.collision.floorCollision).toBe(true)
    expect(evaluation.trajectory.ticks[0]?.rebound.emittedBounceEvent).toBe(true)
    expect(scene.firstBounce).toMatchObject({ status: 'reached', tick: 1 })
  })

  it('supports a fixed projection and camera while interactive objects move', () => {
    const baseInputs = getRecordedLaunchPreset('M1').inputs
    const baseScene = createRadialScenePresentation(evaluateDiagnosticInputs(baseInputs))
    const baseTransform = createWorldToSvgTransform(baseScene.bounds, sceneViewport)
    const baseCubeFeet = baseTransform.toSvg(baseScene.cube.feet)
    const baseAttackerFeet = baseTransform.toSvg(baseScene.attackerFeet)
    const baseAimPoint = baseTransform.toSvg(baseScene.aimPoint)

    const movedAttackerScene = createRadialScenePresentation(
      evaluateDiagnosticInputs({
        ...baseInputs,
        attackerFeetPosition: { ...baseInputs.attackerFeetPosition, x: 0.5, z: 2 },
        attackerEyePosition: { ...baseInputs.attackerEyePosition, x: 0.5, z: 2 },
        aimPoint: { ...baseInputs.aimPoint, x: 0.5, z: 0.98 },
      }),
      baseScene.projection,
    )
    const movedAimScene = createRadialScenePresentation(
      evaluateDiagnosticInputs({
        ...baseInputs,
        aimPoint: { ...baseInputs.aimPoint, y: 0.8 },
      }),
      baseScene.projection,
    )

    expect(movedAttackerScene.projection).toBe(baseScene.projection)
    expect(movedAimScene.projection).toBe(baseScene.projection)

    const movedAttackerTransform = createWorldToSvgTransform(baseScene.bounds, sceneViewport)
    const movedAimTransform = createWorldToSvgTransform(baseScene.bounds, sceneViewport)

    expect(movedAttackerTransform.toSvg(movedAttackerScene.cube.feet)).toEqual(baseCubeFeet)
    expect(movedAimTransform.toSvg(movedAimScene.cube.feet)).toEqual(baseCubeFeet)
    expect(movedAttackerTransform.toSvg(movedAttackerScene.attackerFeet).x).toBeLessThan(
      baseAttackerFeet.x,
    )
    expect(movedAimTransform.toSvg(movedAimScene.aimPoint).y).toBeLessThan(baseAimPoint.y)
  })
})

describe('top-down scene presentation', () => {
  it('maps X/Z aim, direction diagnostics, launch velocity, and trajectory without projection loss', () => {
    const evaluation = evaluateDiagnosticInputs(getRecordedLaunchPreset('M2').inputs)
    const scene = createTopDownScenePresentation(evaluation)
    const call = scene.calls[0]!

    expect(scene.cube.center).toEqual({ x: 0, y: 0 })
    expect(scene.attacker.center).toEqual({ x: 0, y: 1.5 })
    expect(scene.aimPoint).toEqual({ x: -0.4, y: 0.48 })
    expect(
      Math.hypot(
        scene.aimArrowEnd.x - scene.attacker.center.x,
        scene.aimArrowEnd.y - scene.attacker.center.y,
      ),
    ).toBeCloseTo(
      aimArrowLength *
        Math.hypot(
          evaluation.callResult.diagnostics.normalizedLookDirection.x,
          evaluation.callResult.diagnostics.normalizedLookDirection.z,
        ),
      12,
    )
    expect(scene.aimErrorArc).toHaveLength(21)
    for (const point of [scene.aimErrorArc[0], scene.aimErrorArc[scene.aimErrorArc.length - 1]]) {
      expect(
        Math.hypot(point!.x - scene.attacker.center.x, point!.y - scene.attacker.center.y),
      ).toBeCloseTo(topDownAimArcRadius, 12)
    }
    expect(scene.aimErrorRadians).toBe(evaluation.callResult.diagnostics.horizontalAngleDelta)
    expect(scene.horizontalDirectionAdjustmentRadians).toBe(
      evaluation.callResult.diagnostics.horizontalRotationAngle,
    )
    expect(scene.directionAdjustmentArc).toHaveLength(21)
    for (const point of [
      scene.directionAdjustmentArc[0],
      scene.directionAdjustmentArc[scene.directionAdjustmentArc.length - 1],
    ]) {
      expect(
        Math.hypot(point!.x - scene.cube.center.x, point!.y - scene.cube.center.y),
      ).toBeCloseTo(topDownDirectionAdjustmentArcRadius, 12)
    }
    expect(scene.launchOffsetArc).toHaveLength(21)
    const attackerToCube = {
      x: scene.cube.center.x - scene.attacker.center.x,
      y: scene.cube.center.y - scene.attacker.center.y,
    }
    const beyondCube = {
      x: scene.feetAxisBeyondCubeEnd.x - scene.cube.center.x,
      y: scene.feetAxisBeyondCubeEnd.y - scene.cube.center.y,
    }

    expect(attackerToCube.x * beyondCube.x + attackerToCube.y * beyondCube.y).toBeGreaterThan(0)
    for (const point of [
      scene.launchOffsetArc[0],
      scene.launchOffsetArc[scene.launchOffsetArc.length - 1],
    ]) {
      expect(
        Math.hypot(point!.x - scene.cube.center.x, point!.y - scene.cube.center.y),
      ).toBeCloseTo(topDownLaunchOffsetArcRadius, 12)
    }
    expect(scene.reach).toBe(evaluation.reach)
    expect(
      Math.hypot(call.baseEnd.x - scene.cube.center.x, call.baseEnd.y - scene.cube.center.y),
    ).toBeCloseTo(topDownDirectionVectorLength, 12)
    expect(
      Math.hypot(call.rotatedEnd.x - scene.cube.center.x, call.rotatedEnd.y - scene.cube.center.y),
    ).toBeCloseTo(topDownDirectionVectorLength, 12)
    expect(scene.trajectory[0]!.point).toEqual(scene.cube.center)
    expect(scene.trajectory[1]!.point).toEqual({
      x: evaluation.trajectory.ticks[0]!.end.feetPosition.x,
      y: evaluation.trajectory.ticks[0]!.end.feetPosition.z,
    })
  })

  it('shows every ordered sulfur-cube call while the launch arrow uses final cumulative velocity', () => {
    const inputs = getRecordedLaunchPreset('M2').inputs
    const evaluation = evaluatePlayerMeleeInputs(
      inputs,
      {
        ...createDefaultPlayerMeleeInputs(),
        weapon: { type: 'sword', material: 'iron' },
        sprinting: true,
        knockback: { enabled: true, level: 2 },
      },
      deriveMinecraftYawDegreesFromAim(inputs, 0),
    )
    const scene = createTopDownScenePresentation(evaluation)

    expect(scene.calls).toHaveLength(2)
    expect(scene.calls.map((call) => call.providerId)).toEqual([
      'nonProjectileSourcePosition',
      'callerYaw',
    ])
    const launchVector = {
      x: scene.launchEnd.x - scene.cube.center.x,
      z: scene.launchEnd.y - scene.cube.center.y,
    }
    const expected = { x: evaluation.launchVelocity.x, z: evaluation.launchVelocity.z }

    expect(launchVector.x * expected.z - launchVector.z * expected.x).toBeCloseTo(0, 12)
    expect(launchVector.x * expected.x + launchVector.z * expected.z).toBeGreaterThan(0)
  })
})

describe('scene interaction form updates', () => {
  it('moves feet, eyes, and aim together when the attacker is translated', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const translated = parseDiagnosticFormState(
      translateAttackerInFormState(createDiagnosticFormState(inputs), {
        x: 0.25,
        y: -0.5,
        z: 1,
      }),
    )

    expect(translated.attackerFeetPosition).toEqual({ x: 0.25, y: -0.5, z: 2.5 })
    expect(translated.attackerEyePosition).toEqual({ x: 0.25, y: 1.12, z: 2.5 })
    expect(translated.aimPoint).toEqual({ x: 0.25, y: -0.01, z: 1.48 })
  })

  it('applies an exact feet-coordinate edit as the same attacker translation', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const current = createDiagnosticFormState(inputs)
    const updated = parseDiagnosticFormState(
      translateAttackerForFeetFormEdit(current, {
        ...current,
        attackerFeetX: 0.25,
        attackerFeetY: -0.5,
        attackerFeetZ: 2.5,
      }),
    )

    expect(updated.attackerFeetPosition).toEqual({ x: 0.25, y: -0.5, z: 2.5 })
    expect(updated.attackerEyePosition).toEqual({ x: 0.25, y: 1.12, z: 2.5 })
    expect(updated.aimPoint).toEqual({ x: 0.25, y: -0.01, z: 1.48 })
  })

  it('rotates horizontal aim with a top-down attacker move while preserving aim error', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const moved = parseDiagnosticFormState(
      translateAttackerPreservingCubeBearingInFormState(createDiagnosticFormState(inputs), {
        x: 2.6,
        y: 0,
        z: -2.6,
      }),
    )
    const signedAimError = (candidate: typeof inputs): number => {
      const bearing = {
        x: candidate.cubeFeetPosition.x - candidate.attackerFeetPosition.x,
        z: candidate.cubeFeetPosition.z - candidate.attackerFeetPosition.z,
      }
      const look = {
        x: candidate.aimPoint.x - candidate.attackerEyePosition.x,
        z: candidate.aimPoint.z - candidate.attackerEyePosition.z,
      }

      return Math.atan2(
        look.x * bearing.z - look.z * bearing.x,
        look.x * bearing.x + look.z * bearing.z,
      )
    }

    expect(moved.attackerFeetPosition).toEqual({ x: 2.6, y: 0, z: -1.1 })
    expect(signedAimError(moved)).toBeCloseTo(signedAimError(inputs), 4)
    expect(moved.aimPoint.y - moved.attackerEyePosition.y).toBeCloseTo(
      inputs.aimPoint.y - inputs.attackerEyePosition.y,
      12,
    )
  })

  it('changes only the aim coordinates when the aim handle moves', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const form = createDiagnosticFormState(inputs)
    const updated = updateAimPointInFormState(form, { x: -0, y: 0.123456, z: 2 })

    expect(parseDiagnosticFormState(updated)).toEqual({
      ...inputs,
      aimPoint: { x: 0, y: 0.1235, z: 2 },
    })
  })

  it('changes only cube feet when the cube-center handle moves', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const translated = parseDiagnosticFormState(
      translateCubeInFormState(createDiagnosticFormState(inputs), {
        x: -0.25,
        y: 0.5,
        z: 1,
      }),
    )

    expect(translated).toEqual({
      ...inputs,
      cubeFeetPosition: { x: -0.25, y: 0.5, z: 1 },
    })
  })

  it('restores standing-preset eyes from the current attacker feet', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const form = createDiagnosticFormState({
      ...inputs,
      attackerFeetPosition: { x: 1, y: 2, z: 3 },
      attackerEyePosition: { x: 99, y: 99, z: 99 },
    })

    expect(parseDiagnosticFormState(resetAttackerEyeToStandingPresetInFormState(form))).toEqual({
      ...inputs,
      attackerFeetPosition: { x: 1, y: 2, z: 3 },
      attackerEyePosition: { x: 1, y: 3.62, z: 3 },
    })
  })
})

describe('power-space presentation', () => {
  it('maps the four model-returned power stages without recalculating them', () => {
    const evaluation = evaluateDiagnosticInputs(getRecordedLaunchPreset('M1').inputs)
    const values = evaluation.callResult.diagnostics
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)

    expect(powerSpace.stages).toEqual([
      { id: 'base', point: { x: values.h0, y: values.v0 } },
      { id: 'aim', point: { x: values.h1, y: values.v1 } },
      { id: 'elevation', point: { x: values.h2, y: values.v2 } },
      { id: 'capped', point: { x: values.h3, y: values.v3 } },
    ])
    expect(powerSpace.limitBounds).toEqual({
      minX: -values.h0,
      maxX: values.h0,
      minY: -values.v0,
      maxY: values.v0,
    })
    expect(powerSpace.aimRange).toEqual({
      start: {
        x: values.h0 * (1 + evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
        y: values.v0 * (1 - evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
      },
      end: {
        x: values.h0 * (1 - evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
        y: values.v0 * (1 + evaluation.callResult.input.context.mechanics.verticalHitAngleScale),
      },
    })
    expect(powerSpace.aimArrowEnd).not.toEqual({ x: values.h1, y: values.v1 })
    expect(
      Math.hypot(powerSpace.aimArrowEnd.x - values.h1, powerSpace.aimArrowEnd.y - values.v1),
    ).toBeLessThan(0.03)
    expect(powerSpace.elevationArc[0]).toEqual({ x: values.h1, y: values.v1 })
    const finalElevationArcPoint = powerSpace.elevationArc[powerSpace.elevationArc.length - 1]!

    expect(finalElevationArcPoint.x).toBeCloseTo(values.h2, 12)
    expect(finalElevationArcPoint.y).toBeCloseTo(values.v2, 12)
    expect(powerSpace.capApplied).toBe(true)
    expect(powerSpace.capFactor).toBe(values.capFactor)
  })

  it('includes every stage and the component-limit rectangle in its fitted bounds', () => {
    const powerSpace = createPowerSpacePresentation(
      evaluateDiagnosticInputs(getRecordedLaunchPreset('M6').inputs).callResult,
    )

    for (const stage of powerSpace.stages) {
      expect(stage.point.x).toBeGreaterThanOrEqual(powerSpace.bounds.minX)
      expect(stage.point.x).toBeLessThanOrEqual(powerSpace.bounds.maxX)
      expect(stage.point.y).toBeGreaterThanOrEqual(powerSpace.bounds.minY)
      expect(stage.point.y).toBeLessThanOrEqual(powerSpace.bounds.maxY)
    }
  })

  it('shortens the elevation arrow before the point when elevation rotation occurs', () => {
    const evaluation = evaluateDiagnosticInputs(getRecordedLaunchPreset('M6').inputs)
    const values = evaluation.callResult.diagnostics
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)

    expect(values.powerRotationAngle).not.toBe(0)
    expect(powerSpace.elevationArrowEnd).not.toEqual({ x: values.h2, y: values.v2 })
    expect(
      Math.hypot(
        powerSpace.elevationArrowEnd.x - values.h2,
        powerSpace.elevationArrowEnd.y - values.v2,
      ),
    ).toBeLessThan(0.03)
  })

  it('keeps the elevation arrow pointing toward its stage for very small rotations', () => {
    const inputs = getRecordedLaunchPreset('M1').inputs
    const evaluation = evaluateDiagnosticInputs({
      ...inputs,
      attackerFeetPosition: { ...inputs.attackerFeetPosition, y: 0.001 },
      attackerEyePosition: { ...inputs.attackerEyePosition, y: 1.621 },
    })
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)
    const target = powerSpace.stages.find((stage) => stage.id === 'elevation')!.point
    const toArrowEnd = {
      x: powerSpace.elevationArrowEnd.x - powerSpace.elevationArrowStart.x,
      y: powerSpace.elevationArrowEnd.y - powerSpace.elevationArrowStart.y,
    }
    const toTarget = {
      x: target.x - powerSpace.elevationArrowStart.x,
      y: target.y - powerSpace.elevationArrowStart.y,
    }

    expect(evaluation.callResult.diagnostics.powerRotationAngle).not.toBe(0)
    expect(toArrowEnd.x * toTarget.x + toArrowEnd.y * toTarget.y).toBeGreaterThan(0)
  })

  it.each(recordedLaunchPresets)('keeps the $id scene and power SVG mappings finite', (preset) => {
    const evaluation = evaluateDiagnosticInputs(preset.inputs)
    const scene = createRadialScenePresentation(evaluation)
    const powerSpace = createPowerSpacePresentation(evaluation.callResult)
    const sceneTransform = createWorldToSvgTransform(scene.bounds, {
      width: 720,
      height: 480,
      padding: { top: 36, right: 44, bottom: 46, left: 48 },
    })
    const powerTransform = createWorldToSvgTransform(powerSpace.bounds, {
      width: 560,
      height: 340,
      padding: { top: 34, right: 42, bottom: 44, left: 46 },
    })
    const scenePoints = [
      scene.cube.feet,
      scene.cube.center,
      scene.cube.top,
      scene.cube.bottom,
      scene.attackerFeet,
      scene.attackerEyes,
      scene.aimPoint,
      scene.launchEnd,
      ...scene.trajectory.map((sample) => sample.point),
    ]

    for (const point of scenePoints.map(sceneTransform.toSvg)) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
    }

    for (const point of powerSpace.stages.map((stage) => powerTransform.toSvg(stage.point))) {
      expect(Number.isFinite(point.x)).toBe(true)
      expect(Number.isFinite(point.y)).toBe(true)
    }
  })
})
