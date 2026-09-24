export const sulfurCubeSectionIds = [
  'scene',
  'topDown',
  'power',
  'controls',
  'readout',
  'trace',
  'details',
] as const

export const sulfurCubeSectionColumns = ['left', 'right'] as const

export type SulfurCubeSectionId = (typeof sulfurCubeSectionIds)[number]
export type SulfurCubeSectionColumn = (typeof sulfurCubeSectionColumns)[number]
export type SulfurCubeSectionDropPosition = 'before' | 'after'

export interface SulfurCubeSectionColumnLayout {
  readonly left: readonly SulfurCubeSectionId[]
  readonly right: readonly SulfurCubeSectionId[]
}

export interface SulfurCubeSectionLayouts {
  readonly regular: SulfurCubeSectionColumnLayout
  readonly compact: SulfurCubeSectionColumnLayout
}

const defaultColumnLayout: SulfurCubeSectionColumnLayout = {
  left: ['scene', 'readout'],
  right: ['topDown', 'controls', 'power', 'trace', 'details'],
}

export const defaultSulfurCubeSectionLayouts: SulfurCubeSectionLayouts = {
  regular: defaultColumnLayout,
  compact: defaultColumnLayout,
}

function copyColumnLayout(layout: SulfurCubeSectionColumnLayout): SulfurCubeSectionColumnLayout {
  return {
    left: [...layout.left],
    right: [...layout.right],
  }
}

function normalizeLegacyOrder(candidate: readonly unknown[]): SulfurCubeSectionColumnLayout {
  const knownIds = new Set<SulfurCubeSectionId>(sulfurCubeSectionIds)
  const uniqueIds: SulfurCubeSectionId[] = []

  for (const value of candidate) {
    if (
      typeof value === 'string' &&
      knownIds.has(value as SulfurCubeSectionId) &&
      !uniqueIds.includes(value as SulfurCubeSectionId)
    ) {
      uniqueIds.push(value as SulfurCubeSectionId)
    }
  }

  for (const sectionId of sulfurCubeSectionIds) {
    if (!uniqueIds.includes(sectionId)) uniqueIds.push(sectionId)
  }

  return {
    left: uniqueIds.filter((_, index) => index % 2 === 0),
    right: uniqueIds.filter((_, index) => index % 2 === 1),
  }
}

function normalizeColumnLayout(
  candidate: unknown,
  fallback: SulfurCubeSectionColumnLayout,
): SulfurCubeSectionColumnLayout {
  if (Array.isArray(candidate)) return normalizeLegacyOrder(candidate)

  if (candidate === null || typeof candidate !== 'object') return copyColumnLayout(fallback)

  const record = candidate as Record<string, unknown>
  const knownIds = new Set<SulfurCubeSectionId>(sulfurCubeSectionIds)
  const usedIds = new Set<SulfurCubeSectionId>()

  const normalizeColumn = (value: unknown): SulfurCubeSectionId[] => {
    if (!Array.isArray(value)) return []

    return value.flatMap((candidateId) => {
      if (
        typeof candidateId !== 'string' ||
        !knownIds.has(candidateId as SulfurCubeSectionId) ||
        usedIds.has(candidateId as SulfurCubeSectionId)
      ) {
        return []
      }

      const sectionId = candidateId as SulfurCubeSectionId
      usedIds.add(sectionId)
      return [sectionId]
    })
  }

  const left = normalizeColumn(record.left)
  const right = normalizeColumn(record.right)

  for (const column of sulfurCubeSectionColumns) {
    for (const sectionId of fallback[column]) {
      if (!usedIds.has(sectionId)) {
        ;(column === 'left' ? left : right).push(sectionId)
        usedIds.add(sectionId)
      }
    }
  }

  return { left, right }
}

export function normalizeSulfurCubeSectionLayouts(candidate: unknown): SulfurCubeSectionLayouts {
  if (candidate === null || typeof candidate !== 'object') {
    return {
      regular: copyColumnLayout(defaultSulfurCubeSectionLayouts.regular),
      compact: copyColumnLayout(defaultSulfurCubeSectionLayouts.compact),
    }
  }

  const record = candidate as Record<string, unknown>

  return {
    regular: normalizeColumnLayout(record.regular, defaultSulfurCubeSectionLayouts.regular),
    compact: normalizeColumnLayout(record.compact, defaultSulfurCubeSectionLayouts.compact),
  }
}

export function findSulfurCubeSectionColumn(
  layout: SulfurCubeSectionColumnLayout,
  sectionId: SulfurCubeSectionId,
): SulfurCubeSectionColumn | null {
  return sulfurCubeSectionColumns.find((column) => layout[column].includes(sectionId)) ?? null
}

export function moveSulfurCubeSection(
  layout: SulfurCubeSectionColumnLayout,
  sourceId: SulfurCubeSectionId,
  targetColumn: SulfurCubeSectionColumn,
  targetId: SulfurCubeSectionId | null,
  position: SulfurCubeSectionDropPosition = 'after',
): SulfurCubeSectionColumnLayout {
  if (findSulfurCubeSectionColumn(layout, sourceId) === null) return copyColumnLayout(layout)

  const result: Record<SulfurCubeSectionColumn, SulfurCubeSectionId[]> = {
    left: layout.left.filter((sectionId) => sectionId !== sourceId),
    right: layout.right.filter((sectionId) => sectionId !== sourceId),
  }
  const targetSections = result[targetColumn]

  if (targetId === null || targetId === sourceId || !targetSections.includes(targetId)) {
    targetSections.push(sourceId)
    return result
  }

  const targetIndex = targetSections.indexOf(targetId)
  targetSections.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceId)
  return result
}
