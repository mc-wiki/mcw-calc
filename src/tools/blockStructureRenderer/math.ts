import * as THREE from 'three'

// Direction Utility Functions ---------------------------------------------------------------------

export enum Direction {
  DOWN = 'down',
  UP = 'up',
  NORTH = 'north',
  SOUTH = 'south',
  WEST = 'west',
  EAST = 'east',
}

export function isHorizontalDirection(direction: Direction): boolean {
  return (
    direction == Direction.NORTH ||
    direction == Direction.SOUTH ||
    direction == Direction.WEST ||
    direction == Direction.EAST
  )
}

export function isVerticalDirection(direction: Direction): boolean {
  return direction == Direction.UP || direction == Direction.DOWN
}

export function oppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.DOWN:
      return Direction.UP
    case Direction.UP:
      return Direction.DOWN
    case Direction.NORTH:
      return Direction.SOUTH
    case Direction.SOUTH:
      return Direction.NORTH
    case Direction.WEST:
      return Direction.EAST
    case Direction.EAST:
      return Direction.WEST
  }
}

export function moveTowardsDirection(
  x: number,
  y: number,
  z: number,
  direction: Direction,
): [number, number, number] {
  switch (direction) {
    case Direction.DOWN:
      return [x, y - 1, z]
    case Direction.UP:
      return [x, y + 1, z]
    case Direction.NORTH:
      return [x, y, z - 1]
    case Direction.SOUTH:
      return [x, y, z + 1]
    case Direction.WEST:
      return [x - 1, y, z]
    case Direction.EAST:
      return [x + 1, y, z]
  }
}

function getVectorFromDirection(direction: Direction): THREE.Vector3 {
  switch (direction) {
    case Direction.DOWN:
      return new THREE.Vector3(0, -1, 0)
    case Direction.UP:
      return new THREE.Vector3(0, 1, 0)
    case Direction.NORTH:
      return new THREE.Vector3(0, 0, -1)
    case Direction.SOUTH:
      return new THREE.Vector3(0, 0, 1)
    case Direction.WEST:
      return new THREE.Vector3(-1, 0, 0)
    case Direction.EAST:
      return new THREE.Vector3(1, 0, 0)
  }
}

export function getUVLocalToGlobalFromDirection(direction: Direction): THREE.Matrix4 {
  switch (direction) {
    case Direction.SOUTH:
      return new THREE.Matrix4()
    case Direction.EAST:
      return new THREE.Matrix4().makeRotationY(Math.PI / 2)
    case Direction.WEST:
      return new THREE.Matrix4().makeRotationY(-Math.PI / 2)
    case Direction.NORTH:
      return new THREE.Matrix4().makeRotationY(Math.PI)
    case Direction.UP:
      return new THREE.Matrix4().makeRotationX(-Math.PI / 2)
    case Direction.DOWN:
      return new THREE.Matrix4().makeRotationX(Math.PI / 2)
  }
}

export function getUVGlobalToLocalFromDirection(direction: Direction): THREE.Matrix4 {
  return getUVLocalToGlobalFromDirection(direction).invert()
}

export function getDirectionFromName(name: string): Direction {
  return Direction[name.toUpperCase() as keyof typeof Direction]
}

// Model Rotation Class ----------------------------------------------------------------------------

export class Rotation {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  toStringKey(): string {
    return `[${this.x},${this.y}]`
  }

  asMatrix(): THREE.Matrix4 {
    const matrix = new THREE.Matrix4()
    matrix.multiply(new THREE.Matrix4().makeRotationY((-this.y / 180) * Math.PI))
    matrix.multiply(new THREE.Matrix4().makeRotationX((-this.x / 180) * Math.PI))
    return matrix
  }

  findNearestDirection(vector: THREE.Vector3): Direction {
    let nearestDirection = Direction.NORTH
    let nearestDot = -Infinity
    const directions = Object.values(Direction)
    for (const direction of directions) {
      const dot = getVectorFromDirection(direction).dot(vector)
      if (dot > nearestDot) {
        nearestDot = dot
        nearestDirection = direction
      }
    }
    return nearestDirection
  }

  transformDirection(direction: Direction): Direction {
    const matrix = this.asMatrix()
    const vector = getVectorFromDirection(direction)
    vector.applyMatrix4(matrix)
    return this.findNearestDirection(vector)
  }

  isIdentity(): boolean {
    return this.x == 0 && this.y == 0
  }
}

// Voxel Shape Utility Functions -------------------------------------------------------------------

function pointInsideAABB(point: number[], aabb: number[]) {
  return point[0] > aabb[0] && point[0] < aabb[2] && point[1] > aabb[1] && point[1] < aabb[3]
}

export function isOcclusion(thisFace: number[][], otherFace: number[][]): boolean {
  if (otherFace.length == 0) return false
  if (thisFace.length == 0) return true
  if (
    thisFace.length == otherFace.length &&
    thisFace.every((val, i) => val.every((v, j) => v == otherFace[i][j]))
  )
    return true
  for (const thisFaceElement of thisFace) {
    let nonOccludedPart = [thisFaceElement]
    for (const otherFaceElement of otherFace) {
      const computedNonOccludedPart = [] as number[][]
      for (const part of nonOccludedPart) {
        if (
          otherFaceElement[0] <= part[0] &&
          otherFaceElement[1] <= part[1] &&
          otherFaceElement[2] >= part[2] &&
          otherFaceElement[3] >= part[3]
        )
          continue
        if (
          part[0] < otherFaceElement[2] &&
          part[2] > otherFaceElement[0] &&
          part[1] < otherFaceElement[3] &&
          part[3] > otherFaceElement[1]
        ) {
          const minMinInside = pointInsideAABB([otherFaceElement[0], otherFaceElement[1]], part)
          const minMaxInside = pointInsideAABB([otherFaceElement[0], otherFaceElement[3]], part)
          const maxMinInside = pointInsideAABB([otherFaceElement[2], otherFaceElement[1]], part)
          const maxMaxInside = pointInsideAABB([otherFaceElement[2], otherFaceElement[3]], part)
          if (minMinInside && minMaxInside && maxMinInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
              [otherFaceElement[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[0], otherFaceElement[3], otherFaceElement[2], part[3]],
            )
          } else if (minMinInside && minMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], part[2], otherFaceElement[1]],
              [part[0], otherFaceElement[1], otherFaceElement[0], otherFaceElement[3]],
              [part[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (minMaxInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], otherFaceElement[3], otherFaceElement[2], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (maxMinInside && maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], part[2], otherFaceElement[1]],
              [otherFaceElement[2], otherFaceElement[1], part[2], otherFaceElement[3]],
              [part[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (maxMinInside && minMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (minMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], part[1], part[2], otherFaceElement[1]],
            )
          } else if (minMaxInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[0], part[3]],
              [otherFaceElement[0], otherFaceElement[3], part[2], part[3]],
            )
          } else if (maxMinInside) {
            computedNonOccludedPart.push(
              [part[0], part[1], otherFaceElement[2], otherFaceElement[1]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else if (maxMaxInside) {
            computedNonOccludedPart.push(
              [part[0], otherFaceElement[3], otherFaceElement[2], part[3]],
              [otherFaceElement[2], part[1], part[2], part[3]],
            )
          } else {
            const minHorizontalInside =
              otherFaceElement[0] > part[0] && otherFaceElement[0] < part[2]
            const maxHorizontalInside =
              otherFaceElement[2] > part[0] && otherFaceElement[2] < part[2]
            const minVerticalInside = otherFaceElement[1] > part[1] && otherFaceElement[1] < part[3]
            const maxVerticalInside = otherFaceElement[3] > part[1] && otherFaceElement[3] < part[3]
            if (minHorizontalInside) {
              computedNonOccludedPart.push([part[0], part[1], otherFaceElement[0], part[3]])
            }
            if (maxHorizontalInside) {
              computedNonOccludedPart.push([otherFaceElement[2], part[1], part[2], part[3]])
            }
            if (minVerticalInside) {
              computedNonOccludedPart.push([part[0], part[1], part[2], otherFaceElement[1]])
            }
            if (maxVerticalInside) {
              computedNonOccludedPart.push([part[0], otherFaceElement[3], part[2], part[3]])
            }
          }
        } else {
          computedNonOccludedPart.push(part)
        }
      }
      nonOccludedPart = computedNonOccludedPart
    }
    if (nonOccludedPart.length > 0) return false
  }
  return true
}
