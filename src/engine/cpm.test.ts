import { describe, it, expect } from 'vitest'
import { forwardPass } from './cpm'
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

describe('forwardPass', () => {
  const projectStart = '2026-07-01'

  it('single activity with project start', () => {
    const activities: Activity[] = [makeActivity('A', 10)]
    const deps: Dependency[] = []
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A')).toEqual({
      earlyStart: '2026-07-01',
      earlyFinish: '2026-07-11',
    })
  })

  it('FS: successor starts after predecessor finishes', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FS')]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A')).toEqual({
      earlyStart: '2026-07-01',
      earlyFinish: '2026-07-11',
    })
    expect(result.get('B')).toEqual({
      earlyStart: '2026-07-11',
      earlyFinish: '2026-07-16',
    })
  })

  it('FS with lag: B starts after A finish + lag days', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FS', 3)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A').earlyStart).toBe('2026-07-01')
    expect(result.get('A').earlyFinish).toBe('2026-07-11')
    expect(result.get('B').earlyStart).toBe('2026-07-14')
    expect(result.get('B').earlyFinish).toBe('2026-07-19')
  })

  it('SS: successor starts when predecessor starts', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SS')]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A').earlyStart).toBe('2026-07-01')
    expect(result.get('B').earlyStart).toBe('2026-07-01')
    expect(result.get('B').earlyFinish).toBe('2026-07-06')
  })

  it('SS with lag: B starts after A start + lag', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SS', 4)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('B').earlyStart).toBe('2026-07-05')
    expect(result.get('B').earlyFinish).toBe('2026-07-10')
  })

  it('FF: successor finishes when predecessor finishes', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FF')]
    const result = forwardPass(activities, deps, projectStart)

    // B finishes when A finishes (2026-07-11), so B starts at EF - duration = 2026-07-06
    expect(result.get('B').earlyFinish).toBe('2026-07-11')
    expect(result.get('B').earlyStart).toBe('2026-07-06')
  })

  it('FF with lag: B finishes after A finish + lag', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'FF', 3)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('B').earlyFinish).toBe('2026-07-14')
    expect(result.get('B').earlyStart).toBe('2026-07-09')
  })

  it('SF: successor finishes when predecessor starts', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SF')]
    const result = forwardPass(activities, deps, projectStart)

    // B finishes when A starts (2026-07-01), so B starts at EF - duration = 2026-06-26
    expect(result.get('B').earlyFinish).toBe('2026-07-01')
    expect(result.get('B').earlyStart).toBe('2026-06-26')
  })

  it('SF with lag: B finishes after A start + lag', () => {
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 5),
    ]
    const deps: Dependency[] = [makeDep('d1', 'A', 'B', 'SF', 2)]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('B').earlyFinish).toBe('2026-07-03')
    expect(result.get('B').earlyStart).toBe('2026-06-28')
  })

  it('takes max ES from multiple predecessors', () => {
    // A (10 days) → C, B (20 days) → C
    // C should start after both A and B finish (FS)
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 20),
      makeActivity('C', 5),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C', 'FS'),
      makeDep('d2', 'B', 'C', 'FS'),
    ]
    const result = forwardPass(activities, deps, projectStart)

    expect(result.get('A').earlyFinish).toBe('2026-07-11')
    expect(result.get('B').earlyFinish).toBe('2026-07-21')
    // C should start after B finishes (later)
    expect(result.get('C').earlyStart).toBe('2026-07-21')
    expect(result.get('C').earlyFinish).toBe('2026-07-26')
  })

  it('takes max ES from multiple predecessors with different relation types', () => {
    // A (10 days, FS) → C, B (20 days, SS + lag 5) → C
    const activities: Activity[] = [
      makeActivity('A', 10),
      makeActivity('B', 20),
      makeActivity('C', 5),
    ]
    const deps: Dependency[] = [
      makeDep('d1', 'A', 'C', 'FS'),
      makeDep('d2', 'B', 'C', 'SS', 5),
    ]
    const result = forwardPass(activities, deps, projectStart)

    // A FS: C.ES >= A.EF = 2026-07-11
    // B SS+5: C.ES >= B.ES + 5 = 2026-07-01 + 5 = 2026-07-06
    // Max = 2026-07-11
    expect(result.get('C').earlyStart).toBe('2026-07-11')
  })
})
