import { describe, it, expect } from 'vitest'
import { topologicalSort, CircularDependencyError } from './topo'
import type { Activity, Dependency } from '../models'

function makeActivity(id: string, projectId = 'p1'): Activity {
  return {
    id,
    projectId,
    wbsCode: id,
    name: `Activity ${id}`,
    parentId: null,
    duration: 5,
    startDate: null,
    finishDate: null,
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    earlyStart: null,
    earlyFinish: null,
    lateStart: null,
    lateFinish: null,
    totalFloat: 0,
    isCritical: false,
    isMilestone: false,
    constraintType: 'ASAP',
    constraintDate: null,
    status: 'not_started',
    wbsLevel: 1,
    bimRef: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }
}

function makeDep(id: string, predId: string, succId: string, rel: 'FS' | 'SS' | 'FF' | 'SF' = 'FS', lag = 0): Dependency {
  return {
    id,
    projectId: 'p1',
    predecessorId: predId,
    successorId: succId,
    relationType: rel,
    lagDays: lag,
  }
}

describe('topologicalSort', () => {
  it('returns ordered IDs for linear chain A→B→C', () => {
    const activities: Activity[] = [
      makeActivity('A'),
      makeActivity('B'),
      makeActivity('C'),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B'),
      makeDep('d2', 'B', 'C'),
    ]
    const result = topologicalSort(activities, deps)
    expect(result).toEqual(['A', 'B', 'C'])
  })

  it('handles independent branches', () => {
    const activities: Activity[] = [
      makeActivity('A'),
      makeActivity('B'),
      makeActivity('C'),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C'),
      makeDep('d2', 'B', 'C'),
    ]
    const result = topologicalSort(activities, deps)
    // A and B must come before C
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('C'))
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('C'))
  })

  it('detects direct cycle A↔B', () => {
    const activities: Activity[] = [
      makeActivity('A'),
      makeActivity('B'),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B'),
      makeDep('d2', 'B', 'A'),
    ]
    expect(() => topologicalSort(activities, deps)).toThrow(CircularDependencyError)
  })

  it('detects indirect cycle A→B→C→A', () => {
    const activities: Activity[] = [
      makeActivity('A'),
      makeActivity('B'),
      makeActivity('C'),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B'),
      makeDep('d2', 'B', 'C'),
      makeDep('d3', 'C', 'A'),
    ]
    expect(() => topologicalSort(activities, deps)).toThrow(CircularDependencyError)
  })

  it('handles isolated activities with no dependencies', () => {
    const activities: Activity[] = [
      makeActivity('A'),
      makeActivity('B'),
      makeActivity('C'),
    ]
    const deps: Dependency[] = []
    const result = topologicalSort(activities, deps)
    expect(result).toHaveLength(3)
    expect(result).toContain('A')
    expect(result).toContain('B')
    expect(result).toContain('C')
  })

  it('handles empty input', () => {
    expect(topologicalSort([], [])).toEqual([])
  })

  it('preserves order of independent activities', () => {
    const activities: Activity[] = [
      makeActivity('A'),
      makeActivity('B'),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B'),
    ]
    const result = topologicalSort(activities, deps)
    expect(result).toEqual(['A', 'B'])
  })

  it('throws CircularDependencyError on self-loop', () => {
    const activities: Activity[] = [makeActivity('A')]
    const deps: Dependency[] = [makeDep('d1', 'A', 'A')]
    expect(() => topologicalSort(activities, deps)).toThrow(CircularDependencyError)
  })
})
