import { describe, it, expect } from 'vitest'
import { schedule } from './scheduler'
import type { Activity, Dependency } from '../models'

function makeActivity(id: string, duration = 5, projectId = 'p1'): Activity {
  return {
    id,
    projectId,
    wbsCode: id,
    name: `Activity ${id}`,
    parentId: null,
    duration,
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

function makeDep(id: string, predId: string, succId: string): Dependency {
  return {
    id,
    projectId: 'p1',
    predecessorId: predId,
    successorId: succId,
    relationType: 'FS',
    lagDays: 0,
  }
}

describe('schedule', () => {
  it('computes dates and critical path for linear chain A→B→C', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
      makeActivity('C', 3),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'B'),
      makeDep('d2', 'B', 'C'),
    ]
    const projectStart = '2026-07-01'

    const result = schedule(activities, deps, projectStart)

    expect(result.projectFinish).toBe('2026-07-19')
    expect(result.criticalPath).toEqual(['A', 'B', 'C'])

    const scheduledActivities = result.activities
    expect(scheduledActivities).toHaveLength(3)

    const a = scheduledActivities.find((a) => a.id === 'A')!
    expect(a.startDate).toBe('2026-07-01')
    expect(a.finishDate).toBe('2026-07-11')
    expect(a.earlyStart).toBe('2026-07-01')
    expect(a.earlyFinish).toBe('2026-07-11')
    expect(a.lateStart).toBe('2026-07-01')
    expect(a.lateFinish).toBe('2026-07-11')
    expect(a.totalFloat).toBe(0)
    expect(a.isCritical).toBe(true)

    const b = scheduledActivities.find((a) => a.id === 'B')!
    expect(b.startDate).toBe('2026-07-11')
    expect(b.finishDate).toBe('2026-07-16')
    expect(b.totalFloat).toBe(0)
    expect(b.isCritical).toBe(true)

    const c = scheduledActivities.find((a) => a.id === 'C')!
    expect(c.startDate).toBe('2026-07-16')
    expect(c.finishDate).toBe('2026-07-19')
    expect(c.totalFloat).toBe(0)
    expect(c.isCritical).toBe(true)

    expect(result.floatInfo.get('A')?.totalFloat).toBe(0)
    expect(result.floatInfo.get('B')?.totalFloat).toBe(0)
    expect(result.floatInfo.get('C')?.totalFloat).toBe(0)
  })

  it('handles branch with float correctly', () => {
    // A(10) → C(5), B(3) → C(5)
    // B has float because it finishes earlier than A
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 3),
      makeActivity('C', 5),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C'),
      makeDep('d2', 'B', 'C'),
    ]
    const projectStart = '2026-07-01'

    const result = schedule(activities, deps, projectStart)

    expect(result.projectFinish).toBe('2026-07-16')
    expect(result.criticalPath).toEqual(['A', 'C'])

    const b = result.activities.find((a) => a.id === 'B')!
    expect(b.totalFloat).toBeGreaterThan(0)
    expect(b.isCritical).toBe(false)
  })

  it('does not mutate input activities', () => {
    const activities: Activity[] = [
      makeActivity('A', 5),
    ]
    const deps: Dependency[] = []

    const originalStartDate = activities[0].startDate
    schedule(activities, deps, '2026-07-01')

    // Original should be unchanged
    expect(activities[0].startDate).toBe(originalStartDate)
    expect(activities[0].earlyStart).toBe(null)
  })

  it('uses today as default projectStart', () => {
    const activities: Activity[] = [
      makeActivity('A', 5),
    ]
    const deps: Dependency[] = []

    const result = schedule(activities, deps)

    // Should have valid dates (defaults to today)
    expect(result.activities[0].startDate).toBeTruthy()
    expect(result.activities[0].finishDate).toBeTruthy()
    expect(result.projectFinish).toBeTruthy()
  })

  it('handles empty activities gracefully', () => {
    const result = schedule([], [], '2026-07-01')

    expect(result.activities).toEqual([])
    expect(result.criticalPath).toEqual([])
    expect(result.floatInfo.size).toBe(0)
    expect(result.projectFinish).toBe('2026-07-01')
  })
})
